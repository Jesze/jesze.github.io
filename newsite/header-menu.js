document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");

  const mobileMenu =
    document.querySelector("#mobile-menu") ||
    document.querySelector(".mobile-menu");

  const siteHeader = document.querySelector(".site-header");

  if (!menuToggle) {
    console.warn(
      'Mobile menu: could not find an element with class ".menu-toggle".'
    );

    return;
  }

  if (!mobileMenu) {
    console.warn(
      'Mobile menu: could not find "#mobile-menu" or an element with class ".mobile-menu".'
    );

    return;
  }


  /* =======================================================
     Menu open / close
     ======================================================= */

  const setMenuOpen = (isOpen) => {
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

    mobileMenu.classList.toggle(
      "is-open",
      isOpen
    );
  };


  const closeMenu = () => {
    setMenuOpen(false);
  };


  /*
    Start from a known closed state.
  */
  closeMenu();


  /*
    Hamburger click
  */
  menuToggle.addEventListener("click", () => {
    const isOpen =
      menuToggle.getAttribute("aria-expanded") === "true";

    setMenuOpen(!isOpen);
  });


  /*
    Close after choosing a menu link.
  */
  mobileMenu
    .querySelectorAll("a")
    .forEach((link) => {
      link.addEventListener(
        "click",
        closeMenu
      );
    });


  /*
    Escape closes the menu.
  */
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    const isOpen =
      menuToggle.getAttribute("aria-expanded") === "true";

    if (!isOpen) {
      return;
    }

    closeMenu();

    menuToggle.focus();
  });


  /*
    If we resize back to desktop,
    make sure the mobile menu resets.
  */
  const desktopQuery =
    window.matchMedia("(min-width: 841px)");


  const handleDesktopChange = (event) => {
    if (event.matches) {
      closeMenu();
    }
  };


  if (
    typeof desktopQuery.addEventListener === "function"
  ) {
    desktopQuery.addEventListener(
      "change",
      handleDesktopChange
    );
  }

  else if (
    typeof desktopQuery.addListener === "function"
  ) {
    /*
      Older Safari fallback.
    */
    desktopQuery.addListener(
      handleDesktopChange
    );
  }


  /* =======================================================
     Shared shear geometry
     ======================================================= */

  /*
    CSS owns the master angle:

      --button-shear-angle: -40deg;

    JavaScript reads that value and converts it into the
    horizontal distance required for each SVG diagonal.

    The important change here is that the SVG viewBoxes are now
    rebuilt using their ACTUAL rendered dimensions.

    That means:
    - the menu can get shorter
    - the corners keep their visual size
    - the diagonal angle stays correct
    - the buttons stay geometrically consistent
  */

  const updateMenuShearGeometry = () => {
    if (!siteHeader) {
      return;
    }


    /* -------------------------------------------------------
       Read the master angle from CSS
       ------------------------------------------------------- */

    const styles =
      getComputedStyle(siteHeader);

    const angleValue =
      styles
        .getPropertyValue("--button-shear-angle")
        .trim();

    let angleDegrees =
      Math.abs(parseFloat(angleValue));


    /*
      Safety fallback.
    */
    if (!Number.isFinite(angleDegrees)) {
      angleDegrees = 40;
    }


    /*
      Keep tan() away from extreme values.
    */
    angleDegrees =
      Math.min(
        80,
        Math.max(5, angleDegrees)
      );


    const angleRadians =
      angleDegrees * Math.PI / 180;

    const slope =
      Math.tan(angleRadians);


    /* =====================================================
       Outer mobile-menu shell
       ===================================================== */

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
        /*
          Make one SVG unit equal one actual CSS pixel.

          This prevents the corners from stretching vertically
          when the menu height changes.
        */
        shellSvg.setAttribute(
          "viewBox",
          `0 0 ${width} ${height}`
        );


        /* -------------------------------
           Outer frame
           ------------------------------- */

        const outerInset = 1;


        /*
          These are the visual corner depths in pixels.

          They stay roughly fixed even when the entire menu gets
          shorter.

          The Math.min() safeguard only starts shrinking them if
          the menu becomes extremely short.
        */
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
          topCornerHeight * slope;

        const bottomCornerWidth =
          bottomCornerHeight * slope;


        outerPath.setAttribute(
          "d",
          `
            M ${
              outerInset
              + topCornerWidth
            } ${outerInset}

            H ${
              width
              - outerInset
            }

            V ${
              height
              - outerInset
              - bottomCornerHeight
            }

            L ${
              width
              - outerInset
              - bottomCornerWidth
            } ${
              height
              - outerInset
            }

            H ${outerInset}

            V ${
              outerInset
              + topCornerHeight
            }

            Z
          `
        );


        /* -------------------------------
           Inner frame
           ------------------------------- */

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
          innerTopCornerHeight * slope;

        const innerBottomCornerWidth =
          innerBottomCornerHeight * slope;


        innerPath.setAttribute(
          "d",
          `
            M ${
              innerInset
              + innerTopCornerWidth
            } ${innerInset}

            H ${
              width
              - innerInset
            }

            V ${
              height
              - innerInset
              - innerBottomCornerHeight
            }

            L ${
              width
              - innerInset
              - innerBottomCornerWidth
            } ${
              height
              - innerInset
            }

            H ${innerInset}

            V ${
              innerInset
              + innerTopCornerHeight
            }

            Z
          `
        );


        /* -------------------------------
           Orange bottom-right accent
           ------------------------------- */

        const cornerAccent =
          mobileMenu.querySelector(
            ".mobile-menu-shell-accent--corner"
          );


        if (cornerAccent) {
          cornerAccent.setAttribute(
            "d",
            `
              M ${
                width
                - innerInset
                - innerBottomCornerWidth
              } ${
                height
                - innerInset
              }

              L ${
                width
                - innerInset
              } ${
                height
                - innerInset
                - innerBottomCornerHeight
              }
            `
          );
        }


        /* -------------------------------
           Orange top accent
           ------------------------------- */

        const topAccent =
          mobileMenu.querySelector(
            ".mobile-menu-shell-accent--top"
          );


        if (topAccent) {
          const accentStart =
            innerInset
            + innerTopCornerWidth
            + 6;


          const accentEnd =
            Math.min(
              accentStart + 97,
              width
              - innerInset
              - 20
            );


          topAccent.setAttribute(
            "d",
            `
              M ${
                accentStart
              } ${
                innerInset
              }

              H ${
                accentEnd
              }
            `
          );
        }


        /* -------------------------------
           Orange bottom accent
           ------------------------------- */

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
              M ${
                innerInset
              } ${
                height
                - innerInset
              }

              H ${
                accentEnd
              }
            `
          );
        }
      }
    }


    /* =====================================================
       Individual dropdown button plates
       ===================================================== */

    /*
      Each button SVG also gets a viewBox based on its actual
      rendered size.

      So when the menu becomes shorter and the flex layout makes
      the buttons shorter, their corner cuts do NOT get squashed.
    */

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


      /*
        Again:
        one SVG unit = one rendered CSS pixel.
      */
      svg.setAttribute(
        "viewBox",
        `0 0 ${width} ${height}`
      );


      const inset = 1;


      /*
        Keep these visually stable.

        They only start shrinking if the button itself gets so
        short that the fixed corner depth would no longer fit.
      */
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
        topCornerHeight * slope;

      const bottomCornerWidth =
        bottomCornerHeight * slope;


      path.setAttribute(
        "d",
        `
          M ${
            inset
            + topCornerWidth
          } ${inset}

          H ${
            width
            - inset
          }

          V ${
            height
            - inset
            - bottomCornerHeight
          }

          L ${
            width
            - inset
            - bottomCornerWidth
          } ${
            height
            - inset
          }

          H ${inset}

          V ${
            inset
            + topCornerHeight
          }

          Z
        `
      );
    });
  };


  /* =======================================================
     Initial geometry build
     ======================================================= */

  /*
    requestAnimationFrame gives the browser one layout pass first,
    so getBoundingClientRect() sees the final CSS sizes.
  */
  requestAnimationFrame(() => {
    updateMenuShearGeometry();
  });


  /* =======================================================
     Resize updates
     ======================================================= */

  /*
    Recalculate whenever the window changes size.

    requestAnimationFrame prevents the geometry function from
    firing dozens of times inside a single render frame.
  */

  let resizeFrame = null;


  window.addEventListener("resize", () => {
    if (resizeFrame !== null) {
      cancelAnimationFrame(
        resizeFrame
      );
    }


    resizeFrame =
      requestAnimationFrame(() => {
        updateMenuShearGeometry();

        resizeFrame = null;
      });
  });


  /* =======================================================
     Watch the menu itself for size changes
     ======================================================= */

  /*
    This is useful because --mobile-menu-height-scale can change
    the menu's dimensions without necessarily requiring a browser
    window resize.

    It also makes this more robust if we later animate or otherwise
    alter the menu size.
  */

  if (
    typeof ResizeObserver === "function"
  ) {
    const menuResizeObserver =
      new ResizeObserver(() => {
        if (resizeFrame !== null) {
          cancelAnimationFrame(
            resizeFrame
          );
        }


        resizeFrame =
          requestAnimationFrame(() => {
            updateMenuShearGeometry();

            resizeFrame = null;
          });
      });


    menuResizeObserver.observe(
      mobileMenu
    );
  }
});