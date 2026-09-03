/*
  Simulacrum Interactive header morph system

  Refactor stage 1:
  The existing hamburger animation now runs through a reusable morph
  target registry/controller. Visual behavior and timing are intentionally
  unchanged. Future nav buttons/page frames can register additional
  targets instead of duplicating this animation code.
*/

document.addEventListener("DOMContentLoaded", () => {
  const setActivePageButtonState = (
    name = null,
    preserveName = null
  ) => {
    const applyState = (
      button,
      isActive
    ) => {
      if (!button) {
        return;
      }


      button.classList.toggle(
        "is-page-active",
        isActive
      );


      if (isActive) {
        button.setAttribute(
          "aria-current",
          "page"
        );
      }

      else {
        button.removeAttribute(
          "aria-current"
        );
      }
    };


    pageNames.forEach((pageName) => {
      const isActive =
        pageName === name ||
        pageName === preserveName;


      applyState(
        pageNavButtons.get(
          pageName
        ),
        isActive
      );


      applyState(
        mobilePageNavButtons.get(
          pageName
        ),
        isActive
      );
    });
  };


  const releasePageButtonState = (
    name
  ) => {
    if (!name) {
      return;
    }


    const buttons = [
      pageNavButtons.get(
        name
      ),

      mobilePageNavButtons.get(
        name
      )
    ].filter(Boolean);


    buttons.forEach((button) => {
      button.classList.add(
        "is-page-releasing"
      );

      button.classList.remove(
        "is-page-active"
      );

      button.removeAttribute(
        "aria-current"
      );
    });


    /*
      Read the CSS variable from the document root so this cleanup stays in
      sync with whatever release duration is tuned in styles.css.
    */
    const rootStyles =
      getComputedStyle(
        document.documentElement
      );


    const releaseDuration =
      parseCssTime(
        rootStyles.getPropertyValue(
          "--active-page-release-duration"
        ),
        280
      );


    setTimeout(
      () => {
        buttons.forEach((button) => {
          button.classList.remove(
            "is-page-releasing"
          );
        });
      },
      Math.max(
        0,
        releaseDuration
      ) + 40
    );
  };


  const menuToggle =
    document.querySelector(".menu-toggle");

  const mobileMenu =
    document.querySelector("#mobile-menu") ||
    document.querySelector(".mobile-menu");

  const siteHeader =
    document.querySelector(".site-header");

  const headerContent =
    document.querySelector(".header-content");


  const pageNames = [
    "about",
    "brobots",
    "etherian",
    "halodoom",
    "contact"
  ];


  const pageNavButtons =
    new Map();


  const mobilePageNavButtons =
    new Map();


  const pageFrames =
    new Map();


  pageNames.forEach((name) => {
    const button =
      document.querySelector(
        `.main-nav .nav-button[href="#${name}"]`
      );


    const mobileButton =
      document.querySelector(
        `.mobile-menu-link[href="#${name}"]`
      );


    const frame =
      document.querySelector(
        `#${name}-page-frame`
      );


    if (button) {
      pageNavButtons.set(
        name,
        button
      );
    }


    if (mobileButton) {
      mobilePageNavButtons.set(
        name,
        mobileButton
      );
    }


    if (frame) {
      pageFrames.set(
        name,
        frame
      );
    }
  });


  if (
    !menuToggle ||
    !mobileMenu ||
    !siteHeader ||
    !headerContent
  ) {
    console.warn(
      "Mobile menu: required elements are missing."
    );

    return;
  }


  /* =======================================================
     Create the temporary morph surface
     ======================================================= */

  /*
    The fresh baseline HTML does not need to be edited.

    JavaScript creates one temporary viewport-sized SVG whose only job
    is to draw the transformation between the hamburger and the menu.
  */

  const svgNamespace =
    "http://www.w3.org/2000/svg";


  const menuMorph =
    document.createElementNS(
      svgNamespace,
      "svg"
    );


  const menuMorphPath =
    document.createElementNS(
      svgNamespace,
      "path"
    );


  /*
    Independent temporary path for the INCOMING page during a
    page-to-page overlap.

    The outgoing quick-return keeps ownership of menuMorphPath.
    The incoming page uses this second path, so the two animations can
    coexist without cancelling or corrupting each other's geometry.
  */
  const incomingPageMorphPath =
    document.createElementNS(
      svgNamespace,
      "path"
    );


  menuMorph.setAttribute(
    "aria-hidden",
    "true"
  );


  menuMorph.setAttribute(
    "preserveAspectRatio",
    "none"
  );


  Object.assign(
    menuMorph.style,
    {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      overflow: "visible",
      pointerEvents: "none",
      visibility: "hidden",
      opacity: "0",
      zIndex: "1001"
    }
  );


  Object.assign(
    menuMorphPath.style,
    {
      vectorEffect: "non-scaling-stroke",
      strokeLinejoin: "miter"
    }
  );


  Object.assign(
    incomingPageMorphPath.style,
    {
      vectorEffect: "non-scaling-stroke",
      strokeLinejoin: "miter",
      visibility: "hidden",
      opacity: "1"
    }
  );


  menuMorph.appendChild(
    menuMorphPath
  );


  menuMorph.appendChild(
    incomingPageMorphPath
  );


  /*
    Keep the temporary morph SVG at document level.

    Below 485px .site-header is uniformly transformed. A fixed SVG
    inside that transformed ancestor would inherit the scale and would
    effectively scale viewport-coordinate geometry twice.
  */
  document.body.appendChild(
    menuMorph
  );


  /* =======================================================
     State
     ======================================================= */

  let menuIsOpen = false;
  let isAnimating = false;

  let animationFrame = null;
  let resizeFrame = null;
  let iconTimer = null;

  /*
    Keep the morph's real current position so an in-progress animation
    can reverse cleanly instead of being cancelled/reset.
  */
  let currentMorphProgress = 0;
  let animationTargetOpen = false;

  /*
    Every new direction gets a new run id. Any delayed callback from an
    older run becomes harmless instead of changing state later.
  */
  let animationRunId = 0;

  let handoffTimer = null;

  /*
    Allows the real menu to begin fading in during the last part of the
    morph instead of waiting for the temporary shape to finish first.
  */
  let menuRevealStarted = false;
  let fakeMenuFadeStarted = false;

  let menuInteractive = false;
  let menuInteractionTimer = null;


  /*
    Non-mobile page-frame state.

    Only one page owns the shared temporary SVG morph surface at a time.
    When the user selects a different page, the current frame reverses
    into its source button first, then the newly requested page opens.
  */
  let activePageName = null;

  /*
    The most recently selected page button.

    This is intentionally separate from activePageName:
      selectedPageName = user intent, changes immediately on click
      activePageName   = currently committed/animating real page

    Keeping these separate prevents rapid clicks during the desktop
    secondary-panel animation from leaving button/popout state stale.
  */
  let selectedPageName = null;

  let pageFrameIsAnimating = false;
  let pageFrameTargetOpen = false;
  let pageFrameProgress = 0;

  /*
    If another page is clicked while one is open/opening, it is queued
    here and opened as soon as the current frame finishes reversing.
  */
  let queuedPageName = null;

  let incomingPageAnimationFrame = null;
  let incomingOverlapStarted = false;
  let incomingOverlapPageName = null;


  /* =======================================================
     Reusable morph target system
     ======================================================= */

  /*
    The hamburger dropdown is now treated as the FIRST target of a
    reusable morph system rather than as a one-off animation.

    Future targets can register:
      - which button/element is the source
      - which real element is the destination
      - how the final destination rectangle is measured
      - later: a different final polygon/shape builder

    For this refactor the existing hamburger behavior is intentionally
    unchanged.
  */

  const morphTargets =
    new Map();


  const morphEngine = {
    activeTargetName:
      null,

    register(
      name,
      descriptor
    ) {
      morphTargets.set(
        name,
        descriptor
      );
    },

    getTarget(
      name
    ) {
      return (
        morphTargets.get(name) ||
        null
      );
    },

    setActive(
      name
    ) {
      this.activeTargetName =
        name;
    },

    clearActive() {
      this.activeTargetName =
        null;
    },

    getGeometry(
      name
    ) {
      const target =
        this.getTarget(name);


      if (!target) {
        return null;
      }


      this.setActive(name);


      return getMorphGeometry(
        target
      );
    }
  };


  /* =======================================================
     Utilities
     ======================================================= */

  const clamp = (
    value,
    min,
    max
  ) => {
    return Math.min(
      max,
      Math.max(min, value)
    );
  };


  const lerp = (
    start,
    end,
    amount
  ) => {
    return (
      start +
      ((end - start) * amount)
    );
  };


  const easeOutCubic = (t) => {
    return (
      1 -
      Math.pow(1 - t, 3)
    );
  };


  const easeInOutCubic = (t) => {
    if (t < 0.5) {
      return (
        4 * t * t * t
      );
    }


    return (
      1 -
      Math.pow(
        -2 * t + 2,
        3
      ) / 2
    );
  };


  const linear = (t) => t;


  const easeInCubic = (t) => {
    return t * t * t;
  };


  const easingFromName = (name) => {
    const value =
      String(name)
        .trim()
        .toLowerCase();


    switch (value) {
      case "linear":
        return linear;

      case "ease-in":
      case "ease-in-cubic":
        return easeInCubic;

      case "ease-in-out":
      case "ease-in-out-cubic":
        return easeInOutCubic;

      case "ease-out":
      case "ease-out-cubic":
      default:
        return easeOutCubic;
    }
  };


  const parseCssTime = (
    value,
    fallback
  ) => {
    const trimmed =
      String(value).trim();


    if (trimmed.endsWith("ms")) {
      const parsed =
        parseFloat(trimmed);


      return Number.isFinite(parsed)
        ? parsed
        : fallback;
    }


    if (trimmed.endsWith("s")) {
      const parsed =
        parseFloat(trimmed);


      return Number.isFinite(parsed)
        ? parsed * 1000
        : fallback;
    }


    const parsed =
      parseFloat(trimmed);


    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  };


  /* =======================================================
     Colour helpers
     ======================================================= */

  const parseColor = (value) => {
    const match =
      String(value)
        .trim()
        .match(
          /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/
        );


    if (!match) {
      return {
        r: 255,
        g: 114,
        b: 2,
        a: 0.25
      };
    }


    return {
      r: parseFloat(match[1]),
      g: parseFloat(match[2]),
      b: parseFloat(match[3]),

      a:
        match[4] !== undefined
          ? parseFloat(match[4])
          : 1
    };
  };

  const parseRgbTriplet = (
    value,
    fallback = {
      r: 255,
      g: 114,
      b: 2
    }
  ) => {
    const numbers =
      String(value)
        .match(
          /[0-9.]+/g
        );


    if (
      !numbers ||
      numbers.length < 3
    ) {
      return {
        ...fallback
      };
    }


    return {
      r:
        parseFloat(
          numbers[0]
        ),

      g:
        parseFloat(
          numbers[1]
        ),

      b:
        parseFloat(
          numbers[2]
        )
    };
  };


  const rgbaFromRgb = (
    rgb,
    alpha
  ) => {
    return (
      `rgba(` +
      `${rgb.r}, ` +
      `${rgb.g}, ` +
      `${rgb.b}, ` +
      `${alpha}` +
      `)`
    );
  };


  const lightenRgb = (
    rgb,
    amount
  ) => {
    const mix =
      clamp(
        amount,
        0,
        1
      );


    return {
      r:
        Math.round(
          lerp(
            rgb.r,
            255,
            mix
          )
        ),

      g:
        Math.round(
          lerp(
            rgb.g,
            255,
            mix
          )
        ),

      b:
        Math.round(
          lerp(
            rgb.b,
            255,
            mix
          )
        )
    };
  };


  const getFrameAccentRgb = (
    frame
  ) => {
    if (!frame) {
      return {
        r: 255,
        g: 114,
        b: 2
      };
    }


    return parseRgbTriplet(
      getComputedStyle(
        frame
      ).getPropertyValue(
        "--page-accent-rgb"
      )
    );
  };


  const mixColor = (
    from,
    to,
    amount
  ) => {
    return {
      r:
        lerp(
          from.r,
          to.r,
          amount
        ),

      g:
        lerp(
          from.g,
          to.g,
          amount
        ),

      b:
        lerp(
          from.b,
          to.b,
          amount
        ),

      a:
        lerp(
          from.a,
          to.a,
          amount
        )
    };
  };


  const colorToCss = (color) => {
    return (
      `rgba(` +
      `${color.r}, ` +
      `${color.g}, ` +
      `${color.b}, ` +
      `${color.a}` +
      `)`
    );
  };


  /* =======================================================
     Settings
     ======================================================= */

  const getSettings = () => {
    const styles =
      getComputedStyle(siteHeader);


    let angleDegrees =
      Math.abs(
        parseFloat(
          styles.getPropertyValue(
            "--button-shear-angle"
          )
        )
      );


    if (!Number.isFinite(angleDegrees)) {
      angleDegrees = 40;
    }


    angleDegrees =
      clamp(
        angleDegrees,
        5,
        80
      );


    const angleRadians =
      angleDegrees * Math.PI / 180;


    const readNumber = (
      name,
      fallback
    ) => {
      const parsed =
        parseFloat(
          styles.getPropertyValue(name)
        );


      return Number.isFinite(parsed)
        ? parsed
        : fallback;
    };


    const readPercent = (
      name,
      fallback
    ) => {
      const raw =
        styles
          .getPropertyValue(name)
          .trim();


      if (!raw) {
        return fallback;
      }


      const parsed =
        parseFloat(raw);


      if (!Number.isFinite(parsed)) {
        return fallback;
      }


      return raw.endsWith("%")
        ? parsed / 100
        : parsed;
    };


    const readText = (
      name,
      fallback
    ) => {
      const value =
        styles
          .getPropertyValue(name)
          .trim();


      return value || fallback;
    };


    return {
      slope:
        Math.tan(angleRadians),

      /*
        Total open/close time.
      */
      openDuration:
        parseCssTime(
          styles.getPropertyValue(
            "--menu-morph-duration"
          ),
          1050
        ),

      closeDuration:
        parseCssTime(
          styles.getPropertyValue(
            "--menu-morph-close-duration"
          ),
          895
        ),

      /*
        How far the neck extends, in button-height multiples.
      */
      extensionMultiplier:
        readNumber(
          "--menu-morph-extension-multiplier",
          1.5
        ),

      /*
        Timeline positions.

        Separate START and END values mean you can create a deliberate
        pause simply by leaving a gap between them.

        Example:
          neck ends at 13%
          parallelogram starts at 16%
        = 3% hold after the neck finishes.
      */
      neckEnd:
        clamp(
          readPercent(
            "--menu-morph-neck-end",
            0.13
          ),
          0,
          1
        ),

      parallelogramStart:
        clamp(
          readPercent(
            "--menu-morph-parallelogram-start",
            0.13
          ),
          0,
          1
        ),

      parallelogramEnd:
        clamp(
          readPercent(
            "--menu-morph-parallelogram-end",
            0.27
          ),
          0,
          1
        ),

      reshapeStart:
        clamp(
          readPercent(
            "--menu-morph-reshape-start",
            0.27
          ),
          0,
          1
        ),

      /*
        Per-stage easing.
        Supported:
          linear
          ease-in
          ease-out
          ease-in-out
      */
      neckEase:
        readText(
          "--menu-morph-neck-ease",
          "ease-out"
        ),

      parallelogramEase:
        readText(
          "--menu-morph-parallelogram-ease",
          "ease-in-out"
        ),

      reshapeEase:
        readText(
          "--menu-morph-reshape-ease",
          "ease-out"
        ),

      /*
        Real-menu crossfade controls.
      */
      realMenuRevealAt:
        clamp(
          readPercent(
            "--menu-morph-real-menu-reveal-at",
            0.80
          ),
          0,
          1
        ),

      realMenuFadeDuration:
        parseCssTime(
          styles.getPropertyValue(
            "--menu-morph-real-menu-fade-duration"
          ),
          150
        ),

      fakeMenuFadeStart:
        clamp(
          readPercent(
            "--menu-morph-fake-menu-fade-start",
            0.90
          ),
          0,
          1
        ),

      fakeMenuFadeDuration:
        parseCssTime(
          styles.getPropertyValue(
            "--menu-morph-fake-menu-fade-duration"
          ),
          80
        ),

      /*
        Detached launch-parallelogram sizing.
      */
      parallelogramWidthRatio:
        readNumber(
          "--menu-morph-parallelogram-width-ratio",
          0.70
        ),

      parallelogramDepthRatio:
        readNumber(
          "--menu-morph-parallelogram-depth-ratio",
          0.50
        ),

      viewportSafeInset:
        readNumber(
          "--menu-morph-viewport-safe-inset",
          12
        ),

      /*
        Hamburger -> X timing.
      */
      iconSwitchAt:
        clamp(
          readPercent(
            "--menu-morph-icon-switch-at",
            0.23
          ),
          0,
          1
        ),

      /*
        Close/reverse icon timing, measured from the moment the close
        direction begins.

        If this variable is not present in CSS, it falls back to the
        same value as --menu-morph-icon-switch-at.

        0% = X starts becoming hamburger immediately on click.
      */
      closeIconSwitchAt:
        clamp(
          readPercent(
            "--menu-morph-close-icon-switch-at",
            readPercent(
              "--menu-morph-icon-switch-at",
              0.23
            )
          ),
          0,
          1
        ),

      startFill:
        parseColor(
          styles.getPropertyValue(
            "--button-hover-color"
          )
        ),

      endFill:
        parseColor(
          styles.getPropertyValue(
            "--mobile-menu-shell-color"
          )
        ),

      startStroke:
        parseColor(
          styles.getPropertyValue(
            "--button-hover-border-color"
          )
        ),

      endStroke:
        parseColor(
          styles.getPropertyValue(
            "--mobile-menu-shell-border-color"
          )
        ),

      strokeWidth:
        parseFloat(
          styles.getPropertyValue(
            "--button-border-width"
          )
        ) || 2
    };
  };


  /*
    Page targets use the same geometry engine, but read a separate CSS
    settings family so their timing can be tuned independently.
  */
  const getPageSettings = (
    baseSettings
  ) => {
    const styles =
      getComputedStyle(
        siteHeader
      );


    const readNumber = (
      name,
      fallback
    ) => {
      const parsed =
        parseFloat(
          styles.getPropertyValue(name)
        );


      return Number.isFinite(parsed)
        ? parsed
        : fallback;
    };


    const readPercent = (
      name,
      fallback
    ) => {
      const raw =
        styles
          .getPropertyValue(name)
          .trim();


      if (!raw) {
        return fallback;
      }


      const parsed =
        parseFloat(raw);


      if (!Number.isFinite(parsed)) {
        return fallback;
      }


      return raw.endsWith("%")
        ? parsed / 100
        : parsed;
    };


    const readText = (
      name,
      fallback
    ) => {
      const value =
        styles
          .getPropertyValue(name)
          .trim();


      return value || fallback;
    };


    return {
      ...baseSettings,

      openDuration:
        parseCssTime(
          styles.getPropertyValue(
            "--page-morph-duration"
          ),
          baseSettings.openDuration
        ),

      closeDuration:
        parseCssTime(
          styles.getPropertyValue(
            "--page-morph-close-duration"
          ),
          baseSettings.closeDuration
        ),

      extensionMultiplier:
        readNumber(
          "--page-morph-extension-multiplier",
          baseSettings.extensionMultiplier
        ),

      neckEnd:
        clamp(
          readPercent(
            "--page-morph-neck-end",
            baseSettings.neckEnd
          ),
          0,
          1
        ),

      parallelogramStart:
        clamp(
          readPercent(
            "--page-morph-parallelogram-start",
            baseSettings.parallelogramStart
          ),
          0,
          1
        ),

      parallelogramEnd:
        clamp(
          readPercent(
            "--page-morph-parallelogram-end",
            baseSettings.parallelogramEnd
          ),
          0,
          1
        ),

      reshapeStart:
        clamp(
          readPercent(
            "--page-morph-reshape-start",
            baseSettings.reshapeStart
          ),
          0,
          1
        ),

      neckEase:
        readText(
          "--page-morph-neck-ease",
          baseSettings.neckEase
        ),

      parallelogramEase:
        readText(
          "--page-morph-parallelogram-ease",
          baseSettings.parallelogramEase
        ),

      reshapeEase:
        readText(
          "--page-morph-reshape-ease",
          baseSettings.reshapeEase
        ),

      realMenuRevealAt:
        clamp(
          readPercent(
            "--page-morph-real-frame-reveal-at",
            baseSettings.realMenuRevealAt
          ),
          0,
          1
        ),

      fakeMenuFadeStart:
        clamp(
          readPercent(
            "--page-morph-fake-frame-fade-start",
            baseSettings.fakeMenuFadeStart
          ),
          0,
          1
        ),

      realMenuFadeDuration:
        parseCssTime(
          styles.getPropertyValue(
            "--page-morph-real-frame-fade-duration"
          ),
          baseSettings.realMenuFadeDuration
        ),

      fakeMenuFadeDuration:
        parseCssTime(
          styles.getPropertyValue(
            "--page-morph-fake-frame-fade-duration"
          ),
          baseSettings.fakeMenuFadeDuration
        ),

      parallelogramWidthRatio:
        readNumber(
          "--page-morph-parallelogram-width-ratio",
          0.32
        ),

      parallelogramDepthRatio:
        readNumber(
          "--page-morph-parallelogram-depth-ratio",
          0.22
        ),

      viewportSafeInset:
        readNumber(
          "--page-morph-viewport-safe-inset",
          12
        )
    };
  };


  /* =======================================================
     Existing menu SVG geometry
     ======================================================= */

  /*
    This is the same job your pre-animation JavaScript was already doing:
    keep the menu shell and its link plates tied to the master shear
    angle without squashing their corners as the menu height changes.
  */

  const updateMenuShearGeometry = () => {
    const settings =
      getSettings();

    const slope =
      settings.slope;


    const shellSvg =
      mobileMenu.querySelector(
        ".mobile-menu-shell"
      );

    const outerPath =
      mobileMenu.querySelector(
        ".mobile-menu-shell-path--outer"
      );

    const innerPath =
      mobileMenu.querySelector(
        ".mobile-menu-shell-path--inner"
      );


    if (
      shellSvg &&
      outerPath &&
      innerPath
    ) {
      const rect =
        shellSvg.getBoundingClientRect();

      const width =
        rect.width;

      const height =
        rect.height;


      if (
        width > 0 &&
        height > 0
      ) {
        shellSvg.setAttribute(
          "viewBox",
          `0 0 ${width} ${height}`
        );


        const outerInset = 1;

        const topCornerHeight =
          Math.min(
            28,
            height * 0.22
          );

        const bottomCornerHeight =
          Math.min(
            30,
            height * 0.22
          );

        const topCornerWidth =
          topCornerHeight *
          slope;

        const bottomCornerWidth =
          bottomCornerHeight *
          slope;


        outerPath.setAttribute(
          "d",
          `
            M ${outerInset + topCornerWidth} ${outerInset}
            H ${width - outerInset}

            V ${height - outerInset - bottomCornerHeight}

            L ${width - outerInset - bottomCornerWidth} ${height - outerInset}

            H ${outerInset}

            V ${outerInset + topCornerHeight}

            Z
          `
        );


        const innerInset = 11;

        const innerTopCornerHeight =
          Math.min(
            24,
            height * 0.18
          );

        const innerBottomCornerHeight =
          Math.min(
            26,
            height * 0.18
          );

        const innerTopCornerWidth =
          innerTopCornerHeight *
          slope;

        const innerBottomCornerWidth =
          innerBottomCornerHeight *
          slope;


        innerPath.setAttribute(
          "d",
          `
            M ${innerInset + innerTopCornerWidth} ${innerInset}
            H ${width - innerInset}

            V ${height - innerInset - innerBottomCornerHeight}

            L ${width - innerInset - innerBottomCornerWidth} ${height - innerInset}

            H ${innerInset}

            V ${innerInset + innerTopCornerHeight}

            Z
          `
        );


        const cornerAccent =
          mobileMenu.querySelector(
            ".mobile-menu-shell-accent--corner"
          );


        if (cornerAccent) {
          cornerAccent.setAttribute(
            "d",
            `
              M ${width - innerInset - innerBottomCornerWidth} ${height - innerInset}
              L ${width - innerInset} ${height - innerInset - innerBottomCornerHeight}
            `
          );
        }


        const topAccent =
          mobileMenu.querySelector(
            ".mobile-menu-shell-accent--top"
          );


        if (topAccent) {
          const accentStart =
            innerInset +
            innerTopCornerWidth +
            6;


          const accentEnd =
            Math.min(
              accentStart + 97,
              width -
              innerInset -
              20
            );


          topAccent.setAttribute(
            "d",
            `
              M ${accentStart} ${innerInset}
              H ${accentEnd}
            `
          );
        }


        const bottomAccent =
          mobileMenu.querySelector(
            ".mobile-menu-shell-accent--bottom"
          );


        if (bottomAccent) {
          const accentEnd =
            Math.min(
              122,
              width * 0.4
            );


          bottomAccent.setAttribute(
            "d",
            `
              M ${innerInset} ${height - innerInset}
              H ${accentEnd}
            `
          );
        }
      }
    }


    const linkShells =
      mobileMenu.querySelectorAll(
        ".mobile-menu-link-shell"
      );


    linkShells.forEach((svg) => {
      const path =
        svg.querySelector(
          ".mobile-menu-link-shell-path"
        );


      if (!path) {
        return;
      }


      const rect =
        svg.getBoundingClientRect();

      const width =
        rect.width;

      const height =
        rect.height;


      if (
        width <= 0 ||
        height <= 0
      ) {
        return;
      }


      svg.setAttribute(
        "viewBox",
        `0 0 ${width} ${height}`
      );


      const inset = 1;

      const topCornerHeight =
        Math.min(
          10,
          height * 0.3
        );

      const bottomCornerHeight =
        Math.min(
          14,
          height * 0.35
        );

      const topCornerWidth =
        topCornerHeight *
        slope;

      const bottomCornerWidth =
        bottomCornerHeight *
        slope;


      path.setAttribute(
        "d",
        `
          M ${inset + topCornerWidth} ${inset}
          H ${width - inset}

          V ${height - inset - bottomCornerHeight}

          L ${width - inset - bottomCornerWidth} ${height - inset}

          H ${inset}

          V ${inset + topCornerHeight}

          Z
        `
      );
    });
  };


  /* =======================================================
     Exact hamburger lower edge
     ======================================================= */

  const getSourceBottomEdge = (
    sourceElement,
    buttonRect,
    slope
  ) => {
    const pseudoStyles =
      getComputedStyle(
        sourceElement,
        "::before"
      );


    let inset =
      parseFloat(
        pseudoStyles.left
      );


    if (!Number.isFinite(inset)) {
      inset =
        buttonRect.height *
        0.73 /
        2;
    }


    const skewShift =
      buttonRect.height *
      slope /
      2;


    return {
      left:
        buttonRect.left +
        inset -
        skewShift,

      right:
        buttonRect.right -
        inset -
        skewShift,

      y:
        buttonRect.bottom
    };
  };


  /* =======================================================
     Fresh animation geometry
     ======================================================= */

  /*
    Get the REAL final/open menu rectangle.

    getBoundingClientRect() on .mobile-menu while it is closed includes
    the closed-state transform:

      translateY(-10px) scaleY(0.92)

    That was the alignment bug: the fake menu was targeting the
    transformed CLOSED rectangle, then the real menu opened at
    translateY(0) scaleY(1), making it appear lower/taller.

    offsetLeft / offsetTop / offsetWidth / offsetHeight describe the
    element's actual layout box before that transform, which is exactly
    where the final .is-open menu lives.
  */
  const getFinalElementRect = (element) => {
    const offsetParent =
      element.offsetParent;


    if (!offsetParent) {
      return element.getBoundingClientRect();
    }


    /*
      offset* values are pre-transform layout coordinates.
      getBoundingClientRect() is post-transform screen coordinates.

      Below 485px the complete header is uniformly scaled, so convert
      the target's layout offsets and size by the offset parent's rendered
      scale before using them as viewport SVG coordinates.
    */
    const parentRect =
      offsetParent.getBoundingClientRect();


    const layoutWidth =
      offsetParent.offsetWidth;


    const layoutHeight =
      offsetParent.offsetHeight;


    const scaleX =
      layoutWidth > 0
        ? parentRect.width /
          layoutWidth
        : 1;


    const scaleY =
      layoutHeight > 0
        ? parentRect.height /
          layoutHeight
        : scaleX;


    const left =
      parentRect.left +
      element.offsetLeft *
      scaleX;


    const top =
      parentRect.top +
      element.offsetTop *
      scaleY;


    const width =
      element.offsetWidth *
      scaleX;


    const height =
      element.offsetHeight *
      scaleY;


    return {
      left,
      top,

      right:
        left + width,

      bottom:
        top + height,

      width,
      height
    };
  };


  const getMorphGeometry = (
    target
  ) => {
    const baseSettings =
      getSettings();


    let settings =
      target.settingsFamily ===
      "page"
        ? getPageSettings(
            baseSettings
          )
        : baseSettings;


    const sourceElement =
      typeof target.getSourceElement ===
      "function"
        ? target.getSourceElement()
        : target.sourceElement;


    const targetElement =
      typeof target.getTargetElement ===
      "function"
        ? target.getTargetElement()
        : target.targetElement;


    /*
      Page morphs inherit the accent of the button that launched them.
      This keeps the geometry engine generic while allowing About/Contact,
      Brobots, Etherian and Halodoom to each carry their own color.
    */
    if (
      target.settingsFamily ===
        "page" &&
      sourceElement
    ) {
      const sourceStyles =
        getComputedStyle(
          sourceElement
        );


      const sourceAccent =
        parseRgbTriplet(
          sourceStyles.getPropertyValue(
            "--nav-accent-rgb"
          )
        );


      settings = {
        ...settings,

        startFill: {
          ...sourceAccent,
          a: 0.25
        },

        startStroke: {
          ...sourceAccent,
          a: 0.48
        }
      };
    }


    if (
      !sourceElement ||
      !targetElement
    ) {
      return null;
    }


    const buttonRect =
      sourceElement.getBoundingClientRect();


    /*
      Target the destination's untransformed OPEN layout box, not its
      closed-state translated/scaled visual rectangle.
    */
    const menuRect =
      typeof target.getFinalRect ===
      "function"
        ? target.getFinalRect(
            targetElement
          )
        : getFinalElementRect(
            targetElement
          );


    if (
      buttonRect.width <= 0 ||
      buttonRect.height <= 0 ||
      menuRect.width <= 0 ||
      menuRect.height <= 0
    ) {
      return null;
    }


    const topEdge =
      getSourceBottomEdge(
        sourceElement,
        buttonRect,
        settings.slope
      );


    const fullStemDepth =
      buttonRect.height *
      settings.extensionMultiplier;


    const fullStemBottomY =
      topEdge.y +
      fullStemDepth;


    /*
      X position of either stem side at an arbitrary Y.

      This guarantees the stem sides are ALWAYS exactly the master
      shear angle.
    */
    const stemXAtY = (
      originalX,
      y
    ) => {
      return (
        originalX -
        (
          (y - topEdge.y) *
          settings.slope
        )
      );
    };


    const topCornerHeight =
      Math.min(
        28,
        menuRect.height * 0.22
      );


    const bottomCornerHeight =
      Math.min(
        30,
        menuRect.height * 0.22
      );


    return {
      target,
      sourceElement,
      targetElement,

      settings,
      buttonRect,
      menuRect,

      topEdge,
      fullStemDepth,
      fullStemBottomY,

      stemXAtY,

      topCornerHeight,
      bottomCornerHeight,

      topCornerWidth:
        topCornerHeight *
        settings.slope,

      bottomCornerWidth:
        bottomCornerHeight *
        settings.slope
    };
  };


  /* =======================================================
     Shape builders
     ======================================================= */

  /*
    Calculate the detached Stage-2 launch parallelogram.

    The launch shape is intentionally NOT the near-final target size.
    It is a smaller "seed" shape that remains centred on the end of the
    extrusion. Stage 3 handles the large spatial growth and travel.

    A viewport-safe clamp prevents this intermediate shape from poking
    outside the screen before it starts moving toward the final target.
  */
  const getLaunchParallelogram = (
    geometry
  ) => {
    const {
      settings,
      menuRect,
      topEdge,
      fullStemBottomY,
      stemXAtY
    } = geometry;


    const stemBottomLeft =
      stemXAtY(
        topEdge.left,
        fullStemBottomY
      );


    const stemBottomRight =
      stemXAtY(
        topEdge.right,
        fullStemBottomY
      );


    const stemEndCenterX =
      (
        stemBottomLeft +
        stemBottomRight
      ) / 2;


    const stemWidth =
      stemBottomRight -
      stemBottomLeft;


    const safeInset =
      Math.max(
        0,
        settings.viewportSafeInset
      );


    const safeRight =
      Math.max(
        safeInset,
        window.innerWidth -
        safeInset
      );


    const safeBottom =
      Math.max(
        fullStemBottomY + 1,
        window.innerHeight -
        safeInset
      );


    /*
      First clamp depth because the diagonal bottom edge shifts left as
      depth grows. Width safety is calculated after that shift is known.
    */
    const desiredDepth =
      Math.max(
        1,
        (
          menuRect.bottom -
          fullStemBottomY
        ) *
        settings.parallelogramDepthRatio
      );


    const maxDepthByViewport =
      Math.max(
        1,
        safeBottom -
        fullStemBottomY
      );


    const depth =
      Math.min(
        desiredDepth,
        maxDepthByViewport
      );


    const shearOffset =
      depth *
      settings.slope;


    const desiredWidth =
      Math.max(
        stemWidth,
        menuRect.width *
        settings.parallelogramWidthRatio
      );


    /*
      Rightmost point is the top-right corner.
      Leftmost point is the bottom-left corner because the parallelogram
      shears left as it extends downward.
    */
    const maxWidthFromRight =
      Math.max(
        stemWidth,
        2 *
        (
          safeRight -
          stemEndCenterX
        )
      );


    const maxWidthFromLeft =
      Math.max(
        stemWidth,
        2 *
        (
          stemEndCenterX -
          safeInset -
          shearOffset
        )
      );


    const width =
      Math.max(
        stemWidth,
        Math.min(
          desiredWidth,
          maxWidthFromRight,
          maxWidthFromLeft
        )
      );


    const topY =
      fullStemBottomY;


    const bottomY =
      topY +
      depth;


    const topLeft =
      stemEndCenterX -
      width / 2;


    const topRight =
      stemEndCenterX +
      width / 2;


    const bottomLeft =
      topLeft -
      shearOffset;


    const bottomRight =
      topRight -
      shearOffset;


    return {
      stemBottomLeft,
      stemBottomRight,
      stemEndCenterX,
      stemWidth,

      width,
      depth,

      topY,
      bottomY,

      topLeft,
      topRight,
      bottomLeft,
      bottomRight
    };
  };



  /*
    STAGE 1
    -------
    Only extend the button downward.

    Shape:
      horizontal top
      two master-shear sides
      horizontal bottom
  */

  const buildExtendPath = (
    geometry,
    progress
  ) => {
    const {
      topEdge,
      fullStemDepth,
      stemXAtY
    } = geometry;


    const bottomY =
      topEdge.y +
      (
        fullStemDepth *
        progress
      );


    const bottomLeft =
      stemXAtY(
        topEdge.left,
        bottomY
      );


    const bottomRight =
      stemXAtY(
        topEdge.right,
        bottomY
      );


    return `
      M ${topEdge.left} ${topEdge.y}
      H ${topEdge.right}

      L ${bottomRight} ${bottomY}

      H ${bottomLeft}

      Z
    `;
  };


  /*
    STAGE 2
    -------
    The stem has reached maximum extension.

    NOW TWO THINGS HAPPEN TOGETHER:

      1. the parallelogram begins growing from the centre of the END
         of the extrusion
      2. the connection back to the button immediately starts retracting

    By the end of Stage 2, the forming menu is visually detached from
    the button before Stage 3 begins moving/scaling it into final shape.
  */

  const buildUnfoldPath = (
    geometry,
    progress
  ) => {
    const {
      settings,
      menuRect,
      topEdge,
      fullStemBottomY,
      stemXAtY
    } = geometry;


    const launch =
      getLaunchParallelogram(
        geometry
      );


    const {
      stemBottomLeft,
      stemBottomRight,
      stemWidth,

      width:
        targetWidth,

      depth:
        targetDepth,

      topY:
        bodyTopY
    } = launch;


    const bodyWidth =
      lerp(
        stemWidth,
        targetWidth,
        progress
      );


    const bodyDepth =
      targetDepth *
      progress;


    const bodyBottomY =
      bodyTopY +
      bodyDepth;


    const bodyTopLeft =
      launch.stemEndCenterX -
      bodyWidth / 2;


    const bodyTopRight =
      launch.stemEndCenterX +
      bodyWidth / 2;


    const shearOffset =
      bodyDepth *
      settings.slope;


    const bodyBottomLeft =
      bodyTopLeft -
      shearOffset;


    const bodyBottomRight =
      bodyTopRight -
      shearOffset;


    /*
      Retract the upper connection immediately.

      At progress 0:
        attachmentTopY = button bottom
        => full stem is visible.

      At progress 1:
        attachmentTopY = fullStemBottomY
        => attachment has zero height and the parallelogram is detached.
    */
    const retractProgress =
      easeInOutCubic(progress);


    const attachmentTopY =
      lerp(
        topEdge.y,
        fullStemBottomY,
        retractProgress
      );


    const attachmentTopLeft =
      stemXAtY(
        topEdge.left,
        attachmentTopY
      );


    const attachmentTopRight =
      stemXAtY(
        topEdge.right,
        attachmentTopY
      );


    if (progress >= 0.9999) {
      /*
        Fully detached: return only the parallelogram.
      */
      return `
        M ${bodyTopLeft} ${bodyTopY}
        H ${bodyTopRight}

        L ${bodyBottomRight} ${bodyBottomY}

        H ${bodyBottomLeft}

        Z
      `;
    }


    return `
      M ${attachmentTopLeft} ${attachmentTopY}
      H ${attachmentTopRight}

      L ${stemBottomRight} ${fullStemBottomY}

      H ${bodyTopRight}

      L ${bodyBottomRight} ${bodyBottomY}

      H ${bodyBottomLeft}

      L ${bodyTopLeft} ${bodyTopY}

      H ${stemBottomLeft}

      Z
    `;
  };


  /*
    STAGE 3
    -------
    This is now a TRUE continuous parallelogram -> final-menu morph.

    There is no square intermediate and no topology swap.

    The trick is to represent the four-corner parallelogram using the
    SAME SIX vertices as the final menu:

      parallelogram start:
        P0 = top-left
        P1 = top-right
        P2 = top-right   (duplicate)
        P3 = bottom-right
        P4 = bottom-left
        P5 = bottom-left (duplicate)

      final menu:
        P0 = end of top-left diagonal
        P1 = top-right
        P2 = bottom of right vertical
        P3 = end of bottom-right diagonal
        P4 = bottom-left
        P5 = top of left vertical

    Because:
      - P1 -> P2 begins at zero length and grows vertically
      - P4 -> P5 begins at zero length and grows vertically
      - P2 -> P3 is master-shear both at start and finish
      - P5 -> P0 is master-shear both at start and finish
      - the other edges are horizontal both at start and finish

    EVERY intermediate frame also contains only:
      horizontal
      vertical
      master-shear

    So the parallelogram genuinely and continuously becomes the final
    menu shape without ever becoming a square first.
  */

  const buildFormPath = (
    geometry,
    progress
  ) => {
    const {
      settings,
      menuRect,
      topEdge,
      fullStemBottomY,
      stemXAtY,

      topCornerHeight,
      bottomCornerHeight,
      topCornerWidth,
      bottomCornerWidth
    } = geometry;


    const launch =
      getLaunchParallelogram(
        geometry
      );


    const startTopY =
      launch.topY;


    const startBottomY =
      launch.bottomY;


    const startTopLeft =
      launch.topLeft;


    const startTopRight =
      launch.topRight;


    const startBottomLeft =
      launch.bottomLeft;


    const startBottomRight =
      launch.bottomRight;


    /*
      Six-point representation of the START parallelogram.
      Duplicate vertices create zero-length future vertical walls.
    */
    const startP0 = {
      x: startTopLeft,
      y: startTopY
    };

    const startP1 = {
      x: startTopRight,
      y: startTopY
    };

    const startP2 = {
      x: startTopRight,
      y: startTopY
    };

    const startP3 = {
      x: startBottomRight,
      y: startBottomY
    };

    const startP4 = {
      x: startBottomLeft,
      y: startBottomY
    };

    const startP5 = {
      x: startBottomLeft,
      y: startBottomY
    };


    /*
      Exact final menu six-point shell.
    */
    const finalP0 = {
      x:
        menuRect.left +
        topCornerWidth,

      y:
        menuRect.top
    };

    const finalP1 = {
      x:
        menuRect.right,

      y:
        menuRect.top
    };

    const finalP2 = {
      x:
        menuRect.right,

      y:
        menuRect.bottom -
        bottomCornerHeight
    };

    const finalP3 = {
      x:
        menuRect.right -
        bottomCornerWidth,

      y:
        menuRect.bottom
    };

    const finalP4 = {
      x:
        menuRect.left,

      y:
        menuRect.bottom
    };

    const finalP5 = {
      x:
        menuRect.left,

      y:
        menuRect.top +
        topCornerHeight
    };


    /*
      One continuous interpolation for the whole stage.
      No sub-stage, no sudden construction change.
    */
    const t =
      easeInOutCubic(progress);


    const mixPoint = (
      from,
      to
    ) => {
      return {
        x:
          lerp(
            from.x,
            to.x,
            t
          ),

        y:
          lerp(
            from.y,
            to.y,
            t
          )
      };
    };


    const p0 =
      mixPoint(
        startP0,
        finalP0
      );

    const p1 =
      mixPoint(
        startP1,
        finalP1
      );

    const p2 =
      mixPoint(
        startP2,
        finalP2
      );

    const p3 =
      mixPoint(
        startP3,
        finalP3
      );

    const p4 =
      mixPoint(
        startP4,
        finalP4
      );

    const p5 =
      mixPoint(
        startP5,
        finalP5
      );


    /*
      Stage 3 is now fully detached from the button.

      The parallelogram simply moves/scales/morphs into the final menu.
      No attachment geometry remains during this phase.
    */
    return `
      M ${p0.x} ${p0.y}
      H ${p1.x}

      L ${p2.x} ${p2.y}

      L ${p3.x} ${p3.y}

      H ${p4.x}

      L ${p5.x} ${p5.y}

      Z
    `;
  };


  /*
    STAGE 4
    -------
    The menu is now completely final and stops changing.

    Only the remaining short stem is absorbed downward.

    This avoids the old problem where the menu and connector seemed to
    be travelling at different rates.
  */

  const buildAbsorbPath = (
    geometry,
    progress
  ) => {
    const {
      menuRect,
      topEdge,
      stemXAtY,

      topCornerHeight,
      bottomCornerHeight,

      topCornerWidth,
      bottomCornerWidth
    } = geometry;


    if (progress >= 0.9999) {
      return `
        M ${menuRect.left + topCornerWidth} ${menuRect.top}
        H ${menuRect.right}

        V ${menuRect.bottom - bottomCornerHeight}

        L ${menuRect.right - bottomCornerWidth} ${menuRect.bottom}

        H ${menuRect.left}

        V ${menuRect.top + topCornerHeight}

        Z
      `;
    }


    /*
      Move the attachment's upper edge DOWN the same shear lines until
      it reaches the final menu top.

      Nothing else moves during this stage.
    */
    const attachmentTopY =
      lerp(
        topEdge.y,
        menuRect.top,
        progress
      );


    const attachmentTopLeft =
      stemXAtY(
        topEdge.left,
        attachmentTopY
      );


    const attachmentTopRight =
      stemXAtY(
        topEdge.right,
        attachmentTopY
      );


    const attachmentBottomLeft =
      stemXAtY(
        topEdge.left,
        menuRect.top
      );


    const attachmentBottomRight =
      stemXAtY(
        topEdge.right,
        menuRect.top
      );


    return `
      M ${attachmentTopLeft} ${attachmentTopY}
      H ${attachmentTopRight}

      L ${attachmentBottomRight} ${menuRect.top}

      H ${menuRect.right}

      V ${menuRect.bottom - bottomCornerHeight}

      L ${menuRect.right - bottomCornerWidth} ${menuRect.bottom}

      H ${menuRect.left}

      V ${menuRect.top + topCornerHeight}

      L ${menuRect.left + topCornerWidth} ${menuRect.top}

      H ${attachmentBottomLeft}

      Z
    `;
  };


  /*
    Target #1: existing hamburger dropdown.

    This descriptor is deliberately boring right now: it points the
    reusable engine at the same hamburger and menu elements we already
    use. That gives us a stable baseline before adding page-frame targets.
  */
  morphEngine.register(
    "mobile-menu",
    {
      getSourceElement: () =>
        menuToggle,

      getTargetElement: () =>
        mobileMenu,

      getFinalRect:
        getFinalElementRect,

      /*
        Future page-frame targets can provide a different shape builder.
        The current menu continues to use the existing six-point menu
        geometry, so there is no visual change in this refactor.
      */
      shapeType:
        "menu"
    }
  );


  /*
    Keep the REAL page-frame SVG in lockstep with the geometry used by
    the temporary morph's final frame.
  */
  const updatePrototypePageFrameGeometry = (
    frameElement
  ) => {
    if (!frameElement) {
      return;
    }


    const shell =
      frameElement.querySelector(
        ".prototype-page-frame-shell"
      );

    const ring =
      frameElement.querySelector(
        ".page-frame-ring"
      );

    const outerEdge =
      frameElement.querySelector(
        ".page-frame-edge--outer"
      );

    const chromeEdge =
      frameElement.querySelector(
        ".page-frame-edge--chrome"
      );

    const innerEdge =
      frameElement.querySelector(
        ".page-frame-edge--inner"
      );

    const orangeRail =
      frameElement.querySelector(
        ".page-frame-orange-rail"
      );

    const orangeHighlight =
      frameElement.querySelector(
        ".page-frame-orange-highlight"
      );

    const bottomNotch =
      frameElement.querySelector(
        ".page-frame-bottom-notch"
      );


    if (
      !shell ||
      !ring ||
      !outerEdge ||
      !chromeEdge ||
      !innerEdge ||
      !orangeRail ||
      !orangeHighlight ||
      !bottomNotch
    ) {
      return;
    }


    const rect =
      shell.getBoundingClientRect();


    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return;
    }


    const settings =
      getSettings();


    /*
      Explicitly paint the page accents from the page's master RGB variable.
      This avoids browser/SVG custom-property edge cases and guarantees the
      real frame matches the morph color.
    */
    const accentRgb =
      getFrameAccentRgb(
        frameElement
      );


    const accentStrong =
      rgbaFromRgb(
        accentRgb,
        0.92
      );


    const accentSoft =
      rgbaFromRgb(
        accentRgb,
        0.34
      );


    const accentHighlight =
      rgbaFromRgb(
        accentRgb,
        1
      );


    orangeRail.style.stroke =
      accentStrong;

    orangeRail.style.filter =
      `drop-shadow(0 0 2px ${accentSoft})`;


    orangeHighlight.style.stroke =
      accentHighlight;

    orangeHighlight.style.filter =
      `drop-shadow(0 0 3px ${accentSoft})`;


    bottomNotch.style.stroke =
      accentStrong;

    bottomNotch.style.filter =
      `drop-shadow(0 0 2px ${accentSoft})`;


    frameElement
      .querySelectorAll(
        ".page-frame-detail-dot, " +
        ".page-frame-bottom-dots circle"
      )
      .forEach((dot) => {
        dot.style.fill =
          accentStrong;
      });


    shell.setAttribute(
      "viewBox",
      `0 0 ${rect.width} ${rect.height}`
    );


    /*
      Same six-point topology as the morph target:
        top-left diagonal
        top horizontal
        right vertical
        bottom-right diagonal
        bottom horizontal
        left vertical

      All decorative layers are derived from this one geometry family.
    */
    const makeShape = (
      inset,
      topHeight,
      bottomHeight
    ) => {
      const topWidth =
        topHeight *
        settings.slope;

      const bottomWidth =
        bottomHeight *
        settings.slope;


      const left =
        inset;

      const top =
        inset;

      const right =
        rect.width -
        inset;

      const bottom =
        rect.height -
        inset;


      return {
        inset,
        topHeight,
        bottomHeight,
        topWidth,
        bottomWidth,

        left,
        top,
        right,
        bottom,

        topStartX:
          left +
          topWidth,

        rightWallBottomY:
          bottom -
          bottomHeight,

        bottomStartX:
          right -
          bottomWidth,

        leftWallTopY:
          top +
          topHeight,

        d: `
          M ${left + topWidth} ${top}
          H ${right}

          V ${bottom - bottomHeight}

          L ${right - bottomWidth} ${bottom}

          H ${left}

          V ${top + topHeight}

          Z
        `
      };
    };


    /*
      Outer silhouette stays consistent with the morph's final shape.
    */
    const outerTopHeight =
      Math.min(
        46,
        rect.height * 0.12
      );

    const outerBottomHeight =
      Math.min(
        48,
        rect.height * 0.12
      );


    const outerShape =
      makeShape(
        1,
        outerTopHeight,
        outerBottomHeight
      );


    /*
      The transparent content window needs a more substantial inset than
      the old thin-outline prototype.
    */
    const frameThickness =
      clamp(
        Math.min(
          rect.width * 0.038,
          rect.height * 0.070
        ),
        30,
        56
      );


    const contentShape =
      makeShape(
        frameThickness,
        Math.min(
          64,
          outerTopHeight + 18
        ),
        Math.min(
          66,
          outerBottomHeight + 18
        )
      );


    /*
      Compound even-odd path = real border ring with transparent middle.
    */
    ring.setAttribute(
      "d",
      `${outerShape.d} ${contentShape.d}`
    );


    outerEdge.setAttribute(
      "d",
      outerShape.d
    );


    const chromeShape =
      makeShape(
        6,
        Math.min(
          50,
          outerTopHeight + 4
        ),
        Math.min(
          52,
          outerBottomHeight + 4
        )
      );


    chromeEdge.setAttribute(
      "d",
      chromeShape.d
    );


    const innerChromeShape =
      makeShape(
        Math.max(
          10,
          frameThickness - 8
        ),
        Math.min(
          60,
          contentShape.topHeight - 4
        ),
        Math.min(
          62,
          contentShape.bottomHeight - 4
        )
      );


    innerEdge.setAttribute(
      "d",
      innerChromeShape.d
    );


    orangeRail.setAttribute(
      "d",
      contentShape.d
    );


    /*
      Small brighter orange section along the top-left horizontal rail.
    */
    const highlightStart =
      contentShape.topStartX +
      Math.min(
        18,
        rect.width * 0.015
      );


    const highlightEnd =
      Math.min(
        contentShape.right - 70,
        highlightStart +
        Math.max(
          90,
          rect.width * 0.14
        )
      );


    orangeHighlight.setAttribute(
      "d",
      `
        M ${highlightStart} ${contentShape.top}
        H ${highlightEnd}
      `
    );


    /*
      Bottom-center decorative notch. This is an INSET detail only; it
      does not alter the outer morph silhouette.
    */
    const centerX =
      rect.width / 2;


    const notchY =
      contentShape.bottom;


    const notchHalf =
      clamp(
        rect.width * 0.075,
        58,
        110
      );


    const notchDepth =
      clamp(
        rect.height * 0.018,
        8,
        16
      );


    bottomNotch.setAttribute(
      "d",
      `
        M ${centerX - notchHalf} ${notchY}
        H ${centerX - 18}
        L ${centerX} ${notchY + notchDepth}
        L ${centerX + 18} ${notchY}
        H ${centerX + notchHalf}
      `
    );


    /*
      Corner triangle clusters.
    */
    const setTriangleCluster = (
      selector,
      originX,
      originY,
      scale = 1
    ) => {
      const group =
        frameElement.querySelector(
          selector
        );


      if (!group) {
        return;
      }


      const triangles =
        group.querySelectorAll(
          ".page-frame-triangle"
        );


      const s =
        11 * scale;


      const trianglePoints = (
        x,
        y
      ) => {
        return (
          `${x},${y + s} ` +
          `${x + s * 0.55},${y} ` +
          `${x + s * 1.1},${y + s}`
        );
      };


      if (triangles[0]) {
        triangles[0].setAttribute(
          "points",
          trianglePoints(
            originX + s * 0.55,
            originY
          )
        );
      }


      if (triangles[1]) {
        triangles[1].setAttribute(
          "points",
          trianglePoints(
            originX,
            originY + s * 0.88
          )
        );
      }


      if (triangles[2]) {
        triangles[2].setAttribute(
          "points",
          trianglePoints(
            originX + s * 1.1,
            originY + s * 0.88
          )
        );
      }
    };


    setTriangleCluster(
      ".page-frame-triangle-cluster--top",
      Math.max(26, contentShape.left * 0.55),
      Math.max(16, contentShape.top * 0.42),
      0.95
    );


    setTriangleCluster(
      ".page-frame-triangle-cluster--bottom",
      rect.width - Math.max(72, contentShape.left * 1.1),
      rect.height - Math.max(64, contentShape.top * 1.1),
      0.95
    );


    /*
      Side rails and dots.
    */
    const updateSideDetails = (
      selector,
      x,
      mirror = false
    ) => {
      const group =
        frameElement.querySelector(
          selector
        );


      if (!group) {
        return;
      }


      const lines =
        group.querySelectorAll(
          ".page-frame-detail-line"
        );


      const dots =
        group.querySelectorAll(
          ".page-frame-detail-dot"
        );


      const upperY =
        clamp(
          rect.height * 0.25,
          90,
          220
        );


      const lowerY =
        clamp(
          rect.height * 0.68,
          260,
          rect.height - 100
        );


      if (lines[0]) {
        lines[0].setAttribute(
          "x1",
          x
        );

        lines[0].setAttribute(
          "x2",
          x
        );

        lines[0].setAttribute(
          "y1",
          upperY
        );

        lines[0].setAttribute(
          "y2",
          lowerY
        );
      }


      if (lines[1]) {
        const shortX =
          mirror
            ? x - 5
            : x + 5;


        lines[1].setAttribute(
          "x1",
          shortX
        );

        lines[1].setAttribute(
          "x2",
          shortX
        );

        lines[1].setAttribute(
          "y1",
          upperY + 18
        );

        lines[1].setAttribute(
          "y2",
          upperY + 64
        );
      }


      dots.forEach((
        dot,
        index
      ) => {
        dot.setAttribute(
          "cx",
          mirror
            ? x - 4
            : x + 4
        );

        dot.setAttribute(
          "cy",
          lowerY +
          14 +
          index * 9
        );
      });
    };


    updateSideDetails(
      ".page-frame-side-details--left",
      18,
      false
    );


    updateSideDetails(
      ".page-frame-side-details--right",
      rect.width - 18,
      true
    );


    /*
      Bottom-center dots.
    */
    const bottomDots =
      frameElement.querySelectorAll(
        ".page-frame-bottom-dots circle"
      );


    bottomDots.forEach((
      dot,
      index
    ) => {
      dot.setAttribute(
        "cx",
        centerX -
        25 +
        index * 10
      );

      dot.setAttribute(
        "cy",
        rect.height -
        Math.max(
          12,
          frameThickness * 0.28
        )
      );
    });


    /*
      Expose the true transparent-window bounds to future HTML content.
    */
    frameElement.style.setProperty(
      "--page-content-left",
      `${contentShape.left}px`
    );

    frameElement.style.setProperty(
      "--page-content-top",
      `${contentShape.top}px`
    );

    frameElement.style.setProperty(
      "--page-content-right",
      `${rect.width - contentShape.right}px`
    );

    frameElement.style.setProperty(
      "--page-content-bottom",
      `${rect.height - contentShape.bottom}px`
    );
  };


  const updateAllPrototypePageFrameGeometry = () => {
    pageFrames.forEach((frame) => {
      updatePrototypePageFrameGeometry(
        frame
      );
    });
  };



  /*
    Targets #2-#6: one page-frame target per nav button.

    They all use the same final frame shape and page timing family for
    now. Unique page visuals/content can be layered in later.
  */
  pageNames.forEach((name) => {
    const button =
      pageNavButtons.get(name);

    const frame =
      pageFrames.get(name);


    if (
      !button ||
      !frame
    ) {
      return;
    }


    morphEngine.register(
      `${name}-page`,
      {
        getSourceElement: () =>
          button,

        getTargetElement: () =>
          frame,

        getFinalRect:
          getFinalElementRect,

        buildFormPath:
          buildFormPath,

        settingsFamily:
          "page",

        shapeType:
          "page"
      }
    );
  });



  /* =======================================================
     Render animation
     ======================================================= */

  const renderMorph = (
    geometry,
    progress,
    outputPath = menuMorphPath
  ) => {
    let path;


    const settings =
      geometry.settings;


    const neckEnd =
      Math.max(
        0.0001,
        settings.neckEnd
      );


    const paraStart =
      Math.max(
        neckEnd,
        settings.parallelogramStart
      );


    const paraEnd =
      Math.max(
        paraStart + 0.0001,
        settings.parallelogramEnd
      );


    const reshapeStart =
      Math.max(
        paraEnd,
        settings.reshapeStart
      );


    /*
      Stage 1 — neck extension.
    */
    if (progress <= neckEnd) {
      const raw =
        clamp(
          progress / neckEnd,
          0,
          1
        );


      const localProgress =
        easingFromName(
          settings.neckEase
        )(raw);


      path =
        buildExtendPath(
          geometry,
          localProgress
        );
    }


    /*
      Optional hold after neck extension.
    */
    else if (progress < paraStart) {
      path =
        buildExtendPath(
          geometry,
          1
        );
    }


    /*
      Stage 2 — parallelogram formation.
    */
    else if (progress <= paraEnd) {
      const raw =
        clamp(
          (
            progress -
            paraStart
          ) /
          (
            paraEnd -
            paraStart
          ),
          0,
          1
        );


      const localProgress =
        easingFromName(
          settings.parallelogramEase
        )(raw);


      path =
        buildUnfoldPath(
          geometry,
          localProgress
        );
    }


    /*
      Optional hold after parallelogram formation.
    */
    else if (progress < reshapeStart) {
      path =
        buildUnfoldPath(
          geometry,
          1
        );
    }


    /*
      Stage 3 — parallelogram -> final menu.
    */
    else {
      const raw =
        clamp(
          (
            progress -
            reshapeStart
          ) /
          Math.max(
            0.0001,
            1 -
            reshapeStart
          ),
          0,
          1
        );


      const localProgress =
        easingFromName(
          settings.reshapeEase
        )(raw);


      const formBuilder =
        geometry.target &&
        typeof geometry.target.buildFormPath ===
        "function"
          ? geometry.target.buildFormPath
          : buildFormPath;


      path =
        formBuilder(
          geometry,
          localProgress
        );
    }


    outputPath.setAttribute(
      "d",
      path
    );


    const colourProgress =
      easeInOutCubic(progress);


    const fill =
      mixColor(
        geometry.settings.startFill,
        geometry.settings.endFill,
        colourProgress
      );


    const stroke =
      mixColor(
        geometry.settings.startStroke,
        geometry.settings.endStroke,
        colourProgress
      );


    outputPath.style.fill =
      colorToCss(fill);


    outputPath.style.stroke =
      colorToCss(stroke);


    outputPath.style.strokeWidth =
      geometry.settings.strokeWidth;
  };


  /* =======================================================
     Animation driver
     ======================================================= */

  const animateMorph = ({
    from,
    to,
    duration,
    geometry,
    runId,
    onProgress,
    onComplete
  }) => {
    /*
      Starting a new animation means we are intentionally replacing the
      previous direction (for example: opening -> closing mid-morph).
    */
    if (animationFrame !== null) {
      cancelAnimationFrame(
        animationFrame
      );

      animationFrame = null;
    }


    const startTime =
      performance.now();


    const frame = (now) => {
      /*
        A newer open/close/reversal has taken ownership of the morph.
      */
      if (runId !== animationRunId) {
        return;
      }


      const elapsed =
        now -
        startTime;


      const rawProgress =
        clamp(
          elapsed / duration,
          0,
          1
        );


      const progress =
        lerp(
          from,
          to,
          rawProgress
        );


      currentMorphProgress =
        progress;


      renderMorph(
        geometry,
        progress
      );


      if (
        typeof onProgress ===
        "function"
      ) {
        onProgress(
          progress,
          rawProgress
        );
      }


      if (rawProgress < 1) {
        animationFrame =
          requestAnimationFrame(
            frame
          );

        return;
      }


      animationFrame = null;


      if (
        typeof onComplete ===
        "function"
      ) {
        onComplete();
      }
    };


    animationFrame =
      requestAnimationFrame(
        frame
      );
  };


  /* =======================================================
     Temporary SVG visibility
     ======================================================= */

  const showMorph = () => {
    menuMorph.style.transition =
      "none";

    menuMorph.style.visibility =
      "visible";

    menuMorph.style.opacity =
      "1";


    menuMorph.setAttribute(
      "viewBox",
      `0 0 ${window.innerWidth} ${window.innerHeight}`
    );
  };


  const hideMorph = () => {
    menuMorph.style.visibility =
      "hidden";

    menuMorph.style.opacity =
      "0";

    menuMorph.style.transition =
      "none";


    menuMorphPath.setAttribute(
      "d",
      ""
    );


    incomingPageMorphPath.setAttribute(
      "d",
      ""
    );


    menuMorphPath.removeAttribute(
      "style"
    );


    incomingPageMorphPath.removeAttribute(
      "style"
    );


    Object.assign(
      menuMorphPath.style,
      {
        vectorEffect:
          "non-scaling-stroke",

        strokeLinejoin:
          "miter"
      }
    );


    Object.assign(
      incomingPageMorphPath.style,
      {
        vectorEffect:
          "non-scaling-stroke",

        strokeLinejoin:
          "miter",

        visibility:
          "hidden",

        opacity:
          "1"
      }
    );
  };


  const clearOutgoingMorphPath = () => {
    menuMorphPath.setAttribute(
      "d",
      ""
    );

    menuMorphPath.removeAttribute(
      "style"
    );

    Object.assign(
      menuMorphPath.style,
      {
        vectorEffect:
          "non-scaling-stroke",

        strokeLinejoin:
          "miter"
      }
    );
  };


  const clearIncomingMorphPath = () => {
    incomingPageMorphPath.setAttribute(
      "d",
      ""
    );

    incomingPageMorphPath.removeAttribute(
      "style"
    );

    Object.assign(
      incomingPageMorphPath.style,
      {
        vectorEffect:
          "non-scaling-stroke",

        strokeLinejoin:
          "miter",

        visibility:
          "hidden",

        opacity:
          "1"
      }
    );
  };


  const hideMorphIfIdle = () => {
    if (incomingOverlapStarted) {
      /*
        Keep the shared SVG surface alive for the incoming animation.
        Only remove the outgoing path.
      */
      clearOutgoingMorphPath();

      return;
    }


    hideMorph();
  };


  const handOffMorphToMenu = (
    callback
  ) => {
    /*
      No hold at the end of the morph:
      the real menu starts appearing immediately on the very next frame.
    */
    mobileMenu.classList.add(
      "is-open"
    );


    menuMorph.style.transition =
      "opacity 110ms ease";


    requestAnimationFrame(() => {
      menuMorph.style.opacity =
        "0";
    });


    window.setTimeout(() => {
      hideMorph();


      if (
        typeof callback ===
        "function"
      ) {
        callback();
      }
    }, 120);
  };


  /* =======================================================
     Button state
     ======================================================= */

  const setExpandedState = (
    isOpen
  ) => {
    menuToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );


    menuToggle.setAttribute(
      "aria-label",
      isOpen
        ? "Close menu"
        : "Open menu"
    );
  };


  const clearHandoffTimer = () => {
    if (handoffTimer !== null) {
      window.clearTimeout(
        handoffTimer
      );

      handoffTimer = null;
    }
  };


  const clearMenuInteractionTimer = () => {
    if (menuInteractionTimer !== null) {
      window.clearTimeout(
        menuInteractionTimer
      );

      menuInteractionTimer = null;
    }
  };


  const clearIconTimer = () => {
    if (iconTimer !== null) {
      window.clearTimeout(
        iconTimer
      );


      iconTimer = null;
    }
  };


  /* =======================================================
     Open
     ======================================================= */

  const openMenu = () => {
    if (
      menuIsOpen ||
      isAnimating
    ) {
      return;
    }


    isAnimating = true;
    animationTargetOpen = true;

    animationRunId += 1;

    const runId =
      animationRunId;


    currentMorphProgress = 0;

    menuRevealStarted = false;
    fakeMenuFadeStarted = false;

    menuInteractive = false;

    clearHandoffTimer();
    clearMenuInteractionTimer();
    clearIconTimer();


    /*
      The real menu may appear before the morph is finished, but keep
      its links inactive until its own fade-in is complete.
    */
    mobileMenu.style.pointerEvents =
      "none";


    updateMenuShearGeometry();


    mobileMenu.classList.remove(
      "is-open"
    );


    const geometry =
      morphEngine.getGeometry(
        "mobile-menu"
      );


    if (!geometry) {
      isAnimating = false;

      return;
    }


    showMorph();


    renderMorph(
      geometry,
      0
    );


    /*
      Change to X once the extrusion is visibly established.
    */
    iconTimer =
      window.setTimeout(() => {
        setExpandedState(true);

        iconTimer = null;
      }, geometry.settings.openDuration *
          geometry.settings.iconSwitchAt);


    animateMorph({
      from: 0,
      to: 1,

      duration:
        geometry.settings.openDuration,

      geometry,
      runId,

      /*
        Begin revealing the real menu during the final 20% of the morph.
        This overlaps the two more strongly and makes the hand-off feel immediate.
      */
      onProgress: (
        progress
      ) => {
        if (
          !menuRevealStarted &&
          progress >=
            geometry.settings.realMenuRevealAt
        ) {
          menuRevealStarted = true;

          /*
            The fake shell is already travelling toward the real menu's
            FINAL geometry.

            Previously the real menu still animated its own transform
            from:
              translateY(-10px) scaleY(0.92)
            to:
              translateY(0) scaleY(1)

            during the overlap. That made it look like the two shells
            were still vertically misaligned even though their final
            rectangles matched.

            During handoff, animate opacity ONLY. The real menu snaps to
            its exact final transform immediately, underneath the fake
            shell, then fades in there.
          */
          mobileMenu.style.transition =
            `opacity ${
              geometry.settings.realMenuFadeDuration
            }ms ease`;

          mobileMenu.classList.add(
            "is-open"
          );


          /*
            The links become active as soon as the REAL menu has finished
            fading in. This is independent of the remaining fake-menu
            morph animation.
          */
          clearMenuInteractionTimer();

          menuInteractionTimer =
            window.setTimeout(() => {
              if (runId !== animationRunId) {
                return;
              }


              menuInteractive = true;

              mobileMenu.style.pointerEvents =
                "auto";

              menuInteractionTimer = null;
            }, geometry.settings.realMenuFadeDuration);
        }


        if (
          !fakeMenuFadeStarted &&
          progress >=
            geometry.settings.fakeMenuFadeStart
        ) {
          fakeMenuFadeStarted = true;

          menuMorph.style.transition =
            `opacity ${
              geometry.settings.fakeMenuFadeDuration
            }ms ease`;

          menuMorph.style.opacity =
            "0";
        }
      },

      onComplete: () => {
        clearIconTimer();

        setExpandedState(true);


        /*
          If the CSS start point is 100%, the fake menu may not have
          begun fading yet, so start it here as a fallback.
        */
        if (!fakeMenuFadeStarted) {
          fakeMenuFadeStarted = true;

          menuMorph.style.transition =
            `opacity ${
              geometry.settings.fakeMenuFadeDuration
            }ms ease`;

          menuMorph.style.opacity =
            "0";
        }


        clearHandoffTimer();


        handoffTimer =
          window.setTimeout(() => {
            handoffTimer = null;


            if (runId !== animationRunId) {
              return;
            }


            hideMorph();

            /*
              Hand control back to the stylesheet now that the two shells
              are no longer overlapping.
            */
            mobileMenu.style.transition =
              "";

            mobileMenu.style.opacity =
              "";

            /*
              Safety fallback: the menu must be interactive once the full
              animation completes even if a custom fade setting delayed it.
            */
            clearMenuInteractionTimer();

            menuInteractive = true;

            mobileMenu.style.pointerEvents =
              "auto";

            currentMorphProgress = 1;

            menuIsOpen = true;
            isAnimating = false;
            animationTargetOpen = true;
          }, geometry.settings.fakeMenuFadeDuration + 10);
      }
    });
  };


  /*
    Reverse an in-progress OPENING animation from exactly where it is.

    This is the important difference from immediate-close:
    nothing resets to frame 0 or frame 1 first, so there is no state
    mismatch to poison the next hamburger click.
  */
  const reverseOpeningToClosed = ({
    focusToggle = false
  } = {}) => {
    if (
      !isAnimating ||
      !animationTargetOpen
    ) {
      return false;
    }


    animationRunId += 1;

    const runId =
      animationRunId;


    clearHandoffTimer();
    clearIconTimer();
    clearMenuInteractionTimer();

    menuInteractive = false;
    animationTargetOpen = false;


    mobileMenu.style.pointerEvents =
      "none";


    /*
      IMPORTANT:
      Keep .is-open during the reverse handoff.

      Removing it here used to snap the REAL menu back to its closed
      transform (translateY(-10px) scaleY(.92)), which caused the little
      upward pop you were seeing before the SVG reverse began.

      Instead, leave the real menu at its exact final/open geometry and
      fade only its opacity. The fake SVG shell reverses underneath it.
    */
    if (
      mobileMenu.classList.contains(
        "is-open"
      )
    ) {
      const reverseFadeSettings =
        getSettings();


      mobileMenu.style.transition =
        `opacity ${
          reverseFadeSettings.realMenuFadeDuration
        }ms ease`;

      mobileMenu.style.opacity =
        "0";
    }


    /*
      If the fake shell had started fading, bring it back before the
      reverse begins so the reverse motion remains visible.
    */
    menuMorph.style.transition =
      "none";

    menuMorph.style.opacity =
      "1";

    menuMorph.style.visibility =
      "visible";


    const geometry =
      morphEngine.getGeometry(
        "mobile-menu"
      );


    if (!geometry) {
      closeMenu({
        immediate: true,
        focusToggle
      });

      return true;
    }


    const fromProgress =
      currentMorphProgress;


    /*
      Scale the close duration by distance remaining. If we're only 60%
      open, reversing takes roughly 60% of the normal close time.
    */
    const reverseDuration =
      Math.max(
        1,
        geometry.settings.closeDuration *
        fromProgress
      );


    /*
      Close/reverse icon timing is relative to the reverse CLICK, not to
      the absolute morph position. This keeps the control intuitive:
      0% means change immediately regardless of how far open we were.
    */
    if (
      geometry.settings.closeIconSwitchAt <= 0
    ) {
      setExpandedState(false);
    }

    else {
      setExpandedState(true);
    }


    animateMorph({
      from:
        fromProgress,

      to: 0,

      duration:
        reverseDuration,

      geometry,
      runId,

      onProgress: (
        progress,
        rawProgress
      ) => {
        if (
          rawProgress >=
          geometry.settings.closeIconSwitchAt
        ) {
          setExpandedState(false);
        }
      },

      onComplete: () => {
        currentMorphProgress = 0;

        clearIconTimer();
        clearMenuInteractionTimer();

        setExpandedState(false);

        hideMorph();

        /*
          Now that the reverse is completely finished, it is safe to
          return the real menu to its closed transform.
        */
        mobileMenu.classList.remove(
          "is-open"
        );

        mobileMenu.style.transition =
          "";

        mobileMenu.style.opacity =
          "";

        mobileMenu.style.pointerEvents =
          "";

        menuIsOpen = false;
        isAnimating = false;
        animationTargetOpen = false;

        morphEngine.clearActive();


        if (focusToggle) {
          menuToggle.focus();
        }
      }
    });


    return true;
  };


  /*
    Reverse an in-progress CLOSING animation from exactly where it is.
    This makes rapid hamburger clicking symmetrical and prevents the
    state from getting stranded between "open" and "closed".
  */
  const reverseClosingToOpen = () => {
    if (
      !isAnimating ||
      animationTargetOpen
    ) {
      return false;
    }


    animationRunId += 1;

    const runId =
      animationRunId;


    clearHandoffTimer();
    clearIconTimer();
    clearMenuInteractionTimer();

    animationTargetOpen = true;
    menuInteractive = false;

    mobileMenu.style.pointerEvents =
      "none";


    /*
      If the real menu had already appeared before we reversed toward
      closed, it is still sitting at the correct OPEN transform with an
      inline opacity of 0. Fade it back in from that exact same position
      when reversing toward open again.
    */
    if (
      menuRevealStarted &&
      mobileMenu.classList.contains(
        "is-open"
      )
    ) {
      const reopenFadeSettings =
        getSettings();


      mobileMenu.style.transition =
        `opacity ${
          reopenFadeSettings.realMenuFadeDuration
        }ms ease`;

      mobileMenu.style.opacity =
        "1";
    }


    const geometry =
      morphEngine.getGeometry(
        "mobile-menu"
      );


    if (!geometry) {
      return false;
    }


    showMorph();

    menuMorph.style.transition =
      "none";

    menuMorph.style.opacity =
      "1";


    const fromProgress =
      currentMorphProgress;


    const reverseDuration =
      Math.max(
        1,
        geometry.settings.openDuration *
        (1 - fromProgress)
      );


    animateMorph({
      from:
        fromProgress,

      to: 1,

      duration:
        reverseDuration,

      geometry,
      runId,

      onProgress: (
        progress
      ) => {
        if (
          !menuRevealStarted &&
          progress >=
            geometry.settings.realMenuRevealAt
        ) {
          menuRevealStarted = true;

          mobileMenu.style.transition =
            `opacity ${
              geometry.settings.realMenuFadeDuration
            }ms ease`;

          mobileMenu.classList.add(
            "is-open"
          );


          clearMenuInteractionTimer();

          menuInteractionTimer =
            window.setTimeout(() => {
              if (runId !== animationRunId) {
                return;
              }


              menuInteractive = true;

              mobileMenu.style.pointerEvents =
                "auto";

              menuInteractionTimer = null;
            }, geometry.settings.realMenuFadeDuration);
        }


        if (
          progress >=
          geometry.settings.iconSwitchAt
        ) {
          setExpandedState(true);
        }
      },

      onComplete: () => {
        if (runId !== animationRunId) {
          return;
        }


        clearIconTimer();

        setExpandedState(true);

        mobileMenu.classList.add(
          "is-open"
        );

        mobileMenu.style.transition =
          "";

        mobileMenu.style.opacity =
          "";

        mobileMenu.style.pointerEvents =
          "auto";

        hideMorph();

        currentMorphProgress = 1;

        menuRevealStarted = true;
        fakeMenuFadeStarted = true;
        menuInteractive = true;

        menuIsOpen = true;
        isAnimating = false;
        animationTargetOpen = true;
      }
    });


    return true;
  };


  /* =======================================================
     Close
     ======================================================= */

  const closeMenu = ({
    focusToggle = false,
    immediate = false
  } = {}) => {
    /*
      If we're still opening, CLOSE means reverse from the current frame.
    */
    if (
      !immediate &&
      isAnimating &&
      animationTargetOpen
    ) {
      reverseOpeningToClosed({
        focusToggle
      });

      return;
    }


    clearIconTimer();
    clearMenuInteractionTimer();

    menuInteractive = false;


    if (immediate) {
      animationRunId += 1;

      clearHandoffTimer();


      if (animationFrame !== null) {
        cancelAnimationFrame(
          animationFrame
        );


        animationFrame = null;
      }


      currentMorphProgress = 0;

      menuIsOpen = false;
      isAnimating = false;
      animationTargetOpen = false;

      morphEngine.clearActive();


      mobileMenu.classList.remove(
        "is-open"
      );

      mobileMenu.style.transition =
        "";

      mobileMenu.style.opacity =
        "";

      mobileMenu.style.pointerEvents =
        "";


      setExpandedState(false);

      hideMorph();

      return;
    }


    if (
      !menuIsOpen ||
      isAnimating
    ) {
      return;
    }


    isAnimating = true;
    animationTargetOpen = false;

    animationRunId += 1;

    const runId =
      animationRunId;


    clearHandoffTimer();


    updateMenuShearGeometry();


    const geometry =
      morphEngine.getGeometry(
        "mobile-menu"
      );


    if (!geometry) {
      isAnimating = false;

      return;
    }


    showMorph();


    /*
      Draw the exact final shell before hiding the real menu.
    */
    renderMorph(
      geometry,
      1
    );


    mobileMenu.classList.remove(
      "is-open"
    );


    setExpandedState(true);


    if (
      geometry.settings.closeIconSwitchAt <= 0
    ) {
      setExpandedState(false);
    }

    else {
      iconTimer =
        window.setTimeout(() => {
          setExpandedState(false);

          iconTimer = null;
        }, geometry.settings.closeDuration *
            geometry.settings.closeIconSwitchAt);
    }


    animateMorph({
      from: 1,
      to: 0,

      duration:
        geometry.settings.closeDuration,

      geometry,
      runId,

      onComplete: () => {
        if (runId !== animationRunId) {
          return;
        }


        clearIconTimer();

        setExpandedState(false);


        hideMorph();


        currentMorphProgress = 0;

        menuIsOpen = false;
        isAnimating = false;
        animationTargetOpen = false;

        mobileMenu.style.pointerEvents =
          "";


        if (focusToggle) {
          menuToggle.focus();
        }
      }
    });
  };


  /* =======================================================
     Desktop / compact page-frame animation
     ======================================================= */

  /*
    One page-morph interaction system now covers BOTH:
      841–1400px  compact icon-button mode
      1401px+     full text-button desktop mode

    The destination layout itself is breakpoint-specific CSS.
  */
  const iconButtonMode =
    window.matchMedia(
      "(min-width: 841px)"
    );


  const fullTextDesktopMode =
    window.matchMedia(
      "(min-width: 1401px)"
    );


  const secondaryPanelTimers =
    new Map();


  const secondaryPanelAnimations =
    new Map();


  let pageLayoutTransitionRunId = 0;
  let pageLayoutTransitionActive = false;
  let lastStablePageRect = null;

  /*
    This tracks the mode represented by lastStablePageRect.
    It intentionally updates only AFTER a breakpoint handoff completes.
  */
  let lastStablePageWasDesktop =
    fullTextDesktopMode.matches;


  const getPageFrame = (
    name
  ) => {
    return (
      pageFrames.get(name) ||
      null
    );
  };


  const getPageTargetName = (
    name
  ) => {
    return `${name}-page`;
  };


  const clearSecondaryPanelTimer = (
    frame
  ) => {
    const timer =
      secondaryPanelTimers.get(
        frame
      );


    if (timer !== undefined) {
      clearTimeout(
        timer
      );

      secondaryPanelTimers.delete(
        frame
      );
    }
  };


  const cancelSecondaryPanelAnimation = (
    frame
  ) => {
    const animation =
      secondaryPanelAnimations.get(
        frame
      );


    if (animation) {
      animation.cancel();

      secondaryPanelAnimations.delete(
        frame
      );
    }
  };


  const getSecondaryPanelElements = (
    frame
  ) => {
    if (!frame) {
      return null;
    }


    const panel =
      frame.querySelector(
        ".desktop-secondary-panel"
      );

    const glass =
      frame.querySelector(
        ".desktop-secondary-panel-glass"
      );


    if (
      !panel ||
      !glass
    ) {
      return null;
    }


    return {
      panel,
      glass
    };
  };


  const getSecondaryMorphKeyframes = (
    frame
  ) => {
    const styles =
      getComputedStyle(
        frame
      );


    const elements =
      getSecondaryPanelElements(
        frame
      );


    const panelRect =
      elements
        ? elements.panel.getBoundingClientRect()
        : {
            width: 0,
            height: 0
          };


    /*
      Use the same master diagonal slope as the rest of the site.
      The corner's horizontal run is derived from its vertical rise,
      so resizing can change the SIZE of the cut without changing
      its ANGLE.
    */
    const siteSettings =
      getSettings();


    const cornerHeightRaw =
      styles
        .getPropertyValue(
          "--secondary-panel-corner-height"
        )
        .trim();


    let cornerHeight =
      parseFloat(
        cornerHeightRaw
      );


    /*
      CSS percentages from getComputedStyle may remain percentage text,
      so resolve them against the panel height when necessary.
    */
    if (
      Number.isFinite(cornerHeight) &&
      cornerHeightRaw.endsWith("%")
    ) {
      cornerHeight =
        panelRect.height *
        (cornerHeight / 100);
    }


    if (!Number.isFinite(cornerHeight)) {
      cornerHeight =
        Math.min(
          68,
          Math.max(
            42,
            panelRect.height * 0.085
          )
        );
    }


    cornerHeight =
      Math.min(
        Math.max(
          1,
          cornerHeight
        ),
        Math.max(
          1,
          panelRect.height * 0.25
        )
      );


    const cornerWidth =
      cornerHeight *
      siteSettings.slope;


    const finalClipPath =
      "polygon(" +
      "0 0, " +
      `calc(100% - ${cornerWidth}px) 0, ` +
      `100% ${cornerHeight}px, ` +
      `100% calc(100% - ${cornerHeight}px), ` +
      `calc(100% - ${cornerWidth}px) 100%, ` +
      "0 100%" +
      ")";


    const finalFill =
      styles
        .getPropertyValue(
          "--secondary-panel-fill"
        )
        .trim() ||
      "rgba(105, 118, 138, 0.24)";


    const finalBorder =
      styles
        .getPropertyValue(
          "--secondary-panel-border"
        )
        .trim() ||
      "rgba(194, 205, 218, 0.28)";


    const finalInnerBorder =
      styles
        .getPropertyValue(
          "--secondary-panel-inner-border"
        )
        .trim() ||
      "rgba(255, 255, 255, 0.08)";


    const stageRaw =
      styles
        .getPropertyValue(
          "--secondary-panel-triangle-stage"
        )
        .trim();


    let stage =
      parseFloat(
        stageRaw
      );


    if (
      Number.isFinite(stage) &&
      stageRaw.endsWith("%")
    ) {
      stage /= 100;
    }


    stage =
      clamp(
        Number.isFinite(stage)
          ? stage
          : 0.38,
        0.15,
        0.75
      );


    const pageAccent =
      getFrameAccentRgb(
        frame
      );


    const pageAccentLight =
      lightenRgb(
        pageAccent,
        0.22
      );


    const pageAccentLightMid =
      lightenRgb(
        pageAccent,
        0.18
      );


    const morphFill =
      rgbaFromRgb(
        pageAccent,
        0.68
      );


    const morphFillMid =
      rgbaFromRgb(
        pageAccent,
        0.58
      );


    const morphBorder =
      rgbaFromRgb(
        pageAccentLight,
        0.88
      );


    const morphBorderMid =
      rgbaFromRgb(
        pageAccentLightMid,
        0.82
      );


    const morphInner =
      rgbaFromRgb(
        pageAccent,
        0.16
      );


    const morphInnerMid =
      rgbaFromRgb(
        pageAccent,
        0.14
      );


    const makeShadow = (
      border,
      inner
    ) => {
      return (
        `inset 0 0 0 1px ${border}, ` +
        `inset 0 0 0 3px ${inner}, ` +
        `inset 18px 0 40px rgba(255,255,255,0.025), ` +
        `0 8px 24px rgba(0,0,0,0.16)`
      );
    };


    return [
      {
        offset: 0,

        clipPath:
          "polygon(" +
          "0 47%, " +
          "0 47%, " +
          "7% 50%, " +
          "7% 50%, " +
          "0 53%, " +
          "0 53%" +
          ")",

        backgroundColor:
          morphFill,

        boxShadow:
          makeShadow(
            morphBorder,
            morphInner
          ),

        opacity: 0
      },

      /*
        Large triangle stage. Six points are preserved so interpolation
        into the final six-point panel is stable.
      */
      {
        offset:
          stage,

        clipPath:
          "polygon(" +
          "0 5%, " +
          "0 5%, " +
          "56% 50%, " +
          "56% 50%, " +
          "0 95%, " +
          "0 95%" +
          ")",

        backgroundColor:
          morphFillMid,

        boxShadow:
          makeShadow(
            morphBorderMid,
            morphInnerMid
          ),

        opacity: 1
      },

      /*
        Final glass panel. This matches the red-outline-inspired target:
        straight left edge with clipped top-right / bottom-right corners.
      */
      {
        offset: 1,

        clipPath:
          finalClipPath,

        backgroundColor:
          finalFill,

        boxShadow:
          makeShadow(
            finalBorder,
            finalInnerBorder
          ),

        opacity: 1
      }
    ];
  };


  const runSecondaryPanelMorph = (
    frame,
    opening
  ) => {
    if (
      !frame ||
      (
        !fullTextDesktopMode.matches &&
        !frame.classList.contains(
          "is-layout-transitioning"
        )
      )
    ) {
      return;
    }


    const elements =
      getSecondaryPanelElements(
        frame
      );


    if (!elements) {
      return;
    }


    clearSecondaryPanelTimer(
      frame
    );


    /*
      Capture the CURRENT visible state before cancelling any in-flight
      animation. This is important when the viewport crosses the desktop
      breakpoint while the sidebar is only partially grown.
    */
    const existingAnimation =
      secondaryPanelAnimations.get(
        frame
      );


    let existingProgress = null;


    if (existingAnimation) {
      const timing =
        existingAnimation.effect
          ? existingAnimation.effect.getComputedTiming()
          : null;


      if (
        timing &&
        Number.isFinite(
          timing.progress
        )
      ) {
        existingProgress =
          timing.progress;
      }
    }


    const currentStyles =
      getComputedStyle(
        elements.glass
      );


    const currentFrame = {
      clipPath:
        currentStyles.clipPath,

      backgroundColor:
        currentStyles.backgroundColor,

      boxShadow:
        currentStyles.boxShadow,

      opacity:
        parseFloat(
          currentStyles.opacity
        )
    };


    cancelSecondaryPanelAnimation(
      frame
    );


    const styles =
      getComputedStyle(
        frame
      );


    const duration =
      parseCssTime(
        styles.getPropertyValue(
          opening
            ? "--secondary-panel-duration"
            : "--secondary-panel-close-duration"
        ),
        opening
          ? 720
          : 460
      );


    const easing =
      styles
        .getPropertyValue(
          opening
            ? "--secondary-panel-ease"
            : "--secondary-panel-close-ease"
        )
        .trim() ||
      (
        opening
          ? "cubic-bezier(0.18, 0.78, 0.22, 1)"
          : "cubic-bezier(0.55, 0, 0.72, 0.28)"
      );


    const keyframes =
      getSecondaryMorphKeyframes(
        frame
      );


    let animationFrames;


    if (opening) {
      /*
        Normal open retains the full triangle choreography.
      */
      animationFrames =
        keyframes;
    }

    else {
      const seedFrame = {
        ...keyframes[0],
        offset: 1
      };


      const triangleFrame = {
        ...keyframes[1],
        offset: 0.58
      };


      /*
        If the opening animation was already beyond its large-triangle
        stage (or fully open), route the return through that large triangle.

        If it was interrupted very early, going back through the large
        triangle would briefly make the shape GROW while closing, so in
        that case retract directly from the current shape into the seed.
      */
      const triangleStageRaw =
        styles
          .getPropertyValue(
            "--secondary-panel-triangle-stage"
          )
          .trim();


      let triangleStage =
        parseFloat(
          triangleStageRaw
        );


      if (
        Number.isFinite(triangleStage) &&
        triangleStageRaw.endsWith("%")
      ) {
        triangleStage /= 100;
      }


      triangleStage =
        Number.isFinite(triangleStage)
          ? triangleStage
          : 0.38;


      if (
        existingProgress !== null &&
        existingProgress <
          triangleStage
      ) {
        animationFrames = [
          {
            ...currentFrame,
            offset: 0
          },

          seedFrame
        ];
      }

      else {
        animationFrames = [
          {
            ...currentFrame,
            offset: 0
          },

          triangleFrame,

          seedFrame
        ];
      }
    }


    const animation =
      elements.glass.animate(
        animationFrames,
        {
          duration:
            Math.max(
              1,
              duration
            ),

          easing,

          fill:
            "forwards"
        }
      );


    secondaryPanelAnimations.set(
      frame,
      animation
    );


    if (opening) {
      frame.classList.add(
        "is-secondary-open"
      );
    }

    else {
      frame.classList.remove(
        "is-secondary-open"
      );
    }


    animation.onfinish = () => {
      if (
        secondaryPanelAnimations.get(
          frame
        ) !== animation
      ) {
        return;
      }


      secondaryPanelAnimations.delete(
        frame
      );


      if (
        typeof animation.commitStyles ===
        "function"
      ) {
        animation.commitStyles();
      }


      animation.cancel();


      if (!opening) {
        elements.glass.style.removeProperty(
          "clip-path"
        );

        elements.glass.style.removeProperty(
          "background-color"
        );

        elements.glass.style.removeProperty(
          "box-shadow"
        );

        elements.glass.style.removeProperty(
          "opacity"
        );
      }
    };
  };


  const closeSecondaryPanel = (
    frame
  ) => {
    if (!frame) {
      return;
    }


    clearSecondaryPanelTimer(
      frame
    );


    const isOpen =
      frame.classList.contains(
        "is-secondary-open"
      );


    const hasAnimation =
      secondaryPanelAnimations.has(
        frame
      );


    if (
      isOpen ||
      hasAnimation
    ) {
      runSecondaryPanelMorph(
        frame,
        false
      );
    }

    else {
      frame.classList.remove(
        "is-secondary-open"
      );
    }
  };


  const closeAllSecondaryPanels = (
    exceptFrame = null
  ) => {
    pageFrames.forEach((frame) => {
      if (frame === exceptFrame) {
        return;
      }


      closeSecondaryPanel(
        frame
      );
    });
  };


  const scheduleSecondaryPanelOpen = (
    frame
  ) => {
    if (
      !frame ||
      !fullTextDesktopMode.matches
    ) {
      return;
    }


    clearSecondaryPanelTimer(
      frame
    );


    closeAllSecondaryPanels(
      frame
    );


    const styles =
      getComputedStyle(
        frame
      );


    const delay =
      parseCssTime(
        styles.getPropertyValue(
          "--secondary-panel-delay"
        ),
        160
      );


    const timer =
      setTimeout(
        () => {
          secondaryPanelTimers.delete(
            frame
          );


          const framePageName =
            frame.dataset.page ||
            null;


          /*
            Only the page the user MOST RECENTLY selected is allowed to
            grow a secondary panel. This kills stale delayed callbacks from
            a previous page if the user clicks again while its popout is
            still forming.
          */
          if (
            !frame.classList.contains(
              "is-open"
            ) ||
            !framePageName ||
            framePageName !==
              selectedPageName
          ) {
            return;
          }


          runSecondaryPanelMorph(
            frame,
            true
          );
        },
        Math.max(
          0,
          delay
        )
      );


    secondaryPanelTimers.set(
      frame,
      timer
    );
  };


  const hideAllPageFrames = (
    exceptName = null
  ) => {
    pageFrames.forEach((
      frame,
      name
    ) => {
      if (name === exceptName) {
        return;
      }


      closeSecondaryPanel(
        frame
      );


      frame.classList.remove(
        "is-open"
      );

      frame.style.transition =
        "";

      frame.style.opacity =
        "";

      frame.style.opacity =
        "";
    });
  };


  /*
    Hard real-page invariant.

    Any code path that is about to reveal a real page frame MUST call
    this first. That guarantees rapid clicking, overlap cancellation,
    reversals and delayed callbacks can never leave two real frames open.
  */
  const enforceSingleRealPage = (
    keepName = null
  ) => {
    pageFrames.forEach((
      frame,
      name
    ) => {
      if (
        keepName !== null &&
        name === keepName
      ) {
        return;
      }


      closeSecondaryPanel(
        frame
      );


      frame.classList.remove(
        "is-open"
      );

      frame.style.opacity =
        "";

      /*
        Do not preserve a stale transition from an interrupted reveal.
      */
      frame.style.transition =
        "";
    });
  };



  const checkRealPageInvariant = () => {
    const openPages = [];


    pageFrames.forEach((
      frame,
      name
    ) => {
      if (
        frame.classList.contains(
          "is-open"
        )
      ) {
        openPages.push(
          name
        );
      }
    });


    if (openPages.length > 1) {
      console.warn(
        "Page-frame invariant repaired:",
        openPages
      );


      enforceSingleRealPage(
        activePageName
      );
    }
  };


  const resetPageFrames = () => {
    animationRunId += 1;


    if (
      animationFrame !== null &&
      morphEngine.activeTargetName &&
      morphEngine.activeTargetName.endsWith(
        "-page"
      )
    ) {
      cancelAnimationFrame(
        animationFrame
      );

      animationFrame = null;
    }


    closeAllSecondaryPanels();


    activePageName = null;
    selectedPageName = null;

    setActivePageButtonState(
      null
    );

    queuedPageName = null;

    pageFrameIsAnimating = false;
    pageFrameTargetOpen = false;
    pageFrameProgress = 0;


    hideAllPageFrames();


    cancelIncomingPageOverlap();


    hideMorph();


    if (
      morphEngine.activeTargetName &&
      morphEngine.activeTargetName.endsWith(
        "-page"
      )
    ) {
      morphEngine.clearActive();
    }
  };


  const startPageOpen = (
    name
  ) => {
    const frame =
      getPageFrame(name);


    if (
      !frame ||
      !iconButtonMode.matches
    ) {
      return;
    }


    hideAllPageFrames(name);

    updatePrototypePageFrameGeometry(
      frame
    );


    const geometry =
      morphEngine.getGeometry(
        getPageTargetName(name)
      );


    if (!geometry) {
      return;
    }


    activePageName =
      name;


    if (
      !selectedPageName ||
      selectedPageName === name
    ) {
      selectedPageName =
        name;

      setActivePageButtonState(
        name
      );
    }


    queuedPageName =
      null;

    pageFrameIsAnimating =
      true;

    pageFrameTargetOpen =
      true;


    /*
      If we're opening a brand-new page, begin from zero.
      If this is a reversal of the same page's close, preserve progress.
    */
    const from =
      pageFrameProgress;


    const to = 1;


    animationRunId += 1;

    const runId =
      animationRunId;


    const duration =
      Math.max(
        1,
        geometry.settings.openDuration *
        Math.abs(to - from)
      );


    showMorph();

    menuMorph.style.transition =
      "none";

    menuMorph.style.opacity =
      "1";


    animateMorph({
      from,
      to,
      duration,
      geometry,
      runId,

      onProgress: (
        progress
      ) => {
        pageFrameProgress =
          progress;


        if (
          progress >=
          geometry.settings.realMenuRevealAt
        ) {
          frame.style.transition =
            `opacity ${
              geometry.settings.realMenuFadeDuration
            }ms ease`;

          enforceSingleRealPage(
            name
          );

          frame.classList.add(
            "is-open"
          );
        }


        if (
          progress >=
          geometry.settings.fakeMenuFadeStart
        ) {
          menuMorph.style.transition =
            `opacity ${
              geometry.settings.fakeMenuFadeDuration
            }ms ease`;

          menuMorph.style.opacity =
            "0";
        }
      },

      onComplete: () => {
        if (runId !== animationRunId) {
          return;
        }


        pageFrameProgress = 1;

        pageFrameIsAnimating =
          false;

        pageFrameTargetOpen =
          true;


        enforceSingleRealPage(
          name
        );

        frame.classList.add(
          "is-open"
        );

        frame.style.transition =
          "";


        scheduleSecondaryPanelOpen(
          frame
        );


        requestAnimationFrame(() => {
          rememberStablePageRect();
        });


        hideMorph();

        morphEngine.clearActive();
      }
    });
  };


  const cancelIncomingPageOverlap = ({
    preserveRealFrame = false
  } = {}) => {
    if (incomingPageAnimationFrame !== null) {
      cancelAnimationFrame(
        incomingPageAnimationFrame
      );

      incomingPageAnimationFrame =
        null;
    }


    /*
      IMPORTANT:
      The incoming animation may already have revealed its REAL page
      frame before being cancelled/replaced.

      Previously we cleared only the temporary SVG path, which could
      leave that real frame's .is-open class behind indefinitely.
    */
    if (
      incomingOverlapPageName &&
      !preserveRealFrame
    ) {
      const staleFrame =
        getPageFrame(
          incomingOverlapPageName
        );


      if (
        staleFrame &&
        incomingOverlapPageName !==
          activePageName
      ) {
        staleFrame.classList.remove(
          "is-open"
        );

        staleFrame.style.transition =
          "";

        staleFrame.style.opacity =
          "";
      }
    }


    incomingOverlapStarted =
      false;

    incomingOverlapPageName =
      null;


    clearIncomingMorphPath();


    /*
      Defensive sweep after any cancelled incoming animation.
      If a committed page exists, it is the only real frame allowed to
      remain visible; otherwise all real frames must be closed.
    */
    enforceSingleRealPage(
      activePageName
    );
  };


  /*
    Start the incoming page using the SAME normal open geometry/timing
    that already works, but on an independent temporary path.

    This is the key difference from the earlier overlap attempt:
    we do not alter the outgoing geometry at all, and we do not make the
    two animations share a transfer shape. We simply start the known-good
    incoming animation a little early.
  */
  const startIncomingPageOverlap = (
    name,
    overlapDuration
  ) => {
    const frame =
      getPageFrame(name);


    if (
      !frame ||
      !iconButtonMode.matches
    ) {
      return;
    }


    updatePrototypePageFrameGeometry(
      frame
    );


    const target =
      morphEngine.getTarget(
        getPageTargetName(name)
      );


    if (!target) {
      return;
    }


    const geometry =
      getMorphGeometry(
        target
      );


    if (!geometry) {
      return;
    }


    cancelIncomingPageOverlap();


    incomingOverlapStarted =
      true;

    incomingOverlapPageName =
      name;


    incomingPageMorphPath.style.visibility =
      "visible";

    incomingPageMorphPath.style.opacity =
      "1";


    /*
      Start the incoming morph partway through its timeline so that the
      amount already "pre-played" roughly corresponds to the requested
      overlap duration.

      This preserves the normal incoming animation's proportions rather
      than inventing a separate shortened geometry path.
    */
    const overlapProgress =
      clamp(
        overlapDuration /
        Math.max(
          1,
          geometry.settings.openDuration
        ),
        0,
        0.45
      );


    const fromProgress =
      overlapProgress;


    const remainingDuration =
      Math.max(
        1,
        geometry.settings.openDuration *
        (1 - fromProgress)
      );


    const startTime =
      performance.now();


    /*
      Render the initial overlapped frame immediately.
    */
    renderMorph(
      geometry,
      fromProgress,
      incomingPageMorphPath
    );


    const step = (
      now
    ) => {
      if (!incomingOverlapStarted) {
        return;
      }


      const raw =
        clamp(
          (
            now -
            startTime
          ) /
          remainingDuration,
          0,
          1
        );


      const progress =
        lerp(
          fromProgress,
          1,
          raw
        );


      renderMorph(
        geometry,
        progress,
        incomingPageMorphPath
      );


      if (
        progress >=
        geometry.settings.realMenuRevealAt
      ) {
        frame.style.transition =
          `opacity ${
            geometry.settings.realMenuFadeDuration
          }ms ease`;

        enforceSingleRealPage(
          name
        );

        frame.classList.add(
          "is-open"
        );
      }


      if (
        progress >=
        geometry.settings.fakeMenuFadeStart
      ) {
        const fadeRange =
          Math.max(
            0.0001,
            1 -
            geometry.settings.fakeMenuFadeStart
          );


        const fadeProgress =
          clamp(
            (
              progress -
              geometry.settings.fakeMenuFadeStart
            ) /
            fadeRange,
            0,
            1
          );


        incomingPageMorphPath.style.opacity =
          String(
            1 -
            fadeProgress
          );
      }


      if (raw < 1) {
        incomingPageAnimationFrame =
          requestAnimationFrame(
            step
          );

        return;
      }


      incomingPageAnimationFrame =
        null;

      incomingOverlapStarted =
        false;

      incomingOverlapPageName =
        null;


      /*
        A completed incoming overlap becomes the sole visible real page.
        This also cleans up any stale page that may have survived an
        unusual rapid-click sequence.
      */
      hideAllPageFrames(
        name
      );


      enforceSingleRealPage(
        name
      );

      frame.classList.add(
        "is-open"
      );

      frame.style.transition =
        "";


      /*
        Commit the incoming page BEFORE scheduling its popout. This removes
        a small race where the delayed secondary-panel callback could see
        stale page ownership during rapid interactions.
      */
      activePageName =
        name;


      /*
        If the user clicked again while this incoming page was animating,
        don't steal selection back from that newer request.
      */
      if (
        !selectedPageName ||
        selectedPageName === name
      ) {
        selectedPageName =
          name;

        setActivePageButtonState(
          name
        );
      }


      scheduleSecondaryPanelOpen(
        frame
      );


      requestAnimationFrame(() => {
        rememberStablePageRect();
      });


      clearIncomingMorphPath();


      /*
        If the outgoing return already finished, the shared SVG is now idle
        and can finally be hidden. Otherwise leave it alive until that return
        completes.
      */
      if (
        !pageFrameIsAnimating ||
        pageFrameTargetOpen
      ) {
        hideMorph();
      }

      enforceSingleRealPage(
        activePageName
      );

      pageFrameProgress =
        1;

      pageFrameIsAnimating =
        false;

      pageFrameTargetOpen =
        true;
    };


    incomingPageAnimationFrame =
      requestAnimationFrame(
        step
      );
  };


  /*
    Quick return path used ONLY when switching to a different page.

    This deliberately avoids running the complete normal page animation
    backward through:
      page -> parallelogram -> neck -> button

    Instead:
      page
        -> its own detached launch parallelogram
        -> collapses directly into its own button's bottom edge

    Once that finishes, the requested incoming page uses the existing
    normal open animation unchanged.
  */

  const getPageFinalSixPoints = (
    geometry
  ) => {
    const {
      menuRect,
      topCornerHeight,
      bottomCornerHeight,
      topCornerWidth,
      bottomCornerWidth
    } = geometry;


    return [
      {
        x:
          menuRect.left +
          topCornerWidth,

        y:
          menuRect.top
      },

      {
        x:
          menuRect.right,

        y:
          menuRect.top
      },

      {
        x:
          menuRect.right,

        y:
          menuRect.bottom -
          bottomCornerHeight
      },

      {
        x:
          menuRect.right -
          bottomCornerWidth,

        y:
          menuRect.bottom
      },

      {
        x:
          menuRect.left,

        y:
          menuRect.bottom
      },

      {
        x:
          menuRect.left,

        y:
          menuRect.top +
          topCornerHeight
      }
    ];
  };


  const getPageLaunchSixPoints = (
    geometry
  ) => {
    const launch =
      getLaunchParallelogram(
        geometry
      );


    return [
      {
        x:
          launch.topLeft,

        y:
          launch.topY
      },

      {
        x:
          launch.topRight,

        y:
          launch.topY
      },

      /*
        Duplicate future vertical-wall vertices so topology stays
        identical to the final six-point page shell.
      */
      {
        x:
          launch.topRight,

        y:
          launch.topY
      },

      {
        x:
          launch.bottomRight,

        y:
          launch.bottomY
      },

      {
        x:
          launch.bottomLeft,

        y:
          launch.bottomY
      },

      {
        x:
          launch.bottomLeft,

        y:
          launch.bottomY
      }
    ];
  };


  const getButtonReattachSixPoints = (
    geometry,
    depthRatio = 0.48
  ) => {
    const {
      topEdge,
      fullStemDepth,
      stemXAtY
    } = geometry;

    const bottomY =
      topEdge.y +
      (fullStemDepth * depthRatio);

    const bottomLeft =
      stemXAtY(
        topEdge.left,
        bottomY
      );

    const bottomRight =
      stemXAtY(
        topEdge.right,
        bottomY
      );

    return [
      { x: topEdge.left,  y: topEdge.y },
      { x: topEdge.right, y: topEdge.y },
      { x: topEdge.right, y: topEdge.y },
      { x: bottomRight,   y: bottomY },
      { x: bottomLeft,    y: bottomY },
      { x: bottomLeft,    y: bottomY }
    ];
  };


  const getButtonAbsorbSixPoints = (
    geometry
  ) => {
    const {
      topEdge
    } = geometry;

    return [
      { x: topEdge.left,  y: topEdge.y },
      { x: topEdge.right, y: topEdge.y },
      { x: topEdge.right, y: topEdge.y },
      { x: topEdge.right, y: topEdge.y },
      { x: topEdge.left,  y: topEdge.y },
      { x: topEdge.left,  y: topEdge.y }
    ];
  };


  const mixPagePoints = (
    fromPoints,
    toPoints,
    amount
  ) => {
    return fromPoints.map(
      (
        point,
        index
      ) => {
        return {
          x:
            lerp(
              point.x,
              toPoints[index].x,
              amount
            ),

          y:
            lerp(
              point.y,
              toPoints[index].y,
              amount
            )
        };
      }
    );
  };


  const pagePointsToPath = (
    points
  ) => {
    const [
      p0,
      p1,
      p2,
      p3,
      p4,
      p5
    ] = points;


    return `
      M ${p0.x} ${p0.y}
      H ${p1.x}

      L ${p2.x} ${p2.y}

      L ${p3.x} ${p3.y}

      H ${p4.x}

      L ${p5.x} ${p5.y}

      Z
    `;
  };


  const renderQuickReturnShape = (
    geometry,
    fromPoints,
    toPoints,
    amount,
    colorAmount
  ) => {
    const points =
      mixPagePoints(
        fromPoints,
        toPoints,
        amount
      );


    menuMorphPath.setAttribute(
      "d",
      pagePointsToPath(
        points
      )
    );


    /*
      As the page is absorbed into its button, drift the temporary shell
      back toward the button hover material. This helps the final handoff
      feel connected to the source control.
    */
    const fill =
      mixColor(
        geometry.settings.endFill,
        geometry.settings.startFill,
        colorAmount
      );


    const stroke =
      mixColor(
        geometry.settings.endStroke,
        geometry.settings.startStroke,
        colorAmount
      );


    menuMorphPath.style.fill =
      colorToCss(fill);


    menuMorphPath.style.stroke =
      colorToCss(stroke);


    menuMorphPath.style.strokeWidth =
      geometry.settings.strokeWidth;
  };


  const startQuickPageReturn = (
    name,
    nextPageName
  ) => {
    const frame =
      getPageFrame(name);


    closeSecondaryPanel(
      frame
    );


    if (
      !frame ||
      !iconButtonMode.matches
    ) {
      return;
    }


    queuedPageName =
      nextPageName;


    /*
      Clicking the already-open page button is a toggle-off action.
      Clear its pressed/current state immediately when the close begins,
      rather than leaving it visually selected until the reverse morph ends.
    */
    if (
      !nextPageName ||
      nextPageName === name
    ) {
      setActivePageButtonState(
        null
      );
    }


    updatePrototypePageFrameGeometry(
      frame
    );


    const geometry =
      morphEngine.getGeometry(
        getPageTargetName(name)
      );


    if (!geometry) {
      return;
    }


    pageFrameIsAnimating =
      true;

    pageFrameTargetOpen =
      false;


    animationRunId += 1;

    const runId =
      animationRunId;


    /*
      Reuse the page-switch collapse timing variable that is already in
      the newer CSS. If it is missing, fall back to a quick 380ms return.

      Because this JS is rebuilt from the last known-good sequential
      version, no overlap logic is involved at all.
    */
    const styles =
      getComputedStyle(
        siteHeader
      );


    const switchDurationRaw =
      parseCssTime(
        styles.getPropertyValue(
          "--page-switch-collapse-duration"
        ),
        380
      );


    const duration =
      Math.max(
        1,
        switchDurationRaw
      );


    const overlapDuration =
      Math.min(
        duration,
        Math.max(
          0,
          parseCssTime(
            styles.getPropertyValue(
              "--page-switch-overlap"
            ),
            0
          )
        )
      );


    const returnFadeMultiplierRaw =
      parseFloat(
        styles.getPropertyValue(
          "--page-switch-return-frame-fade-multiplier"
        )
      );

    const returnFadeMultiplier =
      Number.isFinite(returnFadeMultiplierRaw)
        ? Math.max(0.01, returnFadeMultiplierRaw)
        : 0.22;


    /*
      Three-part return:
        page -> detached parallelogram
        parallelogram -> attached short extrusion
        attached extrusion -> absorbed into button
    */
    const readReturnPercent = (
      name,
      fallback
    ) => {
      const raw =
        styles
          .getPropertyValue(name)
          .trim();

      if (!raw) {
        return fallback;
      }

      const parsed =
        parseFloat(raw);

      if (!Number.isFinite(parsed)) {
        return fallback;
      }

      return raw.endsWith("%")
        ? parsed / 100
        : parsed;
    };


    /*
      Keep the same total return speed and simply allocate more of that
      time to the page -> parallelogram transformation.
    */
    const parallelogramAt =
      clamp(
        readReturnPercent(
          "--page-switch-return-parallelogram-at",
          0.72
        ),
        0.10,
        0.90
      );

    const reattachAt =
      clamp(
        readReturnPercent(
          "--page-switch-return-reattach-at",
          0.90
        ),
        parallelogramAt + 0.02,
        0.98
      );


    /*
      Complete the dark -> page-accent color transition during the FIRST
      return phase, rather than waiting until the shape is already attached
      to the button.
    */
    const returnColorCompleteAt =
      clamp(
        readReturnPercent(
          "--page-switch-return-color-complete-at",
          0.55
        ),
        0.05,
        1
      );


    /*
      While switching pages, both buttons are pressed during the detached
      return. The outgoing button releases at the exact moment the detached
      parallelogram finishes reattaching to its home button.
    */
    let outgoingButtonReleased =
      false;


    const releaseOutgoingButton = () => {
      if (
        outgoingButtonReleased ||
        !selectedPageName
      ) {
        return;
      }


      outgoingButtonReleased =
        true;


      /*
        Keep the latest user selection active, but release ONLY this
        outgoing button with its custom softer fade.
      */
      setActivePageButtonState(
        selectedPageName,
        name
      );


      releasePageButtonState(
        name
      );
    };


    const pagePoints =
      getPageFinalSixPoints(
        geometry
      );

    const launchPoints =
      getPageLaunchSixPoints(
        geometry
      );

    const reattachPoints =
      getButtonReattachSixPoints(
        geometry,
        0.48
      );

    const absorbPoints =
      getButtonAbsorbSixPoints(
        geometry
      );


    cancelIncomingPageOverlap();


    showMorph();


    menuMorph.style.transition =
      "none";

    menuMorph.style.opacity =
      "1";


    /*
      Start with the fake shell exactly over the real page, then fade the
      real page out underneath it.
    */
    renderQuickReturnShape(
      geometry,
      pagePoints,
      pagePoints,
      0,
      0
    );


    frame.style.transition =
      `opacity ${
        Math.max(
          1,
          geometry.settings.realMenuFadeDuration *
          returnFadeMultiplier
        )
      }ms ease`;

    frame.classList.remove(
      "is-open"
    );


    const startTime =
      performance.now();


    const frameStep = (
      now
    ) => {
      if (runId !== animationRunId) {
        return;
      }


      const raw =
        clamp(
          (
            now -
            startTime
          ) /
          duration,
          0,
          1
        );


      /*
        reattachAt is the first frame where the detached parallelogram is
        gone and the remaining shape is physically part of the button.
        Release the outgoing pressed state right there.
      */
      if (
        raw >= reattachAt
      ) {
        releaseOutgoingButton();
      }


      if (raw <= parallelogramAt) {
        const localRaw =
          raw / parallelogramAt;

        const local =
          easingFromName(
            geometry.settings.reshapeEase
          )(
            clamp(localRaw, 0, 1)
          );

        /*
          Geometry and color have separate pacing here:
            geometry -> normal page-to-parallelogram easing
            color    -> reaches the page accent earlier

          This keeps the outgoing page dark at the start, but by the time
          it resolves into the detached parallelogram it has clearly become
          its own page color.
        */
        /*
          Color timing uses the OVERALL quick-return progress (`raw`), not
          the local 0..1 progress of this first geometry stage.

          The old version divided localRaw by the setting and then applied
          easeOutCubic, which front-loaded the change so heavily that even
          large values looked almost instantaneous.

          Example with the current defaults:
            returnColorCompleteAt = 55%
            parallelogramAt       = 69%

          -> dark at 0%
          -> gradually gains page color
          -> reaches full accent at 55%
          -> remains full accent through the parallelogram at 69%
        */
        const colorRaw =
          clamp(
            raw /
            returnColorCompleteAt,
            0,
            1
          );


        const colorAmount =
          easeInOutCubic(
            colorRaw
          );


        renderQuickReturnShape(
          geometry,
          pagePoints,
          launchPoints,
          local,
          colorAmount
        );
      }

      else if (raw <= reattachAt) {
        /*
          Move and shrink the detached parallelogram until it becomes a
          short extrusion physically connected to the home button.
        */
        const localRaw =
          (
            raw -
            parallelogramAt
          ) /
          (
            reattachAt -
            parallelogramAt
          );

        const local =
          easeInOutCubic(
            clamp(localRaw, 0, 1)
          );

        renderQuickReturnShape(
          geometry,
          launchPoints,
          reattachPoints,
          local,
          1
        );
      }

      else {
        /*
          Only after reattachment do we collapse the remaining extrusion
          upward into the button.
        */
        const localRaw =
          (
            raw -
            reattachAt
          ) /
          (
            1 -
            reattachAt
          );

        const local =
          easeInCubic(
            clamp(localRaw, 0, 1)
          );

        renderQuickReturnShape(
          geometry,
          reattachPoints,
          absorbPoints,
          local,
          1
        );
      }


      /*
        Start the incoming page during the final overlapDuration of this
        otherwise-unchanged outgoing return.
      */
      if (
        !incomingOverlapStarted &&
        nextPageName &&
        overlapDuration > 0 &&
        (
          (now - startTime) >=
          (duration - overlapDuration)
        )
      ) {
        startIncomingPageOverlap(
          nextPageName,
          overlapDuration
        );
      }


      pageFrameProgress =
        1 -
        raw;


      if (raw < 1) {
        animationFrame =
          requestAnimationFrame(
            frameStep
          );

        return;
      }


      animationFrame = null;


      releaseOutgoingButton();


      if (runId !== animationRunId) {
        return;
      }


      closeSecondaryPanel(
        frame
      );


      frame.classList.remove(
        "is-open"
      );

      frame.style.transition =
        "";

      frame.style.opacity =
        "";


      hideMorphIfIdle();

      morphEngine.clearActive();


      pageFrameProgress = 0;

      pageFrameIsAnimating =
        false;

      pageFrameTargetOpen =
        false;


      /*
        A newer click may have changed selectedPageName while this return
        was running. Honor the latest selection instead of blindly opening
        the page captured when the return first started.
      */
      const next =
        selectedPageName ||
        queuedPageName;


      queuedPageName =
        null;


      if (
        next &&
        next !== name
      ) {
        /*
          If overlap was disabled (0ms), preserve the exact old sequential
          behavior. If overlap has already started, simply let that
          independent incoming animation continue.
        */
        if (!incomingOverlapStarted) {
          activePageName =
            next;

          setActivePageButtonState(
            next
          );

          pageFrameProgress = 0;

          startPageOpen(
            next
          );
        }
      }

      else {
        activePageName =
          null;
        selectedPageName =
          null;

        setActivePageButtonState(
          null
        );
      }
    };


    animationFrame =
      requestAnimationFrame(
        frameStep
      );
  };


  const startPageClose = (
    name,
    nextPageName = null
  ) => {
    const frame =
      getPageFrame(name);


    closeSecondaryPanel(
      frame
    );


    if (
      !frame ||
      !iconButtonMode.matches
    ) {
      return;
    }


    queuedPageName =
      nextPageName;


    updatePrototypePageFrameGeometry(
      frame
    );


    const geometry =
      morphEngine.getGeometry(
        getPageTargetName(name)
      );


    if (!geometry) {
      return;
    }


    pageFrameIsAnimating =
      true;

    pageFrameTargetOpen =
      false;


    const from =
      pageFrameProgress;


    const to = 0;


    animationRunId += 1;

    const runId =
      animationRunId;


    const duration =
      Math.max(
        1,
        geometry.settings.closeDuration *
        Math.abs(from - to)
      );


    /*
      Bring the fake frame back at the exact current geometry so the real
      frame can crossfade into the reverse morph cleanly.
    */
    showMorph();

    renderMorph(
      geometry,
      from
    );


    menuMorph.style.transition =
      "none";

    menuMorph.style.opacity =
      "1";


    frame.style.transition =
      `opacity ${
        geometry.settings.realMenuFadeDuration
      }ms ease`;

    frame.classList.remove(
      "is-open"
    );


    animateMorph({
      from,
      to,
      duration,
      geometry,
      runId,

      onProgress: (
        progress
      ) => {
        pageFrameProgress =
          progress;
      },

      onComplete: () => {
        if (runId !== animationRunId) {
          return;
        }


        pageFrameProgress = 0;

        pageFrameIsAnimating =
          false;

        pageFrameTargetOpen =
          false;


        frame.classList.remove(
          "is-open"
        );

        frame.style.transition =
          "";


        hideMorph();

        morphEngine.clearActive();


        const next =
          queuedPageName;


        queuedPageName =
          null;


        if (
          next &&
          next !== name
        ) {
          activePageName =
            next;

          setActivePageButtonState(
            next
          );

          pageFrameProgress = 0;

          startPageOpen(
            next
          );
        }

        else {
          activePageName =
            null;

          setActivePageButtonState(
            null
          );
        }
      }
    });
  };


  const requestPage = (
    name
  ) => {
    /*
      Repair any stale real-frame state before processing a new click.
      The animation SVGs are independent; this only normalizes REAL pages.
    */
    enforceSingleRealPage(
      activePageName
    );


    if (
      !iconButtonMode.matches ||
      !pageFrames.has(name)
    ) {
      return;
    }


    /*
      No active page yet: open immediately.
    */
    if (!activePageName) {
      selectedPageName =
        name;

      setActivePageButtonState(
        name
      );


      pageFrameProgress = 0;

      startPageOpen(
        name
      );

      return;
    }


    /*
      Clicking the SAME page toggles/reverses it.
    */
    if (name === activePageName) {
      if (pageFrameIsAnimating) {
        if (pageFrameTargetOpen) {
          selectedPageName =
            null;

          setActivePageButtonState(
            null
          );


          startPageClose(
            activePageName
          );
        }

        else {
          selectedPageName =
            activePageName;

          setActivePageButtonState(
            activePageName
          );


          startPageOpen(
            activePageName
          );
        }

        return;
      }


      if (pageFrameProgress >= 1) {
        selectedPageName =
          null;

        setActivePageButtonState(
          null
        );


        startPageClose(
          activePageName
        );
      }

      else {
        selectedPageName =
          activePageName;

        setActivePageButtonState(
          activePageName
        );


        startPageOpen(
          activePageName
        );
      }


      return;
    }


    /*
      Different page:

      The button state represents the USER'S CURRENT SELECTION, not which
      page has finished animating. So select the newly-clicked button
      immediately while activePageName continues to represent the outgoing
      page until its return animation hands off to the incoming page.
    */
    selectedPageName =
      name;


    setActivePageButtonState(
      selectedPageName,
      activePageName
    );


    /*
      current page
        -> its own detached parallelogram
        -> directly absorbed into its own home button
      then:
        requested page opens normally
    */
    startQuickPageReturn(
      activePageName,
      name
    );
  };


  /* =======================================================
     Initial state
     ======================================================= */

  closeMenu({
    immediate: true
  });


  /* =======================================================
     Interactions
     ======================================================= */

  pageNames.forEach((name) => {
    const button =
      pageNavButtons.get(name);


    if (!button) {
      return;
    }


    button.addEventListener(
      "click",
      (event) => {
        /*
          Intercept the five nav buttons in both non-mobile modes.\n          Hamburger/mobile behavior remains separate.
        */
        if (!iconButtonMode.matches) {
          return;
        }


        event.preventDefault();


        requestPage(
          name
        );
      }
    );
  });



  menuToggle.addEventListener(
    "click",
    () => {
      /*
        While OPENING, another hamburger click reverses the morph from
        its current frame instead of cancelling/resetting it.
      */
      if (
        isAnimating &&
        animationTargetOpen
      ) {
        closeMenu();

        return;
      }


      /*
        While CLOSING, another click reverses back toward open from the
        current frame. Rapid alternating clicks can therefore retarget
        the same morph indefinitely without resetting its state.
      */
      if (
        isAnimating &&
        !animationTargetOpen
      ) {
        reverseClosingToOpen();

        return;
      }


      if (isAnimating) {
        return;
      }


      if (menuIsOpen) {
        closeMenu();
      }

      else {
        openMenu();
      }
    }
  );


  mobileMenu
    .querySelectorAll("a")
    .forEach((link) => {
      link.addEventListener(
        "click",
        () => {
          if (!menuInteractive) {
            return;
          }


          /*
            If the real menu is already interactive while the decorative
            opening morph is still finishing, reverse that morph from its
            current frame rather than hard-resetting it.

            The link itself still performs its normal navigation.
          */
          if (
            isAnimating &&
            animationTargetOpen
          ) {
            closeMenu();

            return;
          }


          closeMenu();
        }
      );
    });


  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key !== "Escape"
      ) {
        return;
      }


      if (
        !menuIsOpen ||
        isAnimating
      ) {
        return;
      }


      closeMenu({
        focusToggle: true
      });
    }
  );


  /* =======================================================
     Desktop reset
     ======================================================= */

  const desktopQuery =
    window.matchMedia(
      "(min-width: 841px)"
    );


  const handleDesktopChange = (
    event
  ) => {
    if (!event.matches) {
      return;
    }


    closeMenu({
      immediate: true
    });
  };


  if (
    typeof desktopQuery.addEventListener ===
    "function"
  ) {
    desktopQuery.addEventListener(
      "change",
      handleDesktopChange
    );
  }

  else if (
    typeof desktopQuery.addListener ===
    "function"
  ) {
    desktopQuery.addListener(
      handleDesktopChange
    );
  }


  const copyRect = (
    rect
  ) => {
    if (!rect) {
      return null;
    }


    return {
      left:
        rect.left,

      top:
        rect.top,

      width:
        rect.width,

      height:
        rect.height,

      right:
        rect.right,

      bottom:
        rect.bottom
    };
  };


  const rememberStablePageRect = () => {
    if (
      pageLayoutTransitionActive ||
      fullTextDesktopMode.matches !==
        lastStablePageWasDesktop ||
      !activePageName ||
      pageFrameIsAnimating ||
      pageFrameProgress < 1
    ) {
      return;
    }


    const frame =
      getPageFrame(
        activePageName
      );


    if (
      !frame ||
      !frame.classList.contains(
        "is-open"
      )
    ) {
      return;
    }


    lastStablePageRect =
      copyRect(
        frame.getBoundingClientRect()
      );
  };


  const waitForSecondaryPanelClose = async (
    frame,
    runId
  ) => {
    closeSecondaryPanel(
      frame
    );


    const animation =
      secondaryPanelAnimations.get(
        frame
      );


    if (!animation) {
      return;
    }


    try {
      await animation.finished;
    }

    catch {
      /*
        Cancellation is expected if the user crosses the breakpoint again
        before the transition finishes.
      */
    }


    if (runId !== pageLayoutTransitionRunId) {
      return;
    }
  };


  const measureNaturalPageRect = (
    frame
  ) => {
    if (!frame) {
      return null;
    }


    /*
      Temporarily release only the rectangle properties that our responsive
      transition owns, measure where CSS wants the frame RIGHT NOW, then
      restore the in-progress animated rectangle.

      These changes happen synchronously before the browser paints, so the
      user never sees the measurement state.
    */
    const saved = {
      left:
        frame.style.left,

      top:
        frame.style.top,

      right:
        frame.style.right,

      bottom:
        frame.style.bottom,

      width:
        frame.style.width,

      height:
        frame.style.height,

      transform:
        frame.style.transform,

      transformOrigin:
        frame.style.transformOrigin
    };


    frame.style.removeProperty(
      "left"
    );

    frame.style.removeProperty(
      "top"
    );

    frame.style.removeProperty(
      "right"
    );

    frame.style.removeProperty(
      "bottom"
    );

    frame.style.removeProperty(
      "width"
    );

    frame.style.removeProperty(
      "height"
    );

    frame.style.removeProperty(
      "transform"
    );

    frame.style.removeProperty(
      "transform-origin"
    );


    const rect =
      copyRect(
        frame.getBoundingClientRect()
      );


    const restore = (
      property,
      value
    ) => {
      if (value) {
        frame.style.setProperty(
          property,
          value
        );
      }

      else {
        frame.style.removeProperty(
          property
        );
      }
    };


    restore(
      "left",
      saved.left
    );

    restore(
      "top",
      saved.top
    );

    restore(
      "right",
      saved.right
    );

    restore(
      "bottom",
      saved.bottom
    );

    restore(
      "width",
      saved.width
    );

    restore(
      "height",
      saved.height
    );

    restore(
      "transform",
      saved.transform
    );

    restore(
      "transform-origin",
      saved.transformOrigin
    );


    return rect;
  };


  const animateFrameBetweenRects = async (
    frame,
    fromRect,
    initialToRect,
    runId
  ) => {
    if (
      !frame ||
      !fromRect ||
      !initialToRect
    ) {
      return;
    }


    const styles =
      getComputedStyle(
        frame
      );


    const duration =
      parseCssTime(
        styles.getPropertyValue(
          "--page-layout-transition-duration"
        ),
        480
      );


    const easingName =
      styles
        .getPropertyValue(
          "--page-layout-transition-ease"
        )
        .trim() ||
      "ease-in-out";


    const ease =
      (
        easingName === "linear" ||
        easingName === "ease-in" ||
        easingName === "ease-out" ||
        easingName === "ease-in-out"
      )
        ? easingFromName(
            easingName
          )
        : easeInOutCubic;


    frame.style.transform =
      "none";

    frame.style.transformOrigin =
      "top left";

    frame.style.right =
      "auto";

    frame.style.bottom =
      "auto";


    const startTime =
      performance.now();


    let latestTarget =
      initialToRect;


    await new Promise((resolve) => {
      const step = (
        now
      ) => {
        if (
          runId !==
          pageLayoutTransitionRunId
        ) {
          resolve();

          return;
        }


        /*
          The important bit: while the user is still dragging the browser
          edge, the responsive CSS destination keeps moving. Re-measure it
          every RAF instead of animating toward the breakpoint-era snapshot.
        */
        const naturalTarget =
          measureNaturalPageRect(
            frame
          );


        if (
          naturalTarget &&
          naturalTarget.width > 0 &&
          naturalTarget.height > 0
        ) {
          latestTarget =
            naturalTarget;
        }


        const raw =
          clamp(
            (
              now -
              startTime
            ) /
            Math.max(
              1,
              duration
            ),
            0,
            1
          );


        const t =
          ease(
            raw
          );


        const left =
          lerp(
            fromRect.left,
            latestTarget.left,
            t
          );


        const top =
          lerp(
            fromRect.top,
            latestTarget.top,
            t
          );


        const width =
          lerp(
            fromRect.width,
            latestTarget.width,
            t
          );


        const height =
          lerp(
            fromRect.height,
            latestTarget.height,
            t
          );


        frame.style.left =
          `${left}px`;

        frame.style.top =
          `${top}px`;

        frame.style.width =
          `${width}px`;

        frame.style.height =
          `${height}px`;


        updatePrototypePageFrameGeometry(
          frame
        );


        if (raw < 1) {
          requestAnimationFrame(
            step
          );

          return;
        }


        resolve();
      };


      requestAnimationFrame(
        step
      );
    });


    if (
      runId !==
      pageLayoutTransitionRunId
    ) {
      return;
    }


    /*
      Do one final live measurement at the exact handoff point. If the
      viewport moved during the last animation frame, use that newest
      rectangle rather than releasing to a slightly different CSS size.
    */
    const finalTarget =
      measureNaturalPageRect(
        frame
      ) ||
      latestTarget;


    if (finalTarget) {
      frame.style.left =
        `${finalTarget.left}px`;

      frame.style.top =
        `${finalTarget.top}px`;

      frame.style.width =
        `${finalTarget.width}px`;

      frame.style.height =
        `${finalTarget.height}px`;


      updatePrototypePageFrameGeometry(
        frame
      );


      /*
        Force the exact current endpoint into layout before releasing our
        temporary dimensions. There should now be zero geometric difference
        between the inline rectangle and the responsive CSS rectangle.
      */
      frame.getBoundingClientRect();
    }


    frame.style.removeProperty(
      "left"
    );

    frame.style.removeProperty(
      "top"
    );

    frame.style.removeProperty(
      "right"
    );

    frame.style.removeProperty(
      "bottom"
    );

    frame.style.removeProperty(
      "width"
    );

    frame.style.removeProperty(
      "height"
    );

    frame.style.removeProperty(
      "transform"
    );

    frame.style.removeProperty(
      "transform-origin"
    );


    updatePrototypePageFrameGeometry(
      frame
    );
  };


  const transitionPageLayoutMode = async (
    enteringDesktop
  ) => {
    if (
      !activePageName ||
      pageFrameIsAnimating ||
      pageFrameProgress < 1
    ) {
      closeAllSecondaryPanels();

      lastStablePageWasDesktop =
        enteringDesktop;


      requestAnimationFrame(() => {
        updateAllPrototypePageFrameGeometry();

        rememberStablePageRect();


        if (
          enteringDesktop &&
          activePageName &&
          pageFrameProgress >= 1
        ) {
          scheduleSecondaryPanelOpen(
            getPageFrame(
              activePageName
            )
          );
        }
      });

      return;
    }


    const frame =
      getPageFrame(
        activePageName
      );


    if (!frame) {
      return;
    }


    pageLayoutTransitionRunId += 1;

    const runId =
      pageLayoutTransitionRunId;


    /*
      If another handoff was already running, start from its CURRENT
      on-screen rectangle instead of snapping back to its old endpoint.
    */
    const fromRect =
      pageLayoutTransitionActive
        ? copyRect(
            frame.getBoundingClientRect()
          )
        : (
            lastStablePageRect ||
            copyRect(
              frame.getBoundingClientRect()
            )
          );


    pageLayoutTransitionActive =
      true;


    frame.classList.add(
      "is-layout-transitioning"
    );


    /*
      The media query has already switched to the NEW responsive layout.
      Measure that destination rectangle now.

      We then immediately restore the OLD rectangle with real dimensions,
      not a non-uniform scale transform. That preserves the frame angles.
    */
    updatePrototypePageFrameGeometry(
      frame
    );


    const toRect =
      measureNaturalPageRect(
        frame
      );


    if (!toRect) {
      pageLayoutTransitionActive =
        false;

      frame.classList.remove(
        "is-layout-transitioning"
      );

      return;
    }


    frame.style.right =
      "auto";

    frame.style.bottom =
      "auto";

    frame.style.left =
      `${fromRect.left}px`;

    frame.style.top =
      `${fromRect.top}px`;

    frame.style.width =
      `${fromRect.width}px`;

    frame.style.height =
      `${fromRect.height}px`;

    frame.style.transform =
      "none";


    /*
      Regenerate SVG geometry immediately at the held old rectangle so the
      frame never appears in the target shape before animation begins.
    */
    updatePrototypePageFrameGeometry(
      frame
    );


    frame.getBoundingClientRect();


    if (!enteringDesktop) {
      /*
        DESKTOP -> TABLET
        1. Hold the entire composition at desktop size.
        2. Suck the glass sidebar back into its orange seed triangle.
        3. Resize the main frame smoothly into the tablet composition.
      */
      await waitForSecondaryPanelClose(
        frame,
        runId
      );


      if (runId !== pageLayoutTransitionRunId) {
        return;
      }


      await animateFrameBetweenRects(
        frame,
        fromRect,
        toRect,
        runId
      );
    }

    else {
      /*
        TABLET -> DESKTOP
        1. Resize the main frame into the desktop composition.
        2. Once settled, grow the secondary panel from its seed triangle.
      */
      closeSecondaryPanel(
        frame
      );


      await animateFrameBetweenRects(
        frame,
        fromRect,
        toRect,
        runId
      );


      if (runId !== pageLayoutTransitionRunId) {
        return;
      }
    }


    if (runId !== pageLayoutTransitionRunId) {
      return;
    }


    frame.style.removeProperty(
      "left"
    );

    frame.style.removeProperty(
      "top"
    );

    frame.style.removeProperty(
      "right"
    );

    frame.style.removeProperty(
      "bottom"
    );

    frame.style.removeProperty(
      "width"
    );

    frame.style.removeProperty(
      "height"
    );

    frame.style.removeProperty(
      "transform"
    );

    frame.style.removeProperty(
      "transform-origin"
    );


    frame.classList.remove(
      "is-layout-transitioning"
    );


    pageLayoutTransitionActive =
      false;

    lastStablePageWasDesktop =
      enteringDesktop;


    updatePrototypePageFrameGeometry(
      frame
    );


    lastStablePageRect =
      copyRect(
        frame.getBoundingClientRect()
      );


    if (enteringDesktop) {
      scheduleSecondaryPanelOpen(
        frame
      );
    }
  };


  const handleFullTextDesktopModeChange = (
    event
  ) => {
    transitionPageLayoutMode(
      event.matches
    );
  };


  if (
    typeof fullTextDesktopMode.addEventListener ===
    "function"
  ) {
    fullTextDesktopMode.addEventListener(
      "change",
      handleFullTextDesktopModeChange
    );
  }

  else if (
    typeof fullTextDesktopMode.addListener ===
    "function"
  ) {
    fullTextDesktopMode.addListener(
      handleFullTextDesktopModeChange
    );
  }


  const handleIconModeChange = (
    event
  ) => {
    if (!event.matches) {
      resetPageFrames();
    }

    else {
      requestAnimationFrame(() => {
        updateAllPrototypePageFrameGeometry();
      });
    }
  };


  if (
    typeof iconButtonMode.addEventListener ===
    "function"
  ) {
    iconButtonMode.addEventListener(
      "change",
      handleIconModeChange
    );
  }

  else if (
    typeof iconButtonMode.addListener ===
    "function"
  ) {
    iconButtonMode.addListener(
      handleIconModeChange
    );
  }


  /* =======================================================
     Geometry / resize updates
     ======================================================= */

  requestAnimationFrame(() => {
    updateMenuShearGeometry();
    updateAllPrototypePageFrameGeometry();

    requestAnimationFrame(() => {
      rememberStablePageRect();
    });
  });


  const scheduleGeometryUpdate = () => {
    if (resizeFrame !== null) {
      cancelAnimationFrame(
        resizeFrame
      );
    }


    resizeFrame =
      requestAnimationFrame(() => {
        updateMenuShearGeometry();

        updateAllPrototypePageFrameGeometry();

        checkRealPageInvariant();

        rememberStablePageRect();


        menuMorph.setAttribute(
          "viewBox",
          `0 0 ${window.innerWidth} ${window.innerHeight}`
        );


        resizeFrame = null;
      });
  };


  window.addEventListener(
    "resize",
    scheduleGeometryUpdate
  );


  if (
    typeof ResizeObserver ===
    "function"
  ) {
    const menuResizeObserver =
      new ResizeObserver(() => {
        scheduleGeometryUpdate();
      });


    menuResizeObserver.observe(
      mobileMenu
    );
  }
});
