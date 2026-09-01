document.addEventListener("DOMContentLoaded", () => {
  const menuToggle =
    document.querySelector(".menu-toggle");

  const mobileMenu =
    document.querySelector("#mobile-menu") ||
    document.querySelector(".mobile-menu");

  const siteHeader =
    document.querySelector(".site-header");

  const headerContent =
    document.querySelector(".header-content");


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
      zIndex: "999"
    }
  );


  Object.assign(
    menuMorphPath.style,
    {
      vectorEffect: "non-scaling-stroke",
      strokeLinejoin: "miter"
    }
  );


  menuMorph.appendChild(
    menuMorphPath
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

  const getHamburgerBottomEdge = (
    buttonRect,
    slope
  ) => {
    const pseudoStyles =
      getComputedStyle(
        menuToggle,
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
  const getFinalMenuRect = () => {
    const offsetParent =
      mobileMenu.offsetParent;


    if (!offsetParent) {
      return mobileMenu.getBoundingClientRect();
    }


    /*
      offset* values are pre-transform layout coordinates.
      getBoundingClientRect() is post-transform screen coordinates.

      Below 485px the complete header is uniformly scaled, so convert
      the menu's layout offsets and size by the offset parent's rendered
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
      mobileMenu.offsetLeft *
      scaleX;


    const top =
      parentRect.top +
      mobileMenu.offsetTop *
      scaleY;


    const width =
      mobileMenu.offsetWidth *
      scaleX;


    const height =
      mobileMenu.offsetHeight *
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


  const getMorphGeometry = () => {
    const settings =
      getSettings();


    const buttonRect =
      menuToggle.getBoundingClientRect();

    /*
      Target the menu's untransformed OPEN layout box, not its
      closed-state translated/scaled visual rectangle.
    */
    const menuRect =
      getFinalMenuRect();


    if (
      buttonRect.width <= 0 ||
      buttonRect.height <= 0 ||
      menuRect.width <= 0 ||
      menuRect.height <= 0
    ) {
      return null;
    }


    const topEdge =
      getHamburgerBottomEdge(
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


    /*
      Exact centre of the END of the extrusion.
    */
    const stemEndCenterX =
      (
        stemBottomLeft +
        stemBottomRight
      ) / 2;


    const stemWidth =
      stemBottomRight -
      stemBottomLeft;


    /*
      Grow the temporary parallelogram around that exact point.
    */
    const targetWidth =
      menuRect.width *
      0.86;


    const bodyWidth =
      lerp(
        stemWidth,
        targetWidth,
        progress
      );


    const targetDepth =
      Math.max(
        1,
        (menuRect.bottom - fullStemBottomY) *
        0.64
      );


    const bodyDepth =
      targetDepth *
      progress;


    const bodyTopY =
      fullStemBottomY;


    const bodyBottomY =
      bodyTopY +
      bodyDepth;


    const bodyTopLeft =
      stemEndCenterX -
      bodyWidth / 2;


    const bodyTopRight =
      stemEndCenterX +
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


    /*
      This exactly matches the END of Stage 2.
    */
    const startWidth =
      menuRect.width *
      0.86;


    const startDepth =
      Math.max(
        1,
        (menuRect.bottom - fullStemBottomY) *
        0.64
      );


    const startTopY =
      fullStemBottomY;


    const startBottomY =
      startTopY +
      startDepth;


    const startTopLeft =
      stemEndCenterX -
      startWidth / 2;


    const startTopRight =
      stemEndCenterX +
      startWidth / 2;


    const startShear =
      startDepth *
      settings.slope;


    const startBottomLeft =
      startTopLeft -
      startShear;


    const startBottomRight =
      startTopRight -
      startShear;


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


  /* =======================================================
     Render animation
     ======================================================= */

  const renderMorph = (
    geometry,
    progress
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


      path =
        buildFormPath(
          geometry,
          localProgress
        );
    }


    menuMorphPath.setAttribute(
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


    menuMorphPath.style.fill =
      colorToCss(fill);


    menuMorphPath.style.stroke =
      colorToCss(stroke);


    menuMorphPath.style.strokeWidth =
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
      getMorphGeometry();


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
      getMorphGeometry();


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
      getMorphGeometry();


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
      getMorphGeometry();


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
     Initial state
     ======================================================= */

  closeMenu({
    immediate: true
  });


  /* =======================================================
     Interactions
     ======================================================= */

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


  /* =======================================================
     Geometry / resize updates
     ======================================================= */

  requestAnimationFrame(() => {
    updateMenuShearGeometry();
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
