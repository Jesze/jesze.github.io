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
      zIndex: "-1"
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


  headerContent.appendChild(
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
    Allows the real menu to begin fading in during the last part of the
    morph instead of waiting for the temporary shape to finish first.
  */
  let menuRevealStarted = false;


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


    /*
      These animation timing variables are optional.

      If you later want to expose them in CSS, you can add:

        --menu-morph-duration: 950ms;
        --menu-morph-close-duration: 800ms;

      Without them, these fallback values are used.
    */
    return {
      slope:
        Math.tan(angleRadians),

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
        Shorter extrusion before the menu begins forming.
        Was 3x button height; now 1.5x.
      */
      extensionMultiplier: 1.5,

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


    const parentRect =
      offsetParent.getBoundingClientRect();


    const left =
      parentRect.left +
      mobileMenu.offsetLeft;


    const top =
      parentRect.top +
      mobileMenu.offsetTop;


    const width =
      mobileMenu.offsetWidth;


    const height =
      mobileMenu.offsetHeight;


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


    /*
      Stage 1 — 0% to 13%
      Fast neck extension.
    */
    if (progress <= 0.13) {
      const localProgress =
        easeOutCubic(
          progress / 0.13
        );


      path =
        buildExtendPath(
          geometry,
          localProgress
        );
    }


    /*
      Stage 2 — 13% to 27%
      Slow the parallelogram-growth phase down a little more.

      The geometry/easing is unchanged; it simply gets more time.
    */
    else if (progress <= 0.27) {
      const localProgress =
        easeInOutCubic(
          (
            progress -
            0.13
          ) /
          0.14
        );


      path =
        buildUnfoldPath(
          geometry,
          localProgress
        );
    }


    /*
      Stage 3 — 27% to 100%
      Parallelogram -> final menu.

      Keep the newer easeOutCubic() behavior so the reshape begins
      immediately without the old visual pause.
    */
    else {
      const localProgress =
        easeOutCubic(
          (
            progress -
            0.27
          ) /
          0.73
        );


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
    onProgress,
    onComplete
  }) => {
    const startTime =
      performance.now();


    const frame = (now) => {
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

    menuRevealStarted = false;

    clearIconTimer();


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
      }, geometry.settings.openDuration * 0.23);


    animateMorph({
      from: 0,
      to: 1,

      duration:
        geometry.settings.openDuration,

      geometry,

      /*
        Begin revealing the real menu during the final 20% of the morph.
        This overlaps the two more strongly and makes the hand-off feel immediate.
      */
      onProgress: (
        progress
      ) => {
        if (
          !menuRevealStarted &&
          progress >= 0.80
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
            "opacity 150ms ease";

          mobileMenu.classList.add(
            "is-open"
          );
        }
      },

      onComplete: () => {
        clearIconTimer();

        setExpandedState(true);


        /*
          The real menu is already fading in by this point, so now only
          fade away the temporary morph surface.
        */
        menuMorph.style.transition =
          "opacity 80ms ease";

        menuMorph.style.opacity =
          "0";


        window.setTimeout(() => {
          hideMorph();

          /*
            Hand control back to the stylesheet now that the two shells
            are no longer overlapping.
          */
          mobileMenu.style.transition =
            "";

          menuIsOpen = true;
          isAnimating = false;
        }, 90);
      }
    });
  };


  /* =======================================================
     Close
     ======================================================= */

  const closeMenu = ({
    focusToggle = false,
    immediate = false
  } = {}) => {
    clearIconTimer();


    if (immediate) {
      if (animationFrame !== null) {
        cancelAnimationFrame(
          animationFrame
        );


        animationFrame = null;
      }


      menuIsOpen = false;
      isAnimating = false;


      mobileMenu.classList.remove(
        "is-open"
      );

      mobileMenu.style.transition =
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


    iconTimer =
      window.setTimeout(() => {
        setExpandedState(false);

        iconTimer = null;
      }, geometry.settings.closeDuration * 0.78);


    animateMorph({
      from: 1,
      to: 0,

      duration:
        geometry.settings.closeDuration,

      geometry,

      onComplete: () => {
        clearIconTimer();

        setExpandedState(false);


        hideMorph();


        menuIsOpen = false;
        isAnimating = false;


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
