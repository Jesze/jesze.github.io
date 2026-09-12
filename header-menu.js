/*
  Simulacrum Interactive header morph system

  Refactor stage 1:
  The existing hamburger animation now runs through a reusable morph
  target registry/controller. Visual behavior and timing are intentionally
  unchanged. Future nav buttons/page frames can register additional
  targets instead of duplicating this animation code.
*/

document.addEventListener("DOMContentLoaded", () => {
  /* =======================================================
     Startup critical-asset preloader
     =======================================================

     Deliberately NOT a "download the whole website before showing it"
     loader. We only block on the artwork that makes the site shell and the
     first state of each game feel complete:

       - viewport + banner frame artwork
       - Simulacrum logo / nav icons
       - all three reusable game-frame skins
       - game logos
       - all local screenshots for Brobots, Etherian, and Halodoom

     Videos and externally hosted imagery are still allowed to load normally
     in the background.

     Failed files still count as complete and there is a hard timeout, so a
     weak cellular connection can never trap the visitor on this screen.
  */
  const sitePreloader =
    document.querySelector(
      "#site-preloader"
    );


  const sitePreloaderFill =
    sitePreloader?.querySelector(
      ".site-preloader-fill"
    );


  const sitePreloaderStatus =
    sitePreloader?.querySelector(
      ".site-preloader-status"
    );


  const sitePreloaderPercent =
    sitePreloader?.querySelector(
      ".site-preloader-percent"
    );


  let resolveSitePreloaderReady;


  const sitePreloaderReady =
    new Promise(
      (resolve) => {
        resolveSitePreloaderReady =
          resolve;
      }
    );


  const criticalImageSources = [
    /* Viewport border */
    "assets/header/border-stretch.webp",
    "assets/header/border-topleft.webp",
    "assets/header/border-top.webp",
    "assets/header/border-topright.webp",
    "assets/header/border-centerleft.webp",
    "assets/header/border-centerright.webp",
    "assets/header/border-bottomleft.webp",
    "assets/header/border-bottom.webp",
    "assets/header/border-bottomright.webp",

    /* Header banner */
    "assets/header/banner-left.webp",
    "assets/header/banner-leftstretch.webp",
    "assets/header/banner-center.webp",
    "assets/header/banner-rightstretch.webp",
    "assets/header/banner-right.webp",

    /* Header identity / navigation */
    "assets/header/simulacrum-logo.png",
    "assets/header/simulacrum-icon.png",
    "assets/header/brobots-icon.png",
    "assets/header/etherian-icon.png",
    "assets/header/halodoom-icon.png",
    "assets/header/mail-icon.png",

    /* Brobots frame + first media */
    "assets/brobots/frame/top-left.webp",
    "assets/brobots/frame/top-right.webp",
    "assets/brobots/frame/bottom-left.webp",
    "assets/brobots/frame/bottom-right.webp",
    "assets/brobots/frame/thumb-top-left.webp",
    "assets/brobots/frame/thumb-top-right.webp",
    "assets/brobots/frame/thumb-bottom-left.webp",
    "assets/brobots/frame/thumb-bottom-right.webp",
    "assets/brobots/brobots-logo.png",
    "assets/brobots/brobots-info-background.jpg",

    /* Etherian frame + first media */
    "assets/etherian/frame/top-left.webp",
    "assets/etherian/frame/top-right.webp",
    "assets/etherian/frame/bottom-left.webp",
    "assets/etherian/frame/bottom-right.webp",
    "assets/etherian/frame/thumb-top-left.webp",
    "assets/etherian/frame/thumb-top-right.webp",
    "assets/etherian/frame/thumb-bottom-left.webp",
    "assets/etherian/frame/thumb-bottom-right.webp",
    "assets/etherian/etherian-logo.png",
    "assets/etherian/etherian-info-background.jpg",

    /* Halodoom frame + first media */
    "assets/halodoom/frame/top-left.webp",
    "assets/halodoom/frame/top-right.webp",
    "assets/halodoom/frame/bottom-left.webp",
    "assets/halodoom/frame/bottom-right.webp",
    "assets/halodoom/frame/thumb-top-left.webp",
    "assets/halodoom/frame/thumb-top-right.webp",
    "assets/halodoom/frame/thumb-bottom-left.webp",
    "assets/halodoom/frame/thumb-bottom-right.webp",
    "assets/halodoom/halodoom-logo.png",
    "assets/halodoom/halodoom-info-background.jpg",

    /* Full screenshot galleries */
    "assets/brobots/brobots-screenshot-0.jpg",
    "assets/brobots/brobots-screenshot-1.jpg",
    "assets/brobots/brobots-screenshot-2.jpg",
    "assets/brobots/brobots-screenshot-3.jpg",
    "assets/brobots/brobots-screenshot-4.jpg",
    "assets/brobots/brobots-screenshot-5.jpg",
    "assets/etherian/etherian-screenshot-0.jpg",
    "assets/etherian/etherian-screenshot-1.jpg",
    "assets/etherian/etherian-screenshot-2.jpg",
    "assets/etherian/etherian-screenshot-3.jpg",
    "assets/etherian/etherian-screenshot-4.jpg",
    "assets/etherian/etherian-screenshot-5.jpg",
    "assets/etherian/etherian-screenshot-6.jpg",
    "assets/etherian/etherian-screenshot-7.jpg",
    "assets/etherian/etherian-screenshot-8.jpg",
    "assets/halodoom/halodoom-screenshot-0.jpg",
    "assets/halodoom/halodoom-screenshot-1.jpg",
    "assets/halodoom/halodoom-screenshot-2.jpg",
    "assets/halodoom/halodoom-screenshot-3.jpg",
    "assets/halodoom/halodoom-screenshot-4.jpg",
    "assets/halodoom/halodoom-screenshot-5.jpg",
    "assets/halodoom/halodoom-screenshot-6.jpg",
    "assets/halodoom/halodoom-screenshot-7.jpg",
    "assets/halodoom/halodoom-screenshot-8.jpg",
    "assets/halodoom/halodoom-screenshot-9.jpg",
    "assets/halodoom/halodoom-screenshot-10.jpg",
    "assets/halodoom/halodoom-screenshot-11.jpg",
    "assets/halodoom/halodoom-screenshot-12.jpg",
    "assets/halodoom/halodoom-screenshot-13.jpg"
  ];


  const preloadCriticalImage =
    (src) => {
      return new Promise(
        (resolve) => {
          const image =
            new Image();


          let settled =
            false;


          const finish =
            () => {
              if (settled) {
                return;
              }


              settled =
                true;


              resolve();
            };


          const finishAfterDecode =
            async () => {
              /*
                onload means the bytes are available, but the first onscreen
                use can still hitch while the browser decodes them.

                Ask for decode now, underneath the loading screen. A decode
                failure is harmless here; the ordinary image element can
                still make its own attempt later.
              */
              if (
                typeof image.decode ===
                  "function"
              ) {
                try {
                  await image.decode();
                }

                catch (error) {
                  /* Continue; loading must never be blocked by decode(). */
                }
              }


              finish();
            };


          image.onload =
            finishAfterDecode;

          image.onerror =
            finish;

          image.decoding =
            "async";

          image.src =
            src;


          if (image.complete) {
            if (
              image.naturalWidth > 0
            ) {
              finishAfterDecode();
            }

            else {
              finish();
            }
          }
        }
      );
    };


  const prewarmSiteAnimationLayers =
    async () => {
      /*
        This deliberately does NOT play any real site transition.

        It only gives the browser a chance to:
          - finish font setup
          - calculate the important animation geometry once
          - create compositor-ready transform/opacity layers
          - paint those layers for a couple of frames

        No page classes, navigation state, timers, or morph controllers are
        touched, so the real first About transition still starts from the
        normal pristine state.
      */
      if (
        document.fonts?.ready
      ) {
        try {
          await document.fonts.ready;
        }

        catch (error) {
          /* Font readiness is an optimization only. */
        }
      }


      const prewarmElements =
        Array.from(
          document.querySelectorAll(
            [
              ".site-header",
              ".viewport-frame",
              ".site-background",
              ".prototype-page-frame",
              ".game-frame-area",
              ".simple-glass-page",
              ".desktop-secondary-panel",
              ".media-viewer",
              ".viewport-frame-piece--left-center",
              ".viewport-frame-piece--right-center"
            ].join(",")
          )
        );


      const previousWillChange =
        prewarmElements.map(
          (element) => {
            return [
              element,
              element.style.willChange
            ];
          }
        );


      prewarmElements.forEach(
        (element) => {
          element.style.willChange =
            "transform, opacity";
        }
      );


      /*
        Force one geometry read while the loader is still covering the site.
        This warms layout/style calculation without changing any state.
      */
      prewarmElements.forEach(
        (element) => {
          element.getBoundingClientRect();
        }
      );


      await new Promise(
        (resolve) => {
          requestAnimationFrame(
            () => {
              requestAnimationFrame(
                resolve
              );
            }
          );
        }
      );


      previousWillChange.forEach(
        (
          [
            element,
            previousValue
          ]
        ) => {
          element.style.willChange =
            previousValue;
        }
      );
    };


  const updateSitePreloader =
    (
      completed,
      total
    ) => {
      const progress =
        total > 0
          ? completed / total
          : 1;

      const percent =
        Math.round(
          progress * 100
        );


      if (sitePreloaderFill) {
        sitePreloaderFill.style.setProperty(
          "--site-preloader-progress",
          `${percent}%`
        );
      }


      if (sitePreloaderPercent) {
        sitePreloaderPercent.textContent =
          `${percent}%`;
      }


      if (
        sitePreloaderStatus &&
        percent >= 100
      ) {
        sitePreloaderStatus.textContent =
          "Preparing interface";
      }
    };


  const dismissSitePreloader =
    () => {
      if (!sitePreloader) {
        return;
      }


      updateSitePreloader(
        criticalImageSources.length,
        criticalImageSources.length
      );


      if (sitePreloaderStatus) {
        sitePreloaderStatus.textContent =
          "Ready";
      }


      sitePreloader.classList.add(
        "is-preloader-leaving"
      );


      window.setTimeout(
        () => {
          sitePreloader.remove();


          resolveSitePreloaderReady?.();
        },
        520
      );
    };


  if (sitePreloader) {
    let completedCriticalImages =
      0;

    let preloaderDismissed =
      false;


    const dismissOnce =
      () => {
        if (preloaderDismissed) {
          return;
        }


        preloaderDismissed =
          true;


        dismissSitePreloader();
      };


    updateSitePreloader(
      0,
      criticalImageSources.length
    );


    const preloadJobs =
      criticalImageSources.map(
        async (src) => {
          await preloadCriticalImage(
            src
          );


          completedCriticalImages +=
            1;


          updateSitePreloader(
            completedCriticalImages,
            criticalImageSources.length
          );
        }
      );


    Promise
      .all(preloadJobs)
      .then(
        async () => {
          /*
            The files are loaded and decoded. Use the remaining covered time
            for a conservative animation/font/compositor prewarm before the
            first real About transition is allowed to begin.
          */
          await prewarmSiteAnimationLayers();


          /*
            One small covered paint at 100% feels cleaner than removing the
            loader on the same task-completion tick.
          */
          requestAnimationFrame(
            () => {
              window.setTimeout(
                dismissOnce,
                120
              );
            }
          );
        }
      );


    /*
      Absolute failsafe for slow/broken mobile connections. The cache warming
      continues after this; only the blocking overlay is released.
    */
    window.setTimeout(
      dismissOnce,
      5500
    );
  }

  else {
    resolveSitePreloaderReady?.();
  }


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


  const isGamePageMorph = (
    geometry
  ) => {
    return (
      geometry?.target?.shapeType ===
      "game-page"
    );
  };


  const getGameFinalEightPoints = (
    geometry
  ) => {
    const {
      settings,
      menuRect,
      topCornerHeight,
      bottomCornerHeight
    } = geometry;


    /*
      The hidden Simulacrum page frame is still the structural target for
      layout / breakpoint handoff, but the VISIBLE Brobots page now lives
      inside .prototype-page-frame-content.

      Aim the morph at that real visible box instead of the larger hidden
      shell. This lets the raster frame return to its safer pre-v38 size
      without leaving the opening animation oversized.
    */
    const targetElement =
      geometry?.target
        ?.getTargetElement?.();


    const visibleFrameElement =
      targetElement
        ?.querySelector(
          ".prototype-page-frame-content"
        );


    const measuredVisibleRect =
      visibleFrameElement
        ?.getBoundingClientRect();


    const targetRect =
      (
        measuredVisibleRect &&
        measuredVisibleRect.width > 0 &&
        measuredVisibleRect.height > 0
      )
        ? measuredVisibleRect
        : menuRect;


    /*
      Keep the enlarged Brobots chamfers from v38. Their HORIZONTAL run is
      still derived only from vertical rise × the site's master slope.
    */
    const topRise =
      Math.min(
        targetRect.height * 0.30,
        topCornerHeight * 2.75
      );


    const bottomRise =
      Math.min(
        targetRect.height * 0.30,
        bottomCornerHeight * 2.75
      );


    const topRun =
      topRise *
      settings.slope;


    const bottomRun =
      bottomRise *
      settings.slope;


    return [
      {
        x: targetRect.left + topRun,
        y: targetRect.top
      },

      {
        x: targetRect.right - topRun,
        y: targetRect.top
      },

      {
        x: targetRect.right,
        y: targetRect.top + topRise
      },

      {
        x: targetRect.right,
        y: targetRect.bottom - bottomRise
      },

      {
        x: targetRect.right - bottomRun,
        y: targetRect.bottom
      },

      {
        x: targetRect.left + bottomRun,
        y: targetRect.bottom
      },

      {
        x: targetRect.left,
        y: targetRect.bottom - bottomRise
      },

      {
        x: targetRect.left,
        y: targetRect.top + topRise
      }
    ];
  };


  const getGameLaunchEightPoints = (
    geometry
  ) => {
    const launch =
      getLaunchParallelogram(
        geometry
      );


    return [
      { x: launch.topLeft,     y: launch.topY },
      { x: launch.topRight,    y: launch.topY },
      { x: launch.topRight,    y: launch.topY },
      { x: launch.topRight,    y: launch.topY },
      { x: launch.bottomRight, y: launch.bottomY },
      { x: launch.bottomLeft,  y: launch.bottomY },
      { x: launch.bottomLeft,  y: launch.bottomY },
      { x: launch.bottomLeft,  y: launch.bottomY }
    ];
  };


  const getGameButtonReattachEightPoints = (
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
      (
        fullStemDepth *
        depthRatio
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


    return [
      { x: topEdge.left,  y: topEdge.y },
      { x: topEdge.right, y: topEdge.y },
      { x: topEdge.right, y: topEdge.y },
      { x: topEdge.right, y: topEdge.y },
      { x: bottomRight,   y: bottomY },
      { x: bottomLeft,    y: bottomY },
      { x: bottomLeft,    y: bottomY },
      { x: bottomLeft,    y: bottomY }
    ];
  };


  const getGameButtonAbsorbEightPoints = (
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
      { x: topEdge.right, y: topEdge.y },
      { x: topEdge.left,  y: topEdge.y },
      { x: topEdge.left,  y: topEdge.y },
      { x: topEdge.left,  y: topEdge.y }
    ];
  };


  const gameEightPointsToPath = (
    points
  ) => {
    return `
      M ${points[0].x} ${points[0].y}
      L ${points[1].x} ${points[1].y}
      L ${points[2].x} ${points[2].y}
      L ${points[3].x} ${points[3].y}
      L ${points[4].x} ${points[4].y}
      L ${points[5].x} ${points[5].y}
      L ${points[6].x} ${points[6].y}
      L ${points[7].x} ${points[7].y}
      Z
    `;
  };


  const buildGameFormPath = (
    geometry,
    progress
  ) => {
    const startPoints =
      getGameLaunchEightPoints(
        geometry
      );


    const finalPoints =
      getGameFinalEightPoints(
        geometry
      );


    const t =
      easeInOutCubic(
        progress
      );


    const points =
      startPoints.map(
        (
          point,
          index
        ) => {
          return {
            x:
              lerp(
                point.x,
                finalPoints[index].x,
                t
              ),

            y:
              lerp(
                point.y,
                finalPoints[index].y,
                t
              )
          };
        }
      );


    return gameEightPointsToPath(
      points
    );
  };




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


  /* =======================================================
     Site background video
     ======================================================= */

  /*
    Background selection intentionally follows selectedPageName:
      selectedPageName = immediate user intent
      activePageName   = page currently committed/animating

    That means the background begins changing on the SAME state change as
    the nav selection, rather than waiting for the page morph to finish.
    Rapid retargeting therefore uses the same source of truth as the page
    controller instead of introducing a second page-state machine.
  */
  const defaultBackgroundVideoSrc =
    "assets/simulacrum-loop.mp4";


  const pageBackgroundVideoSources =
    new Map([
      [
        "brobots",
        "assets/brobots/brobots-loop.mp4"
      ],
      [
        "etherian",
        "assets/etherian/etherian-loop.mp4"
      ],
      [
        "halodoom",
        "assets/halodoom/halodoom-loop.mp4"
      ]
    ]);


  const backgroundVideoBuffers =
    Array.from(
      document.querySelectorAll(
        ".site-background-video"
      )
    );


  /*
    Establish Safari-safe media state before the first play() call.
  */
  backgroundVideoBuffers.forEach(
    (video) => {
      video.defaultMuted = true;
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";

      video.setAttribute(
        "muted",
        ""
      );

      video.setAttribute(
        "autoplay",
        ""
      );

      video.setAttribute(
        "playsinline",
        ""
      );

      video.setAttribute(
        "webkit-playsinline",
        ""
      );
    }
  );


  let activeBackgroundVideo =
    backgroundVideoBuffers.find(
      (video) =>
        video.classList.contains(
          "is-background-active"
        )
    ) ||
    backgroundVideoBuffers[0] ||
    null;


  let backgroundVideoRunId = 0;
  let requestedBackgroundVideoSrc =
    defaultBackgroundVideoSrc;


  const getBackgroundVideoSrc = (
    pageName
  ) => {
    return (
      pageBackgroundVideoSources.get(
        pageName
      ) ||
      defaultBackgroundVideoSrc
    );
  };


  const getBackgroundCrossfadeDuration = () => {
    const styles =
      getComputedStyle(
        document.documentElement
      );


    return parseCssTime(
      styles.getPropertyValue(
        "--background-video-crossfade-duration"
      ),
      700
    );
  };


  const safelyPlayBackgroundVideo = (
    video
  ) => {
    if (!video) {
      return;
    }


    /*
      iOS Safari is stricter than desktop browsers about the exact muted /
      inline state that exists BEFORE play() is requested. Keep both the
      properties and HTML attributes synchronized.

      defaultMuted is particularly important here: it tells WebKit this media
      is intrinsically muted rather than something JS muted only after load.
    */
    video.defaultMuted = true;
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";

    video.setAttribute(
      "muted",
      ""
    );

    video.setAttribute(
      "autoplay",
      ""
    );

    video.setAttribute(
      "playsinline",
      ""
    );

    video.setAttribute(
      "webkit-playsinline",
      ""
    );


    const playPromise =
      video.play();


    if (
      playPromise &&
      typeof playPromise.then ===
        "function"
    ) {
      playPromise
        .then(() => {
          video.classList.remove(
            "is-autoplay-blocked"
          );
        })
        .catch(() => {
          video.classList.add(
            "is-autoplay-blocked"
          );
        });
    }
  };


  /*
    Safari can still reject the very first autoplay attempt in circumstances
    such as Low Power Mode, returning from the app switcher, or a fresh tab.

    The background itself intentionally has pointer-events:none, so its native
    play overlay can never be our fallback. Instead, any normal user gesture
    anywhere on the site becomes a harmless opportunity to retry the currently
    active muted background video.
  */
  const armBackgroundVideoAutoplayWhenReady =
    (
      video,
      expectedSrc = null
    ) => {
      if (!video) {
        return;
      }


      const tryReadyPlay =
        () => {
          if (
            expectedSrc &&
            video.dataset.backgroundSrc !==
              expectedSrc
          ) {
            return;
          }


          safelyPlayBackgroundVideo(
            video
          );
        };


      /*
        Safari can reject play() while the newly-assigned resource is still
        between HAVE_NOTHING / metadata. Re-issue the same muted inline play
        request at the first useful media milestones.

        These are one-shot listeners for THIS source assignment, so changing
        pages later gets a fresh set tied to the new expected source.
      */
      [
        "loadedmetadata",
        "loadeddata",
        "canplay"
      ].forEach(
        (eventName) => {
          video.addEventListener(
            eventName,
            tryReadyPlay,
            {
              once: true
            }
          );
        }
      );


      /*
        Also retry on the next paint. iOS Safari sometimes accepts play()
        immediately after the source/load mutation but not in the same task.
      */
      requestAnimationFrame(
        () => {
          tryReadyPlay();
        }
      );
    };


  const retryActiveBackgroundVideo =
    () => {
      if (
        !activeBackgroundVideo ||
        (
          !activeBackgroundVideo.paused &&
          !activeBackgroundVideo.classList.contains(
            "is-autoplay-blocked"
          )
        )
      ) {
        return;
      }


      safelyPlayBackgroundVideo(
        activeBackgroundVideo
      );
    };


  document.addEventListener(
    "touchstart",
    retryActiveBackgroundVideo,
    {
      capture: true,
      passive: true
    }
  );


  document.addEventListener(
    "pointerdown",
    retryActiveBackgroundVideo,
    {
      capture: true,
      passive: true
    }
  );


  /*
    iOS can suspend decorative video when Safari is backgrounded. Retry when
    the page becomes visible again rather than leaving the frozen play state.
  */
  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        retryActiveBackgroundVideo();
      }
    }
  );


  window.addEventListener(
    "pageshow",
    retryActiveBackgroundVideo,
    {
      passive: true
    }
  );


  const requestBackgroundVideo = (
    pageName
  ) => {
    if (backgroundVideoBuffers.length < 2) {
      return;
    }


    const nextSrc =
      getBackgroundVideoSrc(
        pageName
      );


    requestedBackgroundVideoSrc =
      nextSrc;


    /*
      If the current front buffer already owns this requested source,
      simply keep it active. This is important when several rapid page
      clicks resolve back to the same destination.
    */
    if (
      activeBackgroundVideo &&
      activeBackgroundVideo.dataset
        .backgroundSrc === nextSrc
    ) {
      backgroundVideoRunId += 1;


      backgroundVideoBuffers.forEach(
        (video) => {
          video.classList.toggle(
            "is-background-active",
            video === activeBackgroundVideo
          );
        }
      );


      safelyPlayBackgroundVideo(
        activeBackgroundVideo
      );

      return;
    }


    backgroundVideoRunId += 1;

    const runId =
      backgroundVideoRunId;


    const outgoingVideo =
      activeBackgroundVideo;


    const incomingVideo =
      backgroundVideoBuffers.find(
        (video) =>
          video !== outgoingVideo
      );


    if (!incomingVideo) {
      return;
    }


    /*
      Retarget the spare buffer immediately on the button press.
      We do NOT wait for the page morph or for a canplay event before
      beginning the opacity transition; the video element starts loading
      and playing at the same moment the user's page intent changes.
    */
    incomingVideo.classList.remove(
      "is-autoplay-blocked"
    );

    incomingVideo.dataset.backgroundSrc =
      nextSrc;

    incomingVideo.src =
      nextSrc;


    armBackgroundVideoAutoplayWhenReady(
      incomingVideo,
      nextSrc
    );


    incomingVideo.load();


    try {
      incomingVideo.currentTime = 0;
    }

    catch (_) {
      /* Some browsers disallow seeking before metadata exists. */
    }


    safelyPlayBackgroundVideo(
      incomingVideo
    );


    /*
      Force the incoming buffer to begin from the hidden state before
      switching which layer owns the visible opacity transition.
    */
    incomingVideo.classList.remove(
      "is-background-active"
    );

    void incomingVideo.offsetWidth;


    outgoingVideo?.classList.remove(
      "is-background-active"
    );

    incomingVideo.classList.add(
      "is-background-active"
    );


    activeBackgroundVideo =
      incomingVideo;


    const fadeDuration =
      getBackgroundCrossfadeDuration();


    /*
      Pause the old buffer only AFTER the fade. The run id makes old
      callbacks harmless if the user clicks again before this finishes.
    */
    window.setTimeout(
      () => {
        if (
          runId !== backgroundVideoRunId
        ) {
          return;
        }


        backgroundVideoBuffers.forEach(
          (video) => {
            const isCurrent =
              video === activeBackgroundVideo &&
              video.dataset.backgroundSrc ===
                requestedBackgroundVideoSrc;


            if (!isCurrent) {
              video.pause();
            }
          }
        );
      },
      fadeDuration + 80
    );
  };


  const updateViewportFramePageProgress = (
    name,
    infoGeometryOverride = null
  ) => {
    const viewportFrame =
      document.querySelector(
        ".viewport-frame"
      );


    if (!viewportFrame) {
      return;
    }


    const pageIndex =
      pageNames.indexOf(
        name
      );


    if (pageIndex < 0) {
      return;
    }


    /*
      Keep the decorative chevrons comfortably clear of the top/bottom
      corner artwork while still making all five page positions distinct.
    */
    const pageProgressStops = [
      18,
      34,
      50,
      66,
      82
    ];


    let progressY =
      pageProgressStops[
        pageIndex
      ];


    /*
      Tablet/mobile game pages have a genuine second vertical stop:
      media -> info -> next page.

      Reflect that by moving the frame chevrons halfway toward the next page
      while the info geometry is open. Desktop remains one stop per page
      because its info panel is presented beside the media instead of as a
      second scroll step.
    */
    const isGamePage =
      (
        name === "brobots" ||
        name === "etherian" ||
        name === "halodoom"
      );


    if (
      isGamePage &&
      gameFrameTabletMode.matches &&
      pageIndex <
        pageProgressStops.length - 1
    ) {
      const gameFrame =
        pageFrames.get(
          name
        );


      const gameFrameArea =
        gameFrame?.querySelector(
          ".game-frame-area"
        );


      const infoIsOpen =
        infoGeometryOverride ??
        gameFrameArea?.classList.contains(
          "is-tablet-info-geometry"
        );


      if (infoIsOpen) {
        progressY =
          (
            pageProgressStops[
              pageIndex
            ] +
            pageProgressStops[
              pageIndex + 1
            ]
          ) /
          2;
      }
    }


    viewportFrame.style.setProperty(
      "--viewport-page-progress-y",
      `${progressY}%`
    );
  };


  const setSelectedPageIntent = (
    name
  ) => {
    selectedPageName =
      name;


    updateViewportFramePageProgress(
      selectedPageName
    );


    requestBackgroundVideo(
      selectedPageName
    );
  };


  /*
    Start the default layer if autoplay is available.
  */
  if (activeBackgroundVideo) {
    activeBackgroundVideo.dataset.backgroundSrc =
      activeBackgroundVideo.getAttribute(
        "src"
      ) ||
      defaultBackgroundVideoSrc;


    /*
      Important for iPhone Safari:
      establish muted + inline + autoplay state FIRST (done above), then make
      the resource start/restart loading under that policy state.

      This is the part that avoids relying on the first user tap as the thing
      that finally makes playback legal.
    */
    armBackgroundVideoAutoplayWhenReady(
      activeBackgroundVideo,
      activeBackgroundVideo.dataset.backgroundSrc
    );


    if (
      activeBackgroundVideo.readyState === 0
    ) {
      activeBackgroundVideo.load();
    }


    safelyPlayBackgroundVideo(
      activeBackgroundVideo
    );
  }

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
          (
            name === "brobots" ||
            name === "etherian" ||
            name === "halodoom"
          )
            ? buildGameFormPath
            : buildFormPath,

        settingsFamily:
          "page",

        shapeType:
          (
            name === "brobots" ||
            name === "etherian" ||
            name === "halodoom"
          )
            ? "game-page"
            : "page"
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
      751–1400px  compact icon-button mode
      1401px+     full text-button desktop mode

    The destination layout itself is breakpoint-specific CSS.
  */
  const iconButtonMode =
    window.matchMedia(
      "(min-width: 751px)"
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
    Mobile breakpoint handoff state.
    Kept deliberately separate from normal page/lightbox animation state.
  */
  let mobileUiCollapseRunId = 0;
  let mobileUiCollapseActive = false;

  /*
    This tracks the mode represented by lastStablePageRect.
    It intentionally updates only AFTER a breakpoint handoff completes.
  */
  let lastStablePageWasDesktop =
    fullTextDesktopMode.matches;


  /*
    Media rails register a lightweight layout-sync callback here.
    The page-frame transition calls these on the SAME RAF that it changes
    the frame rectangle, so the thumbnail strip cannot lag one layout frame
    behind in either desktop -> tablet OR tablet -> desktop.
  */
  const mediaRailLayoutSyncCallbacks =
    new Set();


  const syncMediaRailsForLayout = () => {
    mediaRailLayoutSyncCallbacks.forEach(
      (sync) => {
        sync();
      }
    );
  };


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


    const makeShadow = () => {
      return (
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
          makeShadow(),

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
          makeShadow(),

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
          makeShadow(),

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
    setSelectedPageIntent(
      null
    );

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
      setSelectedPageIntent(
        name
      );

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
        setSelectedPageIntent(
          name
        );

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
      isGamePageMorph(
        geometry
      )
        ? gameEightPointsToPath(
            points
          )
        : pagePointsToPath(
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
      isGamePageMorph(
        geometry
      )
        ? getGameFinalEightPoints(
            geometry
          )
        : getPageFinalSixPoints(
            geometry
          );

    const launchPoints =
      isGamePageMorph(
        geometry
      )
        ? getGameLaunchEightPoints(
            geometry
          )
        : getPageLaunchSixPoints(
            geometry
          );

    const reattachPoints =
      isGamePageMorph(
        geometry
      )
        ? getGameButtonReattachEightPoints(
            geometry,
            0.48
          )
        : getButtonReattachSixPoints(
            geometry,
            0.48
          );

    const absorbPoints =
      isGamePageMorph(
        geometry
      )
        ? getGameButtonAbsorbEightPoints(
            geometry
          )
        : getButtonAbsorbSixPoints(
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
        setSelectedPageIntent(
          null
        );

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
      Page switching now uses the SAME complete reverse animation as
      clicking the currently-open page a second time.

      The incoming page is still allowed to begin during the tail end of
      this reverse, using the already-existing independent overlap path.
    */
    const styles =
      getComputedStyle(
        siteHeader
      );


    const overlapDuration =
      nextPageName
        ? Math.min(
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
          )
        : 0;


    const overlapStartRaw =
      overlapDuration > 0
        ? clamp(
            1 -
            (
              overlapDuration /
              Math.max(1, duration)
            ),
            0,
            1
          )
        : 1;


    cancelIncomingPageOverlap();


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


    const simplePageMorphCrossfade =
      (
        name === "about" ||
        name === "contact"
      );


    /*
      About / Contact should visually crossfade from the REAL page into the
      temporary reverse-morph frame. Game pages keep the established immediate
      opaque morph behavior.
    */
    menuMorph.style.opacity =
      simplePageMorphCrossfade
        ? "0"
        : "1";


    /*
      About / Contact are broad translucent glass compositions rather than
      dense game frames. Their normal shared real-frame fade (~150ms) is so
      short that the page appears to vanish as soon as the reverse morph
      begins.

      Give only these two simple pages a longer desktop/tablet retraction
      fade. Game pages retain the established timing unchanged.
    */
    const simplePageCloseFadeDuration =
      (
        name === "about" ||
        name === "contact"
      )
        ? Math.min(
            duration,
            840
          )
        : geometry.settings.realMenuFadeDuration;


    frame.style.transition =
      `opacity ${
        simplePageCloseFadeDuration
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
        progress,
        rawProgress
      ) => {
        pageFrameProgress =
          progress;


        if (simplePageMorphCrossfade) {
          /*
            Fade the temporary morph IN over roughly the first half of the
            reverse animation. It is fully opaque well before it reaches the
            nav button, so the final button landing keeps the same solidity as
            the existing morph system.
          */
          const morphFadeRaw =
            clamp(
              rawProgress / 1.04,
              0,
              1
            );


          const morphFadeT =
            morphFadeRaw *
            morphFadeRaw *
            (
              3 -
              2 *
              morphFadeRaw
            );


          menuMorph.style.opacity =
            String(
              morphFadeT
            );
        }


        /*
          When switching pages, start the requested page near the end of
          the outgoing FULL reverse sequence. This preserves the overlap
          we liked without needing the special quick-return geometry.
        */
        if (
          nextPageName &&
          !incomingOverlapStarted &&
          overlapDuration > 0 &&
          rawProgress >= overlapStartRaw
        ) {
          startIncomingPageOverlap(
            nextPageName,
            overlapDuration
          );
        }
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


        if (simplePageMorphCrossfade) {
          menuMorph.style.opacity =
            "1";
        }


        frame.classList.remove(
          "is-open"
        );

        frame.style.transition =
          "";


        /*
          If an incoming overlap is running, only clear the outgoing path.
          Otherwise the shared morph SVG can be hidden normally.
        */
        hideMorphIfIdle();

        morphEngine.clearActive();


        const next =
          selectedPageName ||
          queuedPageName;


        queuedPageName =
          null;


        /*
          Keep the outgoing button visually active for the ENTIRE reverse
          morph. Only release it after the morph has completely disappeared.
        */
        if (
          next &&
          next !== name
        ) {
          setActivePageButtonState(
            next,
            name
          );

          releasePageButtonState(
            name
          );


          /*
            If overlap is disabled, open sequentially now.
            If overlap is already running, let that independent morph finish.
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
          /*
            Ordinary toggle-off close:
            release the pressed colour only AFTER the full reverse morph
            reaches the button and disappears.
          */
          releasePageButtonState(
            name
          );

          activePageName =
            null;

          setSelectedPageIntent(

            null

          );
        }
      }
    });
  };

  /* =======================================================
     Mobile directional page-to-page transitions
     =======================================================

     Mobile keeps hamburger-menu opening separate for now.

     Gesture page switches use a direction-specific hybrid:

       Swipe UP / move forward:
         outgoing page -> standard reverse page morph -> hamburger
         incoming page -> slides up from below the viewport

       Swipe DOWN / move backward:
         outgoing page -> slides down below the viewport
         incoming page -> standard page morph from hamburger

     The morph geometry is the SAME page morph system already used on
     tablet/desktop; only its source is the visible mobile hamburger.
     ======================================================= */

  let mobileDirectionalPageSwitchActive =
    false;

  let mobileDirectionalPageAnimationRunId =
    0;


  const getMobileGameFinalEightPoints =
    (
      geometry
    ) => {
      const {
        menuRect,
        settings
      } = geometry;


      const targetElement =
        geometry?.target
          ?.getTargetElement?.();


      const visibleFrameElement =
        targetElement
          ?.querySelector(
            ".prototype-page-frame-content"
          );


      const measuredVisibleRect =
        visibleFrameElement
          ?.getBoundingClientRect();


      const targetRect =
        (
          measuredVisibleRect &&
          measuredVisibleRect.width > 0 &&
          measuredVisibleRect.height > 0
        )
          ? measuredVisibleRect
          : menuRect;


      /*
        Desktop/tablet intentionally use enlarged game-page chamfers.

        On a phone that same absolute treatment becomes enormous relative to
        the collapsing page. Scale the vertical corner rise from the ACTUAL
        visible page width instead, so the temporary morph keeps the same
        visual proportion as the smaller mobile window.
      */
      const topRise =
        Math.min(
          targetRect.height * 0.30,
          targetRect.width * 0.055
        );

      const bottomRise =
        Math.min(
          targetRect.height * 0.30,
          targetRect.width * 0.055
        );


      const topRun =
        topRise *
        settings.slope;

      const bottomRun =
        bottomRise *
        settings.slope;


      return [
        {
          x:
            targetRect.left +
            topRun,
          y:
            targetRect.top
        },

        {
          x:
            targetRect.right -
            topRun,
          y:
            targetRect.top
        },

        {
          x:
            targetRect.right,
          y:
            targetRect.top +
            topRise
        },

        {
          x:
            targetRect.right,
          y:
            targetRect.bottom -
            bottomRise
        },

        {
          x:
            targetRect.right -
            bottomRun,
          y:
            targetRect.bottom
        },

        {
          x:
            targetRect.left +
            bottomRun,
          y:
            targetRect.bottom
        },

        {
          x:
            targetRect.left,
          y:
            targetRect.bottom -
            bottomRise
        },

        {
          x:
            targetRect.left,
          y:
            targetRect.top +
            topRise
        }
      ];
    };


  const getMobileGameMorphPoints =
    (
      geometry,
      progress
    ) => {
      const startPoints =
        getGameLaunchEightPoints(
          geometry
        );

      const finalPoints =
        getMobileGameFinalEightPoints(
          geometry
        );

      const t =
        easeInOutCubic(
          progress
        );


      return startPoints.map(
        (
          point,
          index
        ) => {
          return {
            x:
              lerp(
                point.x,
                finalPoints[index].x,
                t
              ),

            y:
              lerp(
                point.y,
                finalPoints[index].y,
                t
              )
          };
        }
      );
    };


  const buildMobileGameFormPath =
    (
      geometry,
      progress
    ) => {
      return gameEightPointsToPath(
        getMobileGameMorphPoints(
          geometry,
          progress
        )
      );
    };


  const getMobilePageMorphGeometry =
    (
      name
    ) => {
      const frame =
        getPageFrame(
          name
        );


      if (
        !frame ||
        !menuToggle
      ) {
        return null;
      }


      updatePrototypePageFrameGeometry(
        frame
      );


      /*
        The page morph normally inherits its accent from the nav button.
        Mobile uses the hamburger instead, so temporarily give the hamburger
        the page accent before asking the shared geometry engine to build it.
      */
      const pageAccent =
        getComputedStyle(
          frame
        )
          .getPropertyValue(
            "--page-accent-rgb"
          )
          .trim();


      if (pageAccent) {
        menuToggle.style.setProperty(
          "--nav-accent-rgb",
          pageAccent
        );
      }


      return getMorphGeometry(
        {
          getSourceElement: () =>
            menuToggle,

          getTargetElement: () =>
            frame,

          getFinalRect:
            getFinalElementRect,

          buildFormPath:
            (
              name === "brobots" ||
              name === "etherian" ||
              name === "halodoom"
            )
              ? buildMobileGameFormPath
              : buildFormPath,

          settingsFamily:
            "page",

          shapeType:
            (
              name === "brobots" ||
              name === "etherian" ||
              name === "halodoom"
            )
              ? "game-page"
              : "page"
        }
      );
    };


  const getMobilePageSlideDistance =
    (
      frame
    ) => {
      const rect =
        frame.getBoundingClientRect();


      /*
        "Offscreen below" only requires the page's TOP edge to sit just below
        the viewport.

        The previous formula also added the page's full height, which placed
        the incoming page an entire extra page-length below the screen. That
        meant our synchronized first phase was technically running, but the new
        page remained invisible until the old page had almost finished
        shrinking.

        Start / finish just beyond the bottom edge instead. Now 50% travel
        actually means the page is visibly about halfway into the viewport.
      */
      return Math.max(
        40,
        window.innerHeight -
          rect.top +
          24
      );
    };


  const clearMobilePageAnimationStyles =
    (
      frame
    ) => {
      if (!frame) {
        return;
      }


      frame.style.removeProperty(
        "transform"
      );

      frame.style.removeProperty(
        "opacity"
      );

      frame.style.removeProperty(
        "transition"
      );

      frame.style.removeProperty(
        "z-index"
      );

      frame.style.removeProperty(
        "will-change"
      );

      frame.style.removeProperty(
        "transform-origin"
      );

      frame.style.removeProperty(
        "height"
      );

      frame.style.removeProperty(
        "--mobile-outgoing-info-glow-progress"
      );

      frame.classList.remove(
        "is-mobile-outgoing-info-glow"
      );

      frame.classList.remove(
        "is-mobile-simple-page-exiting"
      );
    };


  /*
    Settled mobile ownership repair
    --------------------------------
    A mobile page transition temporarily allows two real page frames to exist
    at once. If any interrupted lightbox/page handoff leaves stale .is-open,
    z-index, transform, or selection state behind, that invisible old frame
    can still sit above the new hero and receive touches.

    Commit ONE authoritative page after every settled handoff:
      - activePageName and selectedPageName agree
      - only that frame is open
      - every other frame loses temporary mobile animation styles
  */
  const commitSettledMobilePage =
    (
      pageName
    ) => {
      const currentFrame =
        getPageFrame(
          pageName
        );


      if (!currentFrame) {
        return;
      }


      activePageName =
        pageName;

      setSelectedPageIntent(
        pageName
      );

      setActivePageButtonState(
        pageName
      );


      pageFrames.forEach(
        (
          frame,
          name
        ) => {
          if (name === pageName) {
            frame.classList.add(
              "is-open"
            );

            clearMobilePageAnimationStyles(
              frame
            );

            return;
          }


          frame.classList.remove(
            "is-open"
          );

          closeSecondaryPanel(
            frame
          );

          clearMobilePageAnimationStyles(
            frame
          );
        }
      );


      pageFrameProgress =
        1;

      pageFrameTargetOpen =
        true;

      pageFrameIsAnimating =
        false;

      mobileDirectionalPageSwitchActive =
        false;

      syncPageInputOwnership();
    };


  const finalizeMobileOutgoingFrame =
    (
      frame
    ) => {
      if (!frame) {
        return;
      }


      /*
        IMPORTANT:
        Do not simply remove .is-open and then clear the temporary transform.

        The normal page CSS fades opacity when .is-open disappears. If we also
        remove the offscreen translate in that same moment, the old page jumps
        back into its resting position and performs that fade in full view.

        Hard-commit the hidden state with transitions disabled FIRST, then
        release the temporary animation styles. The base closed-page CSS is
        already opacity:0, so once this frame is committed there is nothing
        left to visibly fade.
      */
      frame.style.transition =
        "none";

      frame.style.opacity =
        "0";


      frame.classList.remove(
        "is-open"
      );


      /*
        Force Safari/Chromium to commit the closed state before we remove the
        outgoing slide transform.
      */
      frame.getBoundingClientRect();


      frame.style.removeProperty(
        "transform"
      );

      frame.style.removeProperty(
        "z-index"
      );

      frame.style.removeProperty(
        "will-change"
      );

      frame.style.removeProperty(
        "height"
      );

      frame.style.removeProperty(
        "--mobile-outgoing-info-glow-progress"
      );

      frame.classList.remove(
        "is-mobile-outgoing-info-glow"
      );


      /*
        Another layout read ensures the base closed opacity has taken over
        before normal CSS transitions are restored.
      */
      frame.getBoundingClientRect();


      frame.style.removeProperty(
        "opacity"
      );

      frame.style.removeProperty(
        "transition"
      );
    };


  const animateMobilePageSlide =
    (
      frame,
      {
        fromY,
        toY,
        duration,
        easing =
          "cubic-bezier(0.22, 0.72, 0.24, 1)",
        keepOpen = true,
        holdFinal = false,
        fromOpacity = 1,
        toOpacity = 1
      }
    ) => {
      if (!frame) {
        return Promise.resolve();
      }


      frame.style.transition =
        "none";

      frame.style.willChange =
        "transform";

      frame.style.opacity =
        "1";


      if (keepOpen) {
        frame.classList.add(
          "is-open"
        );
      }


      const animation =
        frame.animate(
          [
            {
              transform:
                `translate3d(0, ${fromY}px, 0)`,

              opacity:
                fromOpacity
            },
            {
              transform:
                `translate3d(0, ${toY}px, 0)`,

              opacity:
                toOpacity
            }
          ],
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


      return animation.finished
        .catch(
          () => {}
        )
        .then(
          () => {
            /*
              WAAPI fill:"forwards" only persists while the Animation object
              remains active. Calling cancel() immediately used to snap an
              outgoing page back to translateY(0) for one frame before the
              switch cleanup removed it — the visible "reappear then fade".

              Commit the final transform as an inline style first when this is
              an outgoing slide, then cancel the temporary animation.
            */
            if (holdFinal) {
              frame.style.transform =
                `translate3d(0, ${toY}px, 0)`;
            }


            animation.cancel();
          }
        );
    };


  const animateMobileForwardPush =
    async (
      previousFrame,
      nextFrame,
      {
        nextDistance,
        pushDuration,
        collapseDuration,
        runId,
        previousName
      }
    ) => {
      if (
        !previousFrame ||
        !nextFrame
      ) {
        return;
      }


      /*
        Phase 1 uses the REAL page sizing rules, not transform: scaleY().

        The old page's inline height is animated down to half its starting
        height while updatePrototypePageFrameGeometry() runs every frame.
        That means:
          - frame corners / rails resize naturally
          - media + info geometry reacts as though the viewport/page height
            itself were being reduced
          - text / container-query behavior follows the existing responsive
            rules instead of being visually squashed

        The incoming page's first half of travel is driven by this SAME RAF,
        so the two motions are guaranteed to happen simultaneously.
      */
      const previousStartRect =
        previousFrame.getBoundingClientRect();

      const startHeight =
        previousStartRect.height;

      const nextFinalRect =
        nextFrame.getBoundingClientRect();


      /*
        At the handoff point, put the incoming page's TOP edge at roughly the
        middle of the viewport.
      */
      const halfwayY =
        Math.max(
          0,
          window.innerHeight * 0.50 -
            nextFinalRect.top
        );


      /*
        Do not independently guess "half height" for the old page.

        Derive its final first-phase height from the exact place where the
        incoming page will be at the handoff. That makes the old page's bottom
        edge and the new page's top edge meet cleanly instead of occasionally
        leaving a gap or awkward overlap.

        A tiny 2px overlap is intentional; the incoming page is layered above
        the outgoing geometry, so this hides antialiasing seams.
      */
      const incomingHalfwayTop =
        nextFinalRect.top +
        halfwayY;


      /*
        Leave a small intentional gap between the old page's shrunken bottom
        edge and the incoming page's top edge.

        The previous version used a 2px overlap to hide antialias seams.
        In motion, the outgoing resize can visually trail the incoming page by
        a few pixels, so a modest buffer reads cleaner and avoids the collision
        without changing the timing/choreography.
      */
      const mobilePushBuffer =
        Math.max(
          24,
          Math.min(
            54,
            window.innerHeight * 0.036
          )
        );


      const targetHeight =
        Math.max(
          1,
          Math.min(
            startHeight,
            incomingHalfwayTop -
              previousStartRect.top -
              mobilePushBuffer
          )
        );


      previousFrame.style.transition =
        "none";

      previousFrame.style.opacity =
        "1";

      previousFrame.style.willChange =
        "height, opacity";


      /*
        Mobile swipe-up only:
        wash the outgoing INFO region into the page accent as the page loses
        height. This hides the copy before the cavity becomes too small for it.
      */
      previousFrame.classList.add(
        "is-mobile-outgoing-info-glow"
      );

      previousFrame.style.setProperty(
        "--mobile-outgoing-info-glow-progress",
        "0"
      );


      nextFrame.style.transition =
        "none";

      nextFrame.style.opacity =
        "0";

      nextFrame.style.willChange =
        "transform, opacity";

      nextFrame.classList.add(
        "is-open"
      );

      nextFrame.style.transform =
        `translate3d(0, ${nextDistance}px, 0)`;


      await new Promise(
        (resolve) => {
          const startTime =
            performance.now();


          const step =
            (now) => {
              if (
                runId !==
                mobileDirectionalPageAnimationRunId
              ) {
                resolve();

                return;
              }


              const raw =
                clamp(
                  (
                    now -
                    startTime
                  ) /
                  Math.max(
                    1,
                    pushDuration
                  ),
                  0,
                  1
                );


              const t =
                easeInOutCubic(
                  raw
                );


              const currentHeight =
                lerp(
                  startHeight,
                  targetHeight,
                  t
                );


              /*
                Let the incoming page lead the old-page compression by a hair.
                The difference is subtle, but it makes the motion read as
                "new page pushes old page away" rather than two unrelated
                animations arriving at the same endpoint.
              */
              const incomingT =
                clamp(
                  t * 1.08,
                  0,
                  1
                );

              const currentY =
                lerp(
                  nextDistance,
                  halfwayY,
                  incomingT
                );


              previousFrame.style.height =
                `${currentHeight}px`;

              nextFrame.style.transform =
                `translate3d(0, ${currentY}px, 0)`;


              /*
                Restore the old page crossfade as a SECONDARY effect, without
                replacing the physical push motion.

                Keep plenty of solidity during phase 1 so the movement still
                reads clearly; the stronger fade happens during collapse.
              */
              previousFrame.style.opacity =
                String(
                  lerp(
                    1,
                    0.78,
                    t
                  )
                );

              nextFrame.style.opacity =
                String(
                  lerp(
                    0,
                    0.82,
                    incomingT
                  )
                );


              /*
                Glow quickly rather than linearly. By the time the outgoing
                page reaches the halfway handoff the info region is completely
                page-colored, so the text never gets a chance to look cramped.
              */
              const infoGlowProgress =
                1 -
                Math.pow(
                  1 -
                  t,
                  2.35
                );


              previousFrame.style.setProperty(
                "--mobile-outgoing-info-glow-progress",
                String(
                  infoGlowProgress
                )
              );


              /*
                Rebuild the actual frame SVG / game-frame geometry from the
                newly-resized page rectangle on every animation frame.
              */
              updatePrototypePageFrameGeometry(
                previousFrame
              );

              syncMediaRailsForLayout();


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
        }
      );


      if (
        runId !==
        mobileDirectionalPageAnimationRunId
      ) {
        return;
      }


      /*
        Commit the exact halfway state. At this moment:
          - old page genuinely occupies half its original height
          - new page is halfway into the viewport

        NOW begin the hamburger collapse using the resized page itself as the
        morph's target geometry.
      */
      previousFrame.style.height =
        `${targetHeight}px`;

      nextFrame.style.transform =
        `translate3d(0, ${halfwayY}px, 0)`;


      previousFrame.style.setProperty(
        "--mobile-outgoing-info-glow-progress",
        "1"
      );


      updatePrototypePageFrameGeometry(
        previousFrame
      );

      syncMediaRailsForLayout();


      const resizedStartRect =
        previousFrame.getBoundingClientRect();


      /*
        Do not override stacking here.

        The old incoming-page z-index boost was only introduced to hide the
        earlier overlap with the collapse morph. That overlap is now solved by
        the geometry/tethering, and the boost can put the page/banner into a
        stacking context above the hamburger morph.

        Leaving both real pages at their normal stacking order mirrors the
        swipe-down path, where the morph already renders correctly.
      */
      nextFrame.style.removeProperty(
        "z-index"
      );

      previousFrame.style.removeProperty(
        "z-index"
      );


      /*
        Phase 2 is now physically linked instead of time-linked.

        The incoming page no longer runs an independent "second half" slide.
        animateMobileForwardDynamicCollapse() drives BOTH:
          - the old-page collapse toward hamburger
          - the incoming page upward

        The incoming page's top edge is tethered just below the current bottom
        edge of the collapse morph. If the morph spends a few frames changing
        width/chamfer before its bottom edge rises, the new page simply waits
        for that clearance instead of passing through it.
      */
      await animateMobileForwardDynamicCollapse(
        previousName,
        runId,
        {
          startRect:
            resizedStartRect,

          duration:
            Math.max(
              320,
              collapseDuration * 0.50
            ),

          incomingFrame:
            nextFrame,

          incomingFinalTop:
            nextFinalRect.top,

          incomingStartY:
            halfwayY,

          /*
            Keep a modest clearance during the collapse itself. The larger
            phase-1 buffer has already established separation at handoff.
          */
          incomingBuffer:
            Math.max(
              10,
              Math.min(
                22,
                window.innerHeight * 0.016
              )
            )
        }
      );
    };


  const animateMobileForwardDynamicCollapse =
    (
      name,
      runId,
      {
        startRect,
        duration = 520,
        incomingFrame = null,
        incomingFinalTop = null,
        incomingStartY = 0,
        incomingBuffer = 14
      } = {}
    ) => {
      const frame =
        getPageFrame(
          name
        );


      if (
        !frame ||
        !startRect
      ) {
        return Promise.resolve();
      }


      const geometry =
        getMobilePageMorphGeometry(
          name
        );


      if (!geometry) {
        return Promise.resolve();
      }


      /*
        MOBILE SWIPE-UP ONLY.

        Do not modify the standard page morph animation used elsewhere.
        Instead, create a temporary geometry object whose FINAL page rect is
        the already-resized half-height frame. The collapse then runs from
        that exact shape back to the hamburger.

        This preserves every other caller of buildGameFormPath /
        renderMorph / requestPage.
      */
      const dynamicGeometry = {
        ...geometry,

        menuRect: {
          left:
            startRect.left,

          top:
            startRect.top,

          right:
            startRect.right,

          bottom:
            startRect.bottom,

          width:
            startRect.width,

          height:
            startRect.height
        }
      };


      showMorph();

      renderMorph(
        dynamicGeometry,
        1
      );


      menuMorph.style.transition =
        "none";

      menuMorph.style.opacity =
        (
          name === "about" ||
          name === "contact"
        )
          ? "0"
          : "1";


      /*
        Match the swipe-down path exactly.

        menuMorph is created with inline z-index: 1001 so it sits above the
        main Simulacrum header (z-index: 1000). The previous swipe-up cleanup
        accidentally REMOVED that original inline z-index, which dropped the
        collapse morph behind the banner.

        Keep the morph at its normal baseline layer instead of inventing a
        forward-only stacking order.
      */
      menuMorph.style.zIndex =
        "1001";


      /*
        Keep the real resized outgoing page visible at the handoff.

        Previously we killed it immediately with opacity:0 as soon as the
        hamburger-collapse morph appeared. That made the page visibly vanish
        instead of crossfading into the morph.

        The morph itself remains fully opaque / unchanged; we only fade the
        REAL outgoing page away during the opening portion of phase 2.
      */
      frame.style.transition =
        "none";


      /*
        True page -> morph crossfade.

        Keep the hamburger morph fully opaque at its normal 1001 layer, but
        temporarily place the REAL outgoing page one layer above it. As the
        real page fades to 0, it reveals the already-running morph underneath.

        This avoids the brightness/pop at the exact handoff without fading the
        hamburger morph itself.
      */
      frame.style.zIndex =
        "1002";


      return new Promise(
        (resolve) => {
          const startTime =
            performance.now();


          /*
            The collapse polygon can change shape quite aggressively from one
            frame to the next. Keep a separate smoothed Y for the incoming
            page so it follows the collapse rather than snapping exactly to
            every instantaneous geometry change.
          */
          let smoothedIncomingY =
            incomingStartY;


          const step =
            (now) => {
              if (
                runId !==
                mobileDirectionalPageAnimationRunId
              ) {
                resolve();

                return;
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


              /*
                Faster/aggressive second stage. The first push phase already
                established the shrinking motion, so this should feel like a
                continuation rather than a fresh slow animation.
              */
              const t =
                1 -
                Math.pow(
                  1 -
                  raw,
                  3
                );


              renderMorph(
                dynamicGeometry,
                1 -
                  t
              );


              /*
                About / Contact need the reverse of their mobile open
                crossfade here:

                  real page fades OUT
                  hamburger morph fades IN

                The morph still reaches full opacity early in the collapse
                and remains fully opaque all the way into the final burger.
                Game pages keep their established always-opaque morph.
              */
              const simplePageCrossfade =
                (
                  name === "about" ||
                  name === "contact"
                );


              const outgoingFadeRaw =
                clamp(
                  raw / 0.38,
                  0,
                  1
                );

              const outgoingFadeT =
                outgoingFadeRaw *
                outgoingFadeRaw *
                (
                  3 -
                  2 *
                  outgoingFadeRaw
                );


              menuMorph.style.opacity =
                simplePageCrossfade
                  ? String(
                      outgoingFadeT
                    )
                  : "1";


              frame.style.opacity =
                String(
                  lerp(
                    0.78,
                    0,
                    outgoingFadeT
                  )
                );


              if (incomingFrame) {
                incomingFrame.style.opacity =
                  String(
                    lerp(
                      0.82,
                      1,
                      t
                    )
                  );
              }


              /*
                Tether the incoming page to the actual rendered collapse
                silhouette, not to the collapse timer.

                This fixes the awkward moment where the standard morph begins
                by changing width/chamfers while its bottom edge barely moves:
                the new page can no longer run ahead and overlap it.
              */
              if (
                incomingFrame &&
                Number.isFinite(
                  incomingFinalTop
                )
              ) {
                /*
                  Follow the ACTUAL bottom edge of the visible collapse polygon.

                  menuMorph.getBoundingClientRect() only reports the shell's
                  static DOM box, so it remained essentially unchanged during
                  the clip-path morph and made the incoming page stall at the
                  halfway point.

                  These points are the same interpolated geometry used by
                  buildMobileGameFormPath(), so this tracks exactly what the
                  user sees on screen.
                */
                const currentMorphProgress =
                  1 -
                  t;

                const currentMorphPoints =
                  getMobileGameMorphPoints(
                    dynamicGeometry,
                    currentMorphProgress
                  );

                const currentMorphBottom =
                  Math.max(
                    ...currentMorphPoints.map(
                      (point) =>
                        point.y
                    )
                  );


                const desiredIncomingTop =
                  Math.max(
                    incomingFinalTop,
                    currentMorphBottom +
                      incomingBuffer
                  );


                const desiredIncomingY =
                  clamp(
                    desiredIncomingTop -
                      incomingFinalTop,
                    0,
                    incomingStartY
                  );


                /*
                  Smoothly chase the morph edge instead of matching it 1:1.

                  The follow strength ramps up near the end so we retain the
                  softer motion through the snappy part of the collapse but
                  still land cleanly at the final page position.
                */
                const followStrength =
                  lerp(
                    0.18,
                    0.46,
                    Math.pow(
                      raw,
                      1.7
                    )
                  );


                smoothedIncomingY =
                  lerp(
                    smoothedIncomingY,
                    desiredIncomingY,
                    followStrength
                  );


                /*
                  Guarantee a smooth landing.

                  The smoothed follower can intentionally lag a few pixels
                  behind the collapse edge. Previously we snapped that final
                  remainder to 0 when the morph completed, which caused the
                  visible end-pop.

                  During the final ~28% of the collapse, progressively blend
                  the follower toward its true resting position. The blend
                  uses smoothstep, so both the start and end of the correction
                  have zero-ish slope instead of feeling like another snap.
                */
                const landingRaw =
                  clamp(
                    (
                      raw -
                      0.72
                    ) /
                    0.28,
                    0,
                    1
                  );

                const landingT =
                  landingRaw *
                  landingRaw *
                  (
                    3 -
                    2 *
                    landingRaw
                  );

                const renderedIncomingY =
                  lerp(
                    smoothedIncomingY,
                    0,
                    landingT
                  );


                incomingFrame.style.transform =
                  `translate3d(0, ${renderedIncomingY}px, 0)`;
              }


              if (raw < 1) {
                requestAnimationFrame(
                  step
                );

                return;
              }


              frame.classList.remove(
                "is-open"
              );


              if (incomingFrame) {
                incomingFrame.style.transform =
                  "translate3d(0, 0, 0)";

                incomingFrame.style.opacity =
                  "1";
              }


              hideMorph();


              menuMorph.style.zIndex =
                "1001";


              /*
                Keep the real outgoing frame hidden until the page-switch
                finalizer runs.
              */
              frame.style.transition =
                "none";

              frame.style.opacity =
                "0";


              resolve();
            };


          requestAnimationFrame(
            step
          );
        }
      );
    };


  const animateMobilePageMorphOpen =
    (
      name,
      runId
    ) => {
      const frame =
        getPageFrame(
          name
        );

      const geometry =
        getMobilePageMorphGeometry(
          name
        );


      if (
        !frame ||
        !geometry
      ) {
        return Promise.resolve();
      }


      const duration =
        Math.max(
          1,
          geometry.settings.openDuration
        );


      showMorph();

      menuMorph.style.transition =
        "none";

      menuMorph.style.opacity =
        "0";


      /*
        Mobile directional navigation keeps the geometry animation primary,
        with opacity layered on top as a secondary fade.
        Keep the real destination frame fully hidden while the temporary morph
        grows out of the hamburger, then swap them at the completed geometry.
      */
      frame.style.transition =
        "none";

      frame.style.opacity =
        "0";


      /*
        True morph -> page crossfade.

        The morph remains fully opaque at z-index 1001. Put the REAL incoming
        page just above it while its opacity rises, so the fade is actually
        visible instead of happening underneath an opaque morph and then
        appearing to pop when the morph is removed.
      */
      frame.style.zIndex =
        "1002";

      frame.classList.add(
        "is-open"
      );


      return new Promise(
        (resolve) => {
          const startTime =
            performance.now();


          const step =
            (now) => {
              if (
                runId !==
                mobileDirectionalPageAnimationRunId
              ) {
                resolve();

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


              renderMorph(
                geometry,
                raw
              );


              /*
                Game pages keep the established fully-opaque hamburger morph.

                About / Contact are deliberately simpler glass pages, so let
                their temporary hamburger morph crossfade away while the real
                page fades in. This matches the handoff used by their other
                responsive modes without changing Brobots/Etherian/Halodoom.
              */
              const simplePageCrossfade =
                (
                  name === "about" ||
                  name === "contact"
                );


              /*
                Finish the REAL page fade before the morph reaches its final
                frame.

                When the fade was mapped all the way to raw === 1, the page
                could still be visually a little shy of full opacity on the
                last painted animation frame, then appear to pop when the
                temporary morph was removed.

                Giving the page a short fully-opaque "settle" window underneath
                the morph makes the final morph removal visually neutral.
              */
              const pageFadeStart =
                0.54;

              const pageFadeEnd =
                0.86;

              const pageFadeRaw =
                clamp(
                  (
                    raw -
                    pageFadeStart
                  ) /
                  (
                    pageFadeEnd -
                    pageFadeStart
                  ),
                  0,
                  1
                );

              const pageFadeT =
                pageFadeRaw *
                pageFadeRaw *
                (
                  3 -
                  2 *
                  pageFadeRaw
                );


              menuMorph.style.opacity =
                simplePageCrossfade
                  ? String(
                      1 -
                      pageFadeT
                    )
                  : "1";


              frame.style.opacity =
                String(
                  pageFadeT
                );


              if (raw < 1) {
                requestAnimationFrame(
                  step
                );

                return;
              }


              /*
                The morph and real page now occupy the same final geometry.
                Swap instantly instead of fading one over the other.
              */
              frame.style.opacity =
                "1";

              frame.getBoundingClientRect();


              menuMorph.style.opacity =
                "0";

              hideMorph();


              frame.style.removeProperty(
                "opacity"
              );

              frame.style.removeProperty(
                "transition"
              );

              frame.style.removeProperty(
                "z-index"
              );


              resolve();
            };


          requestAnimationFrame(
            step
          );
        }
      );
    };


  const animateMobilePageMorphClose =
    (
      name,
      runId,
      {
        noCrossfade = true
      } = {}
    ) => {
      const frame =
        getPageFrame(
          name
        );

      const geometry =
        getMobilePageMorphGeometry(
          name
        );


      if (
        !frame ||
        !geometry
      ) {
        return Promise.resolve();
      }


      const duration =
        Math.max(
          1,
          geometry.settings.closeDuration
        );


      showMorph();

      renderMorph(
        geometry,
        1
      );


      menuMorph.style.transition =
        "none";

      menuMorph.style.opacity =
        "1";


      /*
        Mobile directional navigation uses a hard visual handoff:
        the morph is first rendered at the CURRENT real-frame geometry, then
        the real frame is hidden instantly underneath it.

        That removes the competing opacity fade and, importantly for the
        forward push, lets a compressed page become the exact starting shape
        of the hamburger collapse.
      */
      frame.style.transition =
        "none";


      if (noCrossfade) {
        frame.style.opacity =
          "0";
      }

      else {
        frame.style.transition =
          `opacity ${
            geometry.settings.realMenuFadeDuration
          }ms ease`;
      }


      return new Promise(
        (resolve) => {
          const startTime =
            performance.now();


          const step =
            (now) => {
              if (
                runId !==
                mobileDirectionalPageAnimationRunId
              ) {
                resolve();

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

              const progress =
                1 -
                raw;


              renderMorph(
                geometry,
                progress
              );


              if (raw < 1) {
                requestAnimationFrame(
                  step
                );

                return;
              }


              frame.classList.remove(
                "is-open"
              );

              hideMorph();


              /*
                Keep the real outgoing page hidden until the final page-switch
                cleanup. Do not restore opacity here or it can flash back in.
              */
              frame.style.transition =
                "none";

              frame.style.opacity =
                "0";


              resolve();
            };


          requestAnimationFrame(
            step
          );
        }
      );
    };


  const requestMobileDirectionalPage =
    (
      nextName,
      direction
    ) => {
      if (
        iconButtonMode.matches ||
        mobileDirectionalPageSwitchActive ||
        !activePageName ||
        !nextName ||
        nextName === activePageName
      ) {
        return false;
      }


      const previousName =
        activePageName;

      const previousFrame =
        getPageFrame(
          previousName
        );

      const nextFrame =
        getPageFrame(
          nextName
        );


      if (
        !previousFrame ||
        !nextFrame
      ) {
        return false;
      }


      mobileDirectionalPageSwitchActive =
        true;

      syncPageInputOwnership();

      mobileDirectionalPageAnimationRunId +=
        1;

      const runId =
        mobileDirectionalPageAnimationRunId;


      cancelIncomingPageOverlap();

      hideMorph();


      closeSecondaryPanel(
        previousFrame
      );


      /*
        About / Contact have readable copy sitting directly on their glass
        stack. Fade that copy away quickly as soon as an animated mobile page
        handoff begins, while leaving the glass/page choreography untouched.
      */
      if (
        previousName === "about" ||
        previousName === "contact"
      ) {
        previousFrame.classList.add(
          "is-mobile-simple-page-exiting"
        );
      }


      /*
        Keep only these two real frames eligible during the handoff.
      */
      pageFrames.forEach(
        (
          frame,
          pageName
        ) => {
          if (
            pageName !== previousName &&
            pageName !== nextName
          ) {
            frame.classList.remove(
              "is-open"
            );

            clearMobilePageAnimationStyles(
              frame
            );
          }
        }
      );


      updatePrototypePageFrameGeometry(
        previousFrame
      );

      updatePrototypePageFrameGeometry(
        nextFrame
      );


      setSelectedPageIntent(
        nextName
      );

      setActivePageButtonState(
        nextName,
        previousName
      );


      const previousDistance =
        getMobilePageSlideDistance(
          previousFrame
        );

      const nextDistance =
        getMobilePageSlideDistance(
          nextFrame
        );


      /*
        Direction > 0 = finger swiped up / navigating forward.
      */
      let outgoingPromise;
      let incomingPromise;


      if (direction > 0) {
        previousFrame.style.zIndex =
          "22";

        nextFrame.style.zIndex =
          "21";


        const closeDuration =
          getMobilePageMorphGeometry(
            previousName
          )
            ?.settings
            ?.closeDuration ||
          850;


        /*
          Let the incoming page spend a short first phase physically pushing
          the outgoing page smaller. Once the newcomer reaches halfway, the
          compressed old page begins the standard collapse-to-hamburger morph.
        */
        const pushDuration =
          Math.max(
            220,
            closeDuration * 0.44
          );


        outgoingPromise =
          animateMobileForwardPush(
            previousFrame,
            nextFrame,
            {
              nextDistance,
              pushDuration,
              collapseDuration:
                closeDuration,

              runId,
              previousName
            }
          );


        /*
          The helper owns both halves of the incoming slide, so there is no
          separate incoming promise in the forward direction.
        */
        incomingPromise =
          Promise.resolve();
      }

      else {
        previousFrame.style.zIndex =
          "22";

        nextFrame.style.zIndex =
          "21";


        outgoingPromise =
          animateMobilePageSlide(
            previousFrame,
            {
              fromY:
                0,

              toY:
                previousDistance,

              duration:
                getMobilePageMorphGeometry(
                  nextName
                )
                  ?.settings
                  ?.openDuration ||
                900,

              /*
                Keep the old page physically below the viewport until the
                final handoff removes it. Do not let WAAPI snap it home.
              */
              holdFinal:
                true,

              fromOpacity:
                1,

              toOpacity:
                0
            }
          );


        incomingPromise =
          animateMobilePageMorphOpen(
            nextName,
            runId
          );
      }


      Promise.all(
        [
          outgoingPromise,
          incomingPromise
        ]
      )
        .then(
          () => {
            if (
              runId !==
              mobileDirectionalPageAnimationRunId
            ) {
              return;
            }


            /*
              Commit the outgoing frame as CLOSED before removing its temporary
              offscreen transform. This prevents the normal page fade-out CSS
              from becoming visible at the resting position.
            */
            finalizeMobileOutgoingFrame(
              previousFrame
            );


            /*
              Hard-commit ownership after the visual handoff. This also clears
              any stale invisible page that may have survived an earlier
              lightbox/page race and could otherwise intercept the new hero.
            */
            commitSettledMobilePage(
              nextName
            );


            scheduleSecondaryPanelOpen(
              nextFrame
            );


            requestAnimationFrame(
              () => {
                rememberStablePageRect();
              }
            );


            hideMorph();

            morphEngine.clearActive();
          }
        );


      return true;
    };


  const requestMobilePageDirect =
    (name) => {
      const frame =
        getPageFrame(
          name
        );


      if (!frame) {
        return;
      }


      /*
        Mobile prototype:
        the hamburger remains the mobile navigation surface, but once a
        destination is chosen we commit the SAME real page frame directly
        instead of trying to run the desktop/tablet button -> page morph.

        This keeps the game-page internals identical to tablet while we work
        out the eventual mobile-specific opening choreography later.
      */
      cancelIncomingPageOverlap();

      hideMorph();

      pageFrameIsAnimating =
        false;

      pageFrameTargetOpen =
        true;

      pageFrameProgress =
        1;


      /*
        Match desktop/tablet toggle semantics if the currently-open page is
        chosen again from the hamburger.
      */
      if (
        activePageName === name &&
        frame.classList.contains(
          "is-open"
        )
      ) {
        frame.classList.remove(
          "is-open"
        );

        frame.style.transition =
          "";

        activePageName =
          null;

        setSelectedPageIntent(
          null
        );

        setActivePageButtonState(
          null
        );

        pageFrameTargetOpen =
          false;

        pageFrameProgress =
          0;

        syncPageInputOwnership();

        return;
      }


      activePageName =
        name;

      setSelectedPageIntent(
        name
      );

      setActivePageButtonState(
        name
      );


      enforceSingleRealPage(
        name
      );


      updatePrototypePageFrameGeometry(
        frame
      );


      frame.style.transition =
        "";

      frame.classList.add(
        "is-open"
      );

      syncPageInputOwnership();


      requestAnimationFrame(() => {
        rememberStablePageRect();
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


    if (!pageFrames.has(name)) {
      return;
    }


    if (!iconButtonMode.matches) {
      requestMobilePageDirect(
        name
      );

      return;
    }


    /*
      No active page yet: open immediately.
    */
    if (!activePageName) {
      setSelectedPageIntent(
        name
      );

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
          /*
            Keep the current button pressed while its full reverse morph
            plays. startPageClose() releases it only at the very end.
          */
          setSelectedPageIntent(
            null
          );


          startPageClose(
            activePageName
          );
        }

        else {
          setSelectedPageIntent(
            activePageName
          );

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
        /*
          Keep the current button pressed until the reverse morph has been
          completely absorbed back into it.
        */
        setSelectedPageIntent(
          null
        );


        startPageClose(
          activePageName
        );
      }

      else {
        setSelectedPageIntent(
          activePageName
        );

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
    setSelectedPageIntent(
      name
    );


    setActivePageButtonState(
      selectedPageName,
      activePageName
    );


    /*
      Different-page switches now use the exact same COMPLETE reverse
      sequence as clicking the current page button a second time:

        page -> parallelogram -> neck -> home button

      The incoming page begins during the final overlap window, so the
      handoff can still feel continuous rather than strictly sequential.
    */
    startPageClose(
      activePageName,
      name
    );
  };



  /* =======================================================
     Sequential wheel / trackpad page navigation
     ======================================================= */

  const getNextPageName =
    (name) => {
      const index =
        pageNames.indexOf(
          name
        );


      if (
        index < 0 ||
        index >=
          pageNames.length - 1
      ) {
        return null;
      }


      return pageNames[
        index + 1
      ];
    };


  const requestNextPage =
    (name) => {
      const nextPageName =
        getNextPageName(
          name
        );


      if (!nextPageName) {
        return false;
      }


      if (!iconButtonMode.matches) {
        return requestMobileDirectionalPage(
          nextPageName,
          1
        );
      }


      /*
        Tablet/desktop keep the existing page-switch path unchanged.
      */
      requestPage(
        nextPageName
      );


      return true;
    };


  const getPreviousPageName =
    (name) => {
      const index =
        pageNames.indexOf(
          name
        );


      if (index <= 0) {
        return null;
      }


      return pageNames[
        index - 1
      ];
    };


  const requestPreviousPage =
    (name) => {
      const previousPageName =
        getPreviousPageName(
          name
        );


      if (!previousPageName) {
        return false;
      }


      if (!iconButtonMode.matches) {
        return requestMobileDirectionalPage(
          previousPageName,
          -1
        );
      }


      requestPage(
        previousPageName
      );


      return true;
    };


  /* =======================================================
     Mobile directional color-swipe feedback
     ======================================================= */

  let mobileSwipeFeedbackLayer =
    null;

  let mobileSwipeFeedbackRunId =
    0;


  const ensureMobileSwipeFeedbackLayer =
    () => {
      if (mobileSwipeFeedbackLayer) {
        return mobileSwipeFeedbackLayer;
      }


      const background =
        document.querySelector(
          ".site-background"
        );


      let clip =
        background?.querySelector(
          ".mobile-swipe-feedback-clip"
        );


      if (
        background &&
        !clip
      ) {
        clip =
          document.createElement(
            "div"
          );


        clip.className =
          "mobile-swipe-feedback-clip";

        clip.setAttribute(
          "aria-hidden",
          "true"
        );


        background.appendChild(
          clip
        );
      }


      const layer =
        document.createElement(
          "div"
        );


      layer.className =
        "mobile-swipe-feedback";

      layer.setAttribute(
        "aria-hidden",
        "true"
      );


      /*
        Keep the light sweep inside the exact same inner opening as the
        background video. If the background wrapper is unavailable for any
        reason, fall back to <body> so the feedback still functions.
      */
      (
        clip ||
        document.body
      ).appendChild(
        layer
      );


      mobileSwipeFeedbackLayer =
        layer;


      return layer;
    };


  const getPageAccentRgbTriplet =
    (pageName) => {
      const frame =
        getPageFrame(
          pageName
        );


      if (frame) {
        const value =
          getComputedStyle(
            frame
          )
            .getPropertyValue(
              "--page-accent-rgb"
            )
            .trim();


        if (value) {
          return value;
        }
      }


      /*
        Fallback directly to the master variables in :root.
      */
      const rootStyle =
        getComputedStyle(
          document.documentElement
        );


      const fallbackName =
        `--accent-${pageName}-rgb`;


      return (
        rootStyle
          .getPropertyValue(
            fallbackName
          )
          .trim()
        ||
        "255, 114, 2"
      );
    };


  const playMobileVerticalSwipeFeedback =
    (
      direction,
      fromPageName,
      toPageName = fromPageName
    ) => {
      if (
        iconButtonMode.matches ||
        direction === 0 ||
        !fromPageName
      ) {
        return;
      }


      const layer =
        ensureMobileSwipeFeedbackLayer();


      const runId =
        ++mobileSwipeFeedbackRunId;


      const fromRgb =
        getPageAccentRgbTriplet(
          fromPageName
        );

      const toRgb =
        getPageAccentRgbTriplet(
          toPageName ||
          fromPageName
        );


      layer.style.setProperty(
        "--mobile-swipe-from-rgb",
        fromRgb
      );


      layer.style.setProperty(
        "--mobile-swipe-to-rgb",
        toRgb
      );


      layer.classList.remove(
        "is-swipe-up",
        "is-swipe-down",
        "is-swipe-left",
        "is-swipe-right",
        "is-running"
      );


      /*
        Flush the reset state so repeated swipes can replay immediately.
      */
      layer.getBoundingClientRect();


      layer.classList.add(
        direction > 0
          ? "is-swipe-up"
          : "is-swipe-down"
      );


      requestAnimationFrame(
        () => {
          if (
            runId !==
            mobileSwipeFeedbackRunId
          ) {
            return;
          }


          layer.classList.add(
            "is-running"
          );
        }
      );
    };

  const playMobileHorizontalSwipeFeedback =
    (
      direction,
      pageName
    ) => {
      if (
        iconButtonMode.matches ||
        direction === 0 ||
        !pageName
      ) {
        return;
      }


      const layer =
        ensureMobileSwipeFeedbackLayer();


      const runId =
        ++mobileSwipeFeedbackRunId;


      const rgb =
        getPageAccentRgbTriplet(
          pageName
        );


      layer.style.setProperty(
        "--mobile-swipe-from-rgb",
        rgb
      );


      layer.style.setProperty(
        "--mobile-swipe-to-rgb",
        rgb
      );


      layer.classList.remove(
        "is-swipe-up",
        "is-swipe-down",
        "is-swipe-left",
        "is-swipe-right",
        "is-running"
      );


      layer.getBoundingClientRect();


      layer.classList.add(
        direction > 0
          ? "is-swipe-left"
          : "is-swipe-right"
      );


      requestAnimationFrame(
        () => {
          if (
            runId !==
            mobileSwipeFeedbackRunId
          ) {
            return;
          }


          layer.classList.add(
            "is-running"
          );
        }
      );
    };



  /*
    Desktop:
      one deliberate downward wheel/trackpad gesture = next page.

    A fired gesture stays latched until BOTH:
      - wheel input has gone quiet
      - the page-switch animation has finished

    This prevents inertial trackpad momentum from skipping multiple pages.
  */
  let desktopPageWheelIntent =
    0;

  let desktopPageWheelDirection =
    0;

  let desktopPageWheelResetTimer =
    null;

  let desktopPageWheelLatched =
    false;


  const resetDesktopPageWheelIntent =
    () => {
      desktopPageWheelIntent =
        0;

      desktopPageWheelDirection =
        0;

      desktopPageWheelResetTimer =
        null;
    };


  const tryReleaseDesktopPageWheelLatch =
    () => {
      if (!desktopPageWheelLatched) {
        return;
      }


      if (pageFrameIsAnimating) {
        desktopPageWheelResetTimer =
          setTimeout(
            tryReleaseDesktopPageWheelLatch,
            90
          );

        return;
      }


      desktopPageWheelLatched =
        false;

      resetDesktopPageWheelIntent();
    };


  const scheduleDesktopPageWheelReset =
    () => {
      if (desktopPageWheelResetTimer) {
        clearTimeout(
          desktopPageWheelResetTimer
        );
      }


      desktopPageWheelResetTimer =
        setTimeout(
          () => {
            if (desktopPageWheelLatched) {
              tryReleaseDesktopPageWheelLatch();
            }

            else {
              resetDesktopPageWheelIntent();
            }
          },
          220
        );
    };


  const handleDesktopPageWheel =
    (event) => {
      /*
        Tablet has its own two-stage media -> info -> next-page controller.
      */
      if (
        !fullTextDesktopMode.matches ||
        !activePageName ||
        !getPageFrame(
          activePageName
        )?.classList.contains(
          "is-open"
        ) ||
        isMediaLightboxBusy()
      ) {
        return;
      }


      if (
        Math.abs(event.deltaX) >
        Math.abs(event.deltaY) ||
        Math.abs(event.deltaY) < 1
      ) {
        return;
      }


      const direction =
        Math.sign(
          event.deltaY
        );


      const destinationPageName =
        direction > 0
          ? getNextPageName(
              activePageName
            )
          : getPreviousPageName(
              activePageName
            );


      if (!destinationPageName) {
        resetDesktopPageWheelIntent();
        return;
      }


      /*
        Once this gesture has fired, continue consuming its momentum until
        the gesture has gone quiet and the page switch is fully settled.
      */
      if (desktopPageWheelLatched) {
        event.preventDefault();

        scheduleDesktopPageWheelReset();

        return;
      }


      event.preventDefault();


      if (
        direction !==
        desktopPageWheelDirection
      ) {
        desktopPageWheelIntent =
          0;

        desktopPageWheelDirection =
          direction;
      }


      const absoluteDelta =
        Math.abs(
          event.deltaY
        );


      const isCoarseWheelStep =
        event.deltaMode !== 0 ||
        absoluteDelta >= 24;


      if (isCoarseWheelStep) {
        desktopPageWheelLatched =
          (
            direction > 0
              ? requestNextPage(
                  activePageName
                )
              : requestPreviousPage(
                  activePageName
                )
          );


        scheduleDesktopPageWheelReset();

        return;
      }


      desktopPageWheelIntent +=
        Math.min(
          absoluteDelta,
          20
        );


      scheduleDesktopPageWheelReset();


      if (
        desktopPageWheelIntent >=
        34
      ) {
        desktopPageWheelLatched =
          (
            direction > 0
              ? requestNextPage(
                  activePageName
                )
              : requestPreviousPage(
                  activePageName
                )
          );
      }
    };


  document.addEventListener(
    "wheel",
    handleDesktopPageWheel,
    {
      passive: false
    }
  );



  /*
    Tablet non-game pages
    ---------------------
    The game pages have their own two-stage tablet controller, but About does
    not. Give non-game pages the same deliberate downward sequential
    navigation used on desktop so About -> Brobots works naturally.

    Game pages are explicitly excluded here to avoid competing with their
    media/info gesture state machine.
  */
  let tabletPageWheelIntent =
    0;

  let tabletPageWheelLatched =
    false;

  let tabletPageWheelResetTimer =
    null;


  const resetTabletPageWheel =
    () => {
      tabletPageWheelIntent =
        0;

      tabletPageWheelLatched =
        false;

      tabletPageWheelResetTimer =
        null;
    };


  const scheduleTabletPageWheelReset =
    () => {
      if (
        tabletPageWheelResetTimer
      ) {
        clearTimeout(
          tabletPageWheelResetTimer
        );
      }


      tabletPageWheelResetTimer =
        setTimeout(
          () => {
            if (pageFrameIsAnimating) {
              scheduleTabletPageWheelReset();
              return;
            }


            resetTabletPageWheel();
          },
          220
        );
    };


  const handleTabletNonGameWheel =
    (event) => {
      if (
        !gameFrameTabletMode.matches ||
        !activePageName ||
        [
          "brobots",
          "etherian",
          "halodoom"
        ].includes(
          activePageName
        ) ||
        !getPageFrame(
          activePageName
        )?.classList.contains(
          "is-open"
        ) ||
        isMediaLightboxBusy()
      ) {
        return;
      }


      if (
        Math.abs(event.deltaX) >
        Math.abs(event.deltaY) ||
        Math.abs(event.deltaY) < 1
      ) {
        return;
      }


      const direction =
        Math.sign(
          event.deltaY
        );


      const destinationPageName =
        direction > 0
          ? getNextPageName(
              activePageName
            )
          : getPreviousPageName(
              activePageName
            );


      if (!destinationPageName) {
        tabletPageWheelIntent =
          0;

        return;
      }


      event.preventDefault();


      if (tabletPageWheelLatched) {
        scheduleTabletPageWheelReset();
        return;
      }


      const absoluteDelta =
        Math.abs(
          event.deltaY
        );


      const isCoarseWheelStep =
        event.deltaMode !== 0 ||
        absoluteDelta >= 24;


      if (isCoarseWheelStep) {
        tabletPageWheelLatched =
          (
            direction > 0
              ? requestNextPage(
                  activePageName
                )
              : requestPreviousPage(
                  activePageName
                )
          );


        scheduleTabletPageWheelReset();

        return;
      }


      tabletPageWheelIntent +=
        Math.min(
          absoluteDelta,
          20
        );


      scheduleTabletPageWheelReset();


      if (
        tabletPageWheelIntent >=
        34
      ) {
        tabletPageWheelLatched =
          (
            direction > 0
              ? requestNextPage(
                  activePageName
                )
              : requestPreviousPage(
                  activePageName
                )
          );
      }
    };


  document.addEventListener(
    "wheel",
    handleTabletNonGameWheel,
    {
      passive: false
    }
  );



  /*
    Touch equivalent for the non-game pages.

    Game pages deliberately keep their own richer media/info gesture state
    machine. About / Contact only need direct sequential navigation:
      finger up   -> next page
      finger down -> previous page

    Claim a clearly vertical gesture early so mobile browser overscroll /
    pull-to-refresh never steals it, but keep the larger movement threshold
    before actually switching pages.
  */

  /*
    Mobile open-page swipe ownership
    --------------------------------
    While any real page is open, vertical touch movement belongs to the site,
    not the browser. This prevents native document scrolling, rubber-banding,
    pull-to-refresh, etc. from appearing between our gesture states.

    About is the one deliberate exception:
      - pulling DOWN on About is left native, so the browser can still perform
        its normal top-of-page refresh gesture if the user wants it.
      - upward movement on About is still owned by the site so About -> Brobots
        remains reliable.

    This is a capture-phase guard only. It calls preventDefault() but does NOT
    stop propagation, so the existing game/non-game gesture controllers still
    receive the same touchmove and perform the actual navigation.
  */
  let mobilePageSwipeLockStartX =
    0;

  let mobilePageSwipeLockStartY =
    0;

  let mobilePageSwipeLockTracking =
    false;


  const clearMobilePageSwipeLock =
    () => {
      mobilePageSwipeLockTracking =
        false;
    };


  document.addEventListener(
    "touchstart",
    (event) => {
      if (
        !gameFrameTabletMode.matches ||
        !getInteractivePageName() ||
        event.touches.length !== 1
      ) {
        clearMobilePageSwipeLock();

        return;
      }


      const touch =
        event.touches[0];


      mobilePageSwipeLockStartX =
        touch.clientX;

      mobilePageSwipeLockStartY =
        touch.clientY;

      mobilePageSwipeLockTracking =
        true;
    },
    {
      passive: true,
      capture: true
    }
  );


  document.addEventListener(
    "touchmove",
    (event) => {
      if (
        !mobilePageSwipeLockTracking ||
        event.touches.length !== 1
      ) {
        return;
      }


      const touch =
        event.touches[0];

      const deltaX =
        touch.clientX -
        mobilePageSwipeLockStartX;

      const deltaY =
        touch.clientY -
        mobilePageSwipeLockStartY;


      const verticalIntentIsClear =
        Math.abs(deltaY) >= 6 &&
        Math.abs(deltaY) >
          Math.abs(deltaX) * 1.05;


      if (!verticalIntentIsClear) {
        return;
      }


      /*
        About + finger moving DOWN:
        deliberately leave native overscroll / refresh available.
      */
      if (
        activePageName === "about" &&
        deltaY > 0
      ) {
        return;
      }


      event.preventDefault();
    },
    {
      passive: false,
      capture: true
    }
  );


  document.addEventListener(
    "touchend",
    clearMobilePageSwipeLock,
    {
      passive: true,
      capture: true
    }
  );


  document.addEventListener(
    "touchcancel",
    clearMobilePageSwipeLock,
    {
      passive: true,
      capture: true
    }
  );


  [
    "about",
    "contact"
  ].forEach((pageName) => {
    const frame =
      getPageFrame(
        pageName
      );


    if (!frame) {
      return;
    }


    let touchStartX =
      0;

    let touchStartY =
      0;

    let touchTracking =
      false;

    let touchConsumed =
      false;


    const clearTouch =
      () => {
        touchTracking =
          false;

        touchConsumed =
          false;
      };


    frame.addEventListener(
      "touchstart",
      (event) => {
        if (
          !gameFrameTabletMode.matches ||
          !pageOwnsInput(
            pageName
          ) ||
          event.touches.length !== 1
        ) {
          clearTouch();

          return;
        }


        const touch =
          event.touches[0];


        touchStartX =
          touch.clientX;

        touchStartY =
          touch.clientY;

        touchTracking =
          true;

        touchConsumed =
          false;
      },
      {
        passive: true
      }
    );


    frame.addEventListener(
      "touchmove",
      (event) => {
        if (
          !touchTracking ||
          touchConsumed ||
          event.touches.length !== 1
        ) {
          return;
        }


        const touch =
          event.touches[0];

        const deltaX =
          touch.clientX -
          touchStartX;

        const deltaY =
          touch.clientY -
          touchStartY;


        const verticalIntentIsClear =
          Math.abs(deltaY) >= 8 &&
          Math.abs(deltaY) >
            Math.abs(deltaX) * 1.1;


        if (verticalIntentIsClear) {
          event.preventDefault();
        }


        if (
          Math.abs(deltaY) < 46 ||
          !verticalIntentIsClear
        ) {
          return;
        }


        /*
          Finger moving UP means forward/down through the site.
          Finger moving DOWN means backward/up through the site.
        */
        const direction =
          deltaY < 0
            ? 1
            : -1;


        const destinationPageName =
          direction > 0
            ? getNextPageName(
                pageName
              )
            : getPreviousPageName(
                pageName
              );


        if (destinationPageName) {
          playMobileVerticalSwipeFeedback(
            direction,
            pageName,
            destinationPageName
          );
        }


        const switched =
          direction > 0
            ? requestNextPage(
                pageName
              )
            : requestPreviousPage(
                pageName
              );


        if (switched) {
          touchConsumed =
            true;

          event.preventDefault();
        }
      },
      {
        passive: false
      }
    );


    frame.addEventListener(
      "touchend",
      clearTouch,
      {
        passive: true
      }
    );


    frame.addEventListener(
      "touchcancel",
      clearTouch,
      {
        passive: true
      }
    );
  });


  /* =======================================================
     Initial state
     ======================================================= */

  closeMenu({
    immediate: true
  });


  /*
    Always begin the site on About, regardless of responsive mode.

    Do not begin the About opening sequence underneath the loading screen.
    Wait until the critical assets are ready AND the loader has completely
    faded/been removed, then let About perform its normal opening behavior.
  */
  sitePreloaderReady.then(
    () => {
      requestAnimationFrame(
        () => {
          requestPage(
            "about"
          );


          requestAnimationFrame(
            syncPageInputOwnership
          );
        }
      );
    }
  );


  /* =======================================================
     Interactions
     ======================================================= */

  /*
    Internal content links can opt into the exact same page controller used
    by the header/mobile navigation. This avoids a browser hash jump and
    keeps the normal morph/background/active-button behavior intact.
  */
  document
    .querySelectorAll(
      ".page-jump-link[data-page-jump]"
    )
    .forEach((link) => {
      link.addEventListener(
        "click",
        (event) => {
          const pageName =
            link.dataset.pageJump ||
            "";


          if (
            !pageFrames.has(
              pageName
            )
          ) {
            return;
          }


          event.preventDefault();


          requestPage(
            pageName
          );
        }
      );
    });


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


        /*
          PC + tablet: the currently open/selected page button is inert.
          The active class is already the page controller's source of truth
          for the pressed nav state, so reuse it instead of introducing a
          second responsive-state check here.

          Mobile hamburger-menu links are intentionally unaffected.
        */
        if (
          button.classList.contains(
            "is-page-active"
          )
        ) {
          return;
        }


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
        (event) => {
          if (!menuInteractive) {
            event.preventDefault();

            return;
          }


          const href =
            link.getAttribute(
              "href"
            ) ||
            "";

          const pageName =
            href.startsWith("#")
              ? href.slice(1)
              : "";


          if (
            pageFrames.has(
              pageName
            )
          ) {
            /*
              The page-frame system owns these five destinations on mobile
              now, so do not let the browser's hash jump compete with it.
            */
            event.preventDefault();


            requestPage(
              pageName
            );
          }


          /*
            If the real menu is already interactive while the decorative
            opening morph is still finishing, reverse that morph from its
            current frame rather than hard-resetting it.
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
      "(min-width: 751px)"
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


  /*
    Game-info responsive content snapshot
    -------------------------------------
    Shared by Etherian, Halodoom, and future game pages that use
    .game-info-surface.
  */
  const gameInfoDesktopSnapshots =
    new Map();

  const gameInfoResponsiveOverlays =
    new Map();

  const gameInfoResponsiveOverlayAnimations =
    new Map();

  const gameInfoTabletFadeAnimations =
    new Map();


  const getGameInfoSurface = (
    frame
  ) => {
    return (
      frame?.querySelector(
        ".game-info-surface"
      ) ||
      null
    );
  };


  const copyComputedStyleTree = (
    source,
    clone
  ) => {
    if (
      !(source instanceof Element) ||
      !(clone instanceof Element)
    ) {
      return;
    }


    const styles =
      getComputedStyle(
        source
      );


    for (
      let index = 0;
      index < styles.length;
      index += 1
    ) {
      const property =
        styles[index];


      clone.style.setProperty(
        property,
        styles.getPropertyValue(
          property
        ),
        styles.getPropertyPriority(
          property
        )
      );
    }


    const sourceChildren =
      Array.from(
        source.children
      );


    const cloneChildren =
      Array.from(
        clone.children
      );


    sourceChildren.forEach(
      (
        child,
        index
      ) => {
        copyComputedStyleTree(
          child,
          cloneChildren[index]
        );
      }
    );
  };


  const captureActiveGameInfoDesktopSnapshot = () => {
    if (
      !fullTextDesktopMode.matches ||
      pageLayoutTransitionActive ||
      !activePageName
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


    const surface =
      getGameInfoSurface(
        frame
      );


    if (!surface) {
      return;
    }


    const rect =
      copyRect(
        surface.getBoundingClientRect()
      );


    if (
      !rect ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return;
    }


    const clone =
      surface.cloneNode(
        true
      );


    copyComputedStyleTree(
      surface,
      clone
    );


    clone.removeAttribute(
      "id"
    );


    clone.querySelectorAll(
      "[id]"
    ).forEach(
      (element) => {
        element.removeAttribute(
          "id"
        );
      }
    );


    gameInfoDesktopSnapshots.set(
      frame,
      {
        clone,
        rect,
        viewportWidth:
          window.innerWidth
      }
    );
  };


  const clearGameInfoResponsiveFadeArtifacts = (
    frame
  ) => {
    if (!frame) {
      return;
    }


    const overlayAnimation =
      gameInfoResponsiveOverlayAnimations.get(
        frame
      );


    if (overlayAnimation) {
      overlayAnimation.cancel();

      gameInfoResponsiveOverlayAnimations.delete(
        frame
      );
    }


    const overlay =
      gameInfoResponsiveOverlays.get(
        frame
      );


    if (overlay) {
      overlay.remove();

      gameInfoResponsiveOverlays.delete(
        frame
      );
    }


    const tabletAnimation =
      gameInfoTabletFadeAnimations.get(
        frame
      );


    if (tabletAnimation) {
      tabletAnimation.cancel();

      gameInfoTabletFadeAnimations.delete(
        frame
      );
    }


    const surface =
      getGameInfoSurface(
        frame
      );


    if (surface) {
      surface.style.removeProperty(
        "opacity"
      );
    }
  };


  const showGameInfoDesktopSnapshot = (
    frame,
    duration = 650
  ) => {
    const snapshot =
      gameInfoDesktopSnapshots.get(
        frame
      );


    const surface =
      getGameInfoSurface(
        frame
      );


    if (
      !frame ||
      !surface ||
      !snapshot
    ) {
      return Promise.resolve();
    }


    clearGameInfoResponsiveFadeArtifacts(
      frame
    );


    surface.style.opacity =
      "0";


    const {
      clone,
      rect
    } =
      snapshot;


    const overlay =
      clone.cloneNode(
        true
      );


    Object.assign(
      overlay.style,
      {
        position:
          "fixed",

        left:
          `${rect.left}px`,

        top:
          `${rect.top}px`,

        width:
          `${rect.width}px`,

        height:
          `${rect.height}px`,

        margin:
          "0",

        transform:
          "none",

        transformOrigin:
          "top left",

        opacity:
          "1",

        pointerEvents:
          "none",

        zIndex:
          "999"
      }
    );


    overlay.setAttribute(
      "aria-hidden",
      "true"
    );


    document.body.appendChild(
      overlay
    );


    gameInfoResponsiveOverlays.set(
      frame,
      overlay
    );


    const animation =
      overlay.animate(
        [
          {
            opacity: 1
          },
          {
            opacity: 0
          }
        ],
        {
          duration:
            Math.max(
              1,
              duration
            ),

          easing:
            "ease-in-out",

          fill:
            "forwards"
        }
      );


    gameInfoResponsiveOverlayAnimations.set(
      frame,
      animation
    );


    return animation.finished
      .catch(
        () => {}
      )
      .then(
        () => {
          if (
            gameInfoResponsiveOverlayAnimations.get(
              frame
            ) !== animation
          ) {
            return;
          }


          gameInfoResponsiveOverlayAnimations.delete(
            frame
          );


          if (
            gameInfoResponsiveOverlays.get(
              frame
            ) === overlay
          ) {
            gameInfoResponsiveOverlays.delete(
              frame
            );
          }


          overlay.remove();
        }
      );
  };


  const fadeGameInfoTabletIn = (
    frame,
    runId,
    duration = 650
  ) => {
    const surface =
      getGameInfoSurface(
        frame
      );


    if (!surface) {
      return;
    }


    const oldAnimation =
      gameInfoTabletFadeAnimations.get(
        frame
      );


    if (oldAnimation) {
      oldAnimation.cancel();

      gameInfoTabletFadeAnimations.delete(
        frame
      );
    }


    surface.style.opacity =
      "0";


    surface.getBoundingClientRect();


    const animation =
      surface.animate(
        [
          {
            opacity: 0
          },
          {
            opacity: 1
          }
        ],
        {
          duration:
            Math.max(
              1,
              duration
            ),

          easing:
            "ease-in-out",

          fill:
            "forwards"
        }
      );


    gameInfoTabletFadeAnimations.set(
      frame,
      animation
    );


    animation.finished
      .catch(
        () => {}
      )
      .then(
        () => {
          if (
            gameInfoTabletFadeAnimations.get(
              frame
            ) !== animation
          ) {
            return;
          }


          gameInfoTabletFadeAnimations.delete(
            frame
          );


          if (
            runId !==
            pageLayoutTransitionRunId
          ) {
            return;
          }


          surface.style.removeProperty(
            "opacity"
          );


          animation.cancel();
        }
      );
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


        /*
          Keep media rails locked to their logical first-visible item on
          the same animation frame as the page-frame resize.
        */
        syncMediaRailsForLayout();


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

      syncMediaRailsForLayout();


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

    syncMediaRailsForLayout();

    requestAnimationFrame(() => {
      syncMediaRailsForLayout();
    });
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
      A breakpoint can reverse before the previous fade has completed.
      Always start from a clean visual ownership state.
    */
    clearGameInfoResponsiveFadeArtifacts(
      frame
    );


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

    syncMediaRailsForLayout();


    frame.getBoundingClientRect();


    if (!enteringDesktop) {
      /*
        DESKTOP -> TABLET
        1. Hold the frame at the old desktop rectangle.
        2. Fade the last PRE-BREAKPOINT Etherian desktop snapshot.
        3. Retract the glass sidebar normally underneath it.
        4. Keep the already-reflowed live tablet info hidden.
        5. Resize into tablet only after the outgoing desktop visual is gone.
      */
      await Promise.all(
        [
          waitForSecondaryPanelClose(
            frame,
            runId
          ),

          showGameInfoDesktopSnapshot(
            frame,
            340
          )
        ]
      );


      if (runId !== pageLayoutTransitionRunId) {
        clearGameInfoResponsiveFadeArtifacts(
          frame
        );

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

    syncMediaRailsForLayout();

    requestAnimationFrame(() => {
      syncMediaRailsForLayout();
    });


    lastStablePageRect =
      copyRect(
        frame.getBoundingClientRect()
      );


    if (enteringDesktop) {
      /*
        Preserve the known-good tablet -> desktop reveal behavior.
      */
      clearGameInfoResponsiveFadeArtifacts(
        frame
      );


      scheduleSecondaryPanelOpen(
        frame
      );
    }

    else {
      /*
        The real tablet layout is now settled. Bring its content in only
        after the frozen desktop snapshot has completely disappeared.
      */
      fadeGameInfoTabletIn(
        frame,
        runId,
        360
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


  const readMobileCollapseDuration = (
    variableName,
    fallback
  ) => {
    return parseCssTime(
      getComputedStyle(
        document.documentElement
      ).getPropertyValue(
        variableName
      ),
      fallback
    );
  };


  const getLiveHamburgerRect = () => {
    return copyRect(
      menuToggle.getBoundingClientRect()
    );
  };


  /*
    Generic rectangle animation whose DESTINATION is re-measured every RAF.

    This is important because the hamburger continues changing width while
    the viewport is being dragged through the mobile breakpoint. Capturing
    its rectangle once produces the offset/misalignment seen in the clip.
  */
  const animateRectToLiveHamburger = (
    element,
    fromRect,
    duration,
    easingName,
    {
      fadeOut = false,
      onFrame = null
    } = {}
  ) => {
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


    return new Promise((resolve) => {
      const startTime =
        performance.now();


      const step = (now) => {
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


        const targetRect =
          getLiveHamburgerRect();


        if (!targetRect) {
          resolve();

          return;
        }


        const currentRect = {
          left:
            lerp(
              fromRect.left,
              targetRect.left,
              t
            ),

          top:
            lerp(
              fromRect.top,
              targetRect.top,
              t
            ),

          width:
            lerp(
              fromRect.width,
              targetRect.width,
              t
            ),

          height:
            lerp(
              fromRect.height,
              targetRect.height,
              t
            )
        };


        Object.assign(
          element.style,
          {
            left:
              `${currentRect.left}px`,

            top:
              `${currentRect.top}px`,

            width:
              `${currentRect.width}px`,

            height:
              `${currentRect.height}px`
          }
        );


        if (fadeOut) {
          element.style.opacity =
            String(
              1 -
              easeInCubic(raw)
            );
        }


        if (
          typeof onFrame ===
          "function"
        ) {
          onFrame(
            raw,
            currentRect,
            targetRect
          );
        }


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
  };


  /*
    PAGE -> live hamburger

    The real page becomes display:none at <=750px, so use the last stable
    desktop/tablet rectangle as a temporary visual shell. Unlike the first
    experiment, the hamburger/source geometry is rebuilt EVERY FRAME.
  */
  const collapseOpenPageIntoLiveHamburger = async (
    collapseRunId
  ) => {
    if (
      !activePageName ||
      !lastStablePageRect
    ) {
      return false;
    }


    const frame =
      getPageFrame(
        activePageName
      );


    if (!frame) {
      return false;
    }


    const cachedPageRect =
      copyRect(
        lastStablePageRect
      );


    if (
      !cachedPageRect ||
      cachedPageRect.width <= 0 ||
      cachedPageRect.height <= 0
    ) {
      return false;
    }


    /*
      Keep the REAL page visible just long enough to crossfade into the
      temporary reverse-morph shell. Mobile CSS would otherwise make it
      disappear instantly at the breakpoint.

      IMPORTANT:
      The viewport has already crossed <=750px at this point, so child
      elements would normally reflow into their mobile layout BEFORE the
      real page fades. Freeze the outgoing Brobots interior in its
      tablet/desktop composition for the duration of this handoff.
    */
    frame.classList.add(
      "is-mobile-collapse-hold"
    );


    const savedFrameInline = {
      display:
        frame.style.display,

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

      opacity:
        frame.style.opacity,

      transition:
        frame.style.transition,

      pointerEvents:
        frame.style.pointerEvents
    };


    Object.assign(
      frame.style,
      {
        display:
          "block",

        left:
          `${cachedPageRect.left}px`,

        top:
          `${cachedPageRect.top}px`,

        right:
          "auto",

        bottom:
          "auto",

        width:
          `${cachedPageRect.width}px`,

        height:
          `${cachedPageRect.height}px`,

        opacity:
          "1",

        pointerEvents:
          "none",

        transition:
          "none"
      }
    );


    /*
      Force the held desktop/tablet frame into layout before beginning
      its short fade.
    */
    frame.getBoundingClientRect();


    const realPageFadeDuration =
      Math.max(
        1,
        readMobileCollapseDuration(
          "--mobile-page-real-fade-duration",
          220
        )
      );


    frame.style.transition =
      `opacity ${realPageFadeDuration}ms ease`;


    requestAnimationFrame(() => {
      frame.style.opacity =
        "0";
    });


    const targetDescriptor = {
      getSourceElement: () =>
        menuToggle,

      getTargetElement: () =>
        frame,

      getFinalRect: () =>
        cachedPageRect,

      buildFormPath:
        buildFormPath,

      settingsFamily:
        "page",

      shapeType:
        "page"
    };


    const duration =
      Math.max(
        1,
        readMobileCollapseDuration(
          "--mobile-ui-collapse-duration",
          620
        )
      );


    showMorph();

    menuMorph.style.transition =
      "none";

    menuMorph.style.opacity =
      "1";


    /*
      Keep the hamburger visible throughout the page collapse.
    */
    await new Promise((resolve) => {
      const startTime =
        performance.now();


      const step = (now) => {
        if (
          collapseRunId !==
          mobileUiCollapseRunId
        ) {
          resolve();

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
          Rebuild geometry from the hamburger's CURRENT rectangle every RAF.
        */
        const geometry =
          getMorphGeometry(
            targetDescriptor
          );


        if (!geometry) {
          resolve();

          return;
        }


        /*
          This is a page retracting INTO the hamburger, not a hamburger
          opening a page. getMorphGeometry() therefore sees the hamburger
          as the source and would normally choose its orange accent.

          Explicitly preserve the outgoing PAGE accent for the retracting
          neck/shell so Etherian stays cyan, Brobots stays gold, etc.
        */
        const pageAccent =
          getFrameAccentRgb(
            frame
          );


        geometry.settings.startFill = {
          ...pageAccent,
          a: 0.25
        };

        geometry.settings.startStroke = {
          ...pageAccent,
          a: 0.48
        };


        renderMorph(
          geometry,
          1 - easeInOutCubic(raw)
        );


        menuMorph.setAttribute(
          "viewBox",
          `0 0 ${window.innerWidth} ${window.innerHeight}`
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


    hideMorph();


    /*
      Give responsive CSS ownership back now that the crossfade/morph is
      finished. resetPageFrames() runs immediately afterward and preserves
      the existing clean mobile state.
    */
    const restoreInline = (
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


    restoreInline(
      "display",
      savedFrameInline.display
    );

    restoreInline(
      "left",
      savedFrameInline.left
    );

    restoreInline(
      "top",
      savedFrameInline.top
    );

    restoreInline(
      "right",
      savedFrameInline.right
    );

    restoreInline(
      "bottom",
      savedFrameInline.bottom
    );

    restoreInline(
      "width",
      savedFrameInline.width
    );

    restoreInline(
      "height",
      savedFrameInline.height
    );

    restoreInline(
      "opacity",
      savedFrameInline.opacity
    );

    restoreInline(
      "transition",
      savedFrameInline.transition
    );

    restoreInline(
      "pointer-events",
      savedFrameInline.pointerEvents
    );


    frame.classList.remove(
      "is-mobile-collapse-hold"
    );


    return (
      collapseRunId ===
      mobileUiCollapseRunId
    );
  };


  /*
    LIGHTBOX -> live hamburger

    Uses completely standalone temporary elements. It does NOT call or
    modify createLightboxButtonMorph(), so the normal X-button alignment,
    styling and open/close behavior remain exactly as they were before
    this mobile experiment.
  */
  const collapseOpenLightboxIntoLiveHamburger = async (
    collapseRunId
  ) => {
    const lightbox =
      document.querySelector(
        "[data-media-lightbox].is-open"
      );


    if (
      !lightbox ||
      mediaLightboxState.isAnimating
    ) {
      return false;
    }


    const image =
      lightbox.querySelector(
        ".media-lightbox-image"
      );

    const closeButton =
      lightbox.querySelector(
        ".media-lightbox-close"
      );


    if (
      !image ||
      !closeButton
    ) {
      return false;
    }


    mediaLightboxState.isAnimating =
      true;

    syncPageInputOwnership();


    const imageRect =
      copyRect(
        image.getBoundingClientRect()
      );

    const xRect =
      copyRect(
        closeButton.getBoundingClientRect()
      );


    if (
      !imageRect ||
      !xRect
    ) {
      finalizeMediaLightboxClosedState(
        lightbox
      );

      return false;
    }


    const duration =
      Math.max(
        1,
        readMobileCollapseDuration(
          "--mobile-lightbox-collapse-duration",
          560
        )
      );


    const easing =
      getMediaLightboxTiming()
        .easing;


    /*
      Temporary screenshot.
    */
    const imageProxy =
      document.createElement(
        "img"
      );


    imageProxy.className =
      "media-lightbox-image-morph";

    imageProxy.src =
      image.src;

    imageProxy.alt = "";


    Object.assign(
      imageProxy.style,
      {
        left:
          `${imageRect.left}px`,

        top:
          `${imageRect.top}px`,

        width:
          `${imageRect.width}px`,

        height:
          `${imageRect.height}px`,

        clipPath:
          rectangularSixPointClip
      }
    );


    /*
      Temporary X surface: clone the real button instead of using the normal
      lightbox morph helper. This avoids touching any of the source-button
      bookkeeping used by ordinary lightbox operation.
    */
    const xProxy =
      closeButton.cloneNode(
        true
      );


    xProxy.removeAttribute(
      "id"
    );

    xProxy.removeAttribute(
      "data-media-lightbox-close"
    );

    xProxy.classList.add(
      "media-lightbox-mobile-collapse-x"
    );


    Object.assign(
      xProxy.style,
      {
        position:
          "fixed",

        zIndex:
          "5004",

        right:
          "auto",

        left:
          `${xRect.left}px`,

        top:
          `${xRect.top}px`,

        width:
          `${xRect.width}px`,

        height:
          `${xRect.height}px`,

        opacity:
          "1",

        pointerEvents:
          "none"
      }
    );


    document.body.append(
      imageProxy,
      xProxy
    );


    /*
      Proxies own the visible transition from this point.
    */
    image.style.visibility =
      "hidden";

    closeButton.style.visibility =
      "hidden";

    lightbox.classList.remove(
      "is-settled"
    );

    lightbox.classList.remove(
      "is-open"
    );

    document.body.classList.remove(
      "is-media-lightbox-open"
    );


    /*
      Keep the hamburger visible. The X and screenshot collapse toward it
      while the actual button remains continuously present underneath.
    */
    /*
      Geometry can keep using the mobile-collapse duration, but screenshot
      opacity should disappear with the black lightbox backdrop itself.
    */
    const backdropDuration =
      getMediaLightboxTiming()
        .duration;


    const imageFade =
      imageProxy.animate(
        [
          {
            opacity: 1
          },

          {
            opacity: 0
          }
        ],
        {
          duration:
            Math.max(
              1,
              backdropDuration
            ),

          easing,

          fill:
            "forwards"
        }
      );


    const imagePromise =
      animateRectToLiveHamburger(
        imageProxy,
        imageRect,
        duration,
        easing,
        {
          fadeOut:
            false
        }
      );


    const xPromise =
      animateRectToLiveHamburger(
        xProxy,
        xRect,
        duration,
        easing,
        {
          fadeOut:
            true
        }
      );


    await Promise.all([
      imagePromise,
      xPromise,
      imageFade.finished.catch(
        () => {}
      )
    ]);


    imageProxy.remove();

    xProxy.remove();


    image.style.visibility =
      "";

    closeButton.style.visibility =
      "";


    /*
      Mobile collapse is a terminal state for this lightbox session.
      Remove any physical positioning left from the old tablet/desktop
      session so reopening later cannot inherit stale coordinates.
    */
    clearLightboxClosePhysicalOverrides(
      closeButton
    );


    const sourceImage =
      mediaLightboxState.sourceImage;

    const sourceButton =
      mediaLightboxState.sourceButton;


    if (
      sourceImage &&
      sourceImage.isConnected
    ) {
      sourceImage.style.visibility =
        "";
    }


    sourceButton?.classList.remove(
      "is-lightbox-morph-source"
    );


    image.removeAttribute(
      "src"
    );

    image.alt =
      "";


    finalizeMediaLightboxClosedState(
      lightbox
    );


    return (
      collapseRunId ===
      mobileUiCollapseRunId
    );
  };


  const collapseDesktopUiIntoMobile = async () => {
    if (mobileUiCollapseActive) {
      return;
    }


    mobileUiCollapseActive =
      true;

    mobileUiCollapseRunId += 1;

    const collapseRunId =
      mobileUiCollapseRunId;


    const hasLightbox =
      Boolean(
        document.querySelector(
          "[data-media-lightbox].is-open"
        )
      );


    let collapsed =
      false;


    if (hasLightbox) {
      collapsed =
        await collapseOpenLightboxIntoLiveHamburger(
          collapseRunId
        );
    }


    if (
      collapseRunId !==
      mobileUiCollapseRunId
    ) {
      mobileUiCollapseActive =
        false;

      return;
    }


    if (
      !hasLightbox ||
      !collapsed
    ) {
      await collapseOpenPageIntoLiveHamburger(
        collapseRunId
      );
    }


    if (
      collapseRunId !==
      mobileUiCollapseRunId
    ) {
      mobileUiCollapseActive =
        false;

      return;
    }


    /*
      Preserve the existing clean-slate mobile behavior after the visual
      collapse completes.
    */
    resetPageFrames();

    mobileUiCollapseActive =
      false;
  };


  const handleIconModeChange = (
    event
  ) => {
    /*
      Mobile now keeps the same real page alive as tablet, so crossing 750px
      is a layout handoff rather than a page-close event.

      Invalidate the old mobile-collapse experiment in either direction and
      let responsive CSS + the shared game controller take ownership.
    */
    mobileUiCollapseRunId += 1;

    mobileUiCollapseActive =
      false;


    if (!event.matches) {
      hideMorph();
    }


    requestAnimationFrame(() => {
      updateAllPrototypePageFrameGeometry();

      syncPageInputOwnership();


      if (
        activePageName
      ) {
        const frame =
          getPageFrame(
            activePageName
          );


        if (frame) {
          frame.classList.add(
            "is-open"
          );

          pageFrameProgress =
            1;

          pageFrameTargetOpen =
            true;

          pageFrameIsAnimating =
            false;
        }
      }
    });
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
     Reusable media-browser controller
     ======================================================= */

  const mediaBrowsers =
    Array.from(
      document.querySelectorAll(
        "[data-media-browser]"
      )
    );


  const createMediaElement = (
    item
  ) => {
    const type =
      item.dataset.mediaType;


    if (type === "youtube") {
      const youtubeId =
        item.dataset.youtubeId;

      const title =
        item.dataset.mediaTitle ||
        "YouTube video";


      /*
        YouTube now requires an HTTP Referer for embedded playback.
        A page opened directly as file:// has no valid HTTP Referer, which
        produces YouTube error 153.

        During local file testing, show a clean preview/link instead of a
        broken iframe. The real embed is used automatically on localhost
        or the deployed website.
      */
      if (window.location.protocol === "file:") {
        const fallback =
          document.createElement(
            "div"
          );


        fallback.className =
          "media-youtube-local-fallback";


        const image =
          document.createElement(
            "img"
          );


        image.className =
          "media-youtube-local-fallback-image";

        image.src =
          item.dataset.mediaThumb ||
          `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

        image.alt = "";


        const link =
          document.createElement(
            "a"
          );


        link.className =
          "media-youtube-local-fallback-link";

        link.href =
          `https://www.youtube.com/watch?v=${youtubeId}`;

        link.target =
          "_blank";

        link.rel =
          "noopener noreferrer";

        link.textContent =
          `▶ ${title}`;


        fallback.append(
          image,
          link
        );


        return fallback;
      }


      const iframe =
        document.createElement(
          "iframe"
        );


      iframe.className =
        "media-viewer-youtube";

      iframe.src =
        `https://www.youtube.com/embed/${youtubeId}?rel=0`;

      iframe.title =
        title;

      iframe.loading =
        "lazy";

      iframe.referrerPolicy =
        "strict-origin-when-cross-origin";

      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

      iframe.allowFullscreen =
        true;


      return iframe;
    }


    if (type === "image") {
      const image =
        document.createElement(
          "img"
        );


      image.className =
        "media-viewer-image";

      image.src =
        item.dataset.mediaSrc;

      image.alt =
        item.dataset.mediaTitle ||
        "Game screenshot";

      image.decoding =
        "async";


      /*
        Desktop/tablet keep the established single-click lightbox behavior.

        Mobile opens from touchend only after verifying that the finger did
        not travel far enough to count as a swipe. That lets a normal single
        press open the lightbox without stealing vertical/horizontal gestures.
      */
      image.addEventListener(
        "click",
        () => {
          if (!iconButtonMode.matches) {
            return;
          }


          openMediaLightbox(
            item.dataset.mediaSrc,
            item.dataset.mediaTitle ||
            "Game screenshot",
            image
          );
        }
      );


      return image;
    }


    if (type === "video") {
      const video =
        document.createElement(
          "video"
        );


      video.className =
        "media-viewer-video";

      video.src =
        item.dataset.mediaSrc;

      video.controls =
        true;

      video.playsInline =
        true;

      video.preload =
        "metadata";


      return video;
    }


    return null;
  };



  /*
    Direct media-browser render access for lightbox synchronization.

    Switching screenshots while fullscreen should update the hidden in-page
    hero WITHOUT pretending the user clicked a thumbnail. On mobile, that
    synthetic click was starting the hero wipe and the lightbox then captured
    the temporary outgoing image as its return target.
  */
  const mediaBrowserRenderers =
    new WeakMap();


  let mediaLightboxState = {
    isAnimating: false,
    sourceImage: null,
    sourceButton: null,
    lastFocusedElement: null,

    imageItems: [],
    imageIndex: -1,
    mediaBrowser: null,
    pageAccentRgb: ""
  };


  /*
    Input ownership follows the full lightbox state machine, not just the
    visible backdrop class. During close, the body class is removed before
    the return morph/proxy cleanup is actually finished.
  */
  const isMediaLightboxBusy =
    () => {
      const lightbox =
        document.querySelector(
          "[data-media-lightbox]"
        );


      return Boolean(
        document.body.classList.contains(
          "is-media-lightbox-open"
        ) ||
        lightbox?.classList.contains(
          "is-open"
        ) ||
        lightbox?.classList.contains(
          "is-closing"
        )
      );
    };


  /*
    =========================================================
    CENTRAL PAGE INPUT OWNERSHIP
    =========================================================

    All tablet/mobile taps and swipes ask ONE controller which real page is
    interactive. During any ambiguous handoff there is deliberately NO owner.

    This replaces the old pattern where each gesture controller independently
    interpreted activePageName, selectedPageName, .is-open and animation flags.
  */
  const getInteractivePageName =
    () => {
      if (
        isMediaLightboxBusy() ||
        mobileDirectionalPageSwitchActive ||
        pageFrameIsAnimating ||
        !activePageName ||
        selectedPageName !== activePageName
      ) {
        return null;
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
        return null;
      }


      return activePageName;
    };


  const pageOwnsInput =
    (
      pageName
    ) => (
      Boolean(
        pageName
      ) &&
      getInteractivePageName() ===
        pageName
    );


  const syncPageInputOwnership =
    () => {
      /*
        Desktop keeps its established pointer behavior. On tablet/mobile,
        non-owning real pages cannot physically intercept a touch even if an
        interrupted animation accidentally leaves one visually stacked above
        the current page.
      */
      if (!gameFrameTabletMode.matches) {
        pageFrames.forEach(
          (frame) => {
            frame.style.removeProperty(
              "pointer-events"
            );
          }
        );

        return;
      }


      const owner =
        getInteractivePageName();


      pageFrames.forEach(
        (
          frame,
          pageName
        ) => {
          frame.style.pointerEvents =
            (
              owner === pageName
            )
              ? "auto"
              : "none";
        }
      );
    };


  /*
    One authoritative terminal CLOSED state for the lightbox.

    This is safe to call repeatedly. It removes every logical/visual modal
    marker, clears stale state references, releases pointer capture, and
    re-evaluates which page may receive input.
  */
  const finalizeMediaLightboxClosedState =
    (
      lightbox = document.querySelector(
        "[data-media-lightbox]"
      )
    ) => {
      if (!lightbox) {
        return;
      }


      document.body.classList.remove(
        "is-media-lightbox-open"
      );

      lightbox.classList.remove(
        "is-open",
        "is-settled",
        "is-closing"
      );

      lightbox.style.pointerEvents =
        "none";


      const activeElement =
        document.activeElement;


      if (
        activeElement &&
        lightbox.contains(
          activeElement
        )
      ) {
        activeElement.blur?.();
      }


      mediaLightboxState.isAnimating =
        false;

      mediaLightboxState.sourceImage =
        null;

      mediaLightboxState.sourceButton =
        null;

      mediaLightboxState.imageItems =
        [];

      mediaLightboxState.imageIndex =
        -1;

      mediaLightboxState.mediaBrowser =
        null;

      mediaLightboxState.pageAccentRgb =
        "";


      syncPageInputOwnership();
    };


  const getMediaLightboxTiming = () => {
    const styles =
      getComputedStyle(
        document.documentElement
      );


    return {
      duration:
        parseCssTime(
          styles.getPropertyValue(
            "--media-lightbox-duration"
          ),
          520
        ),

      buttonDuration:
        parseCssTime(
          styles.getPropertyValue(
            "--media-lightbox-button-duration"
          ),
          460
        ),

      easing:
        styles.getPropertyValue(
          "--media-lightbox-ease"
        ).trim() ||
        "ease",

      closeStateDuration:
        parseCssTime(
          styles.getPropertyValue(
            "--media-lightbox-close-state-duration"
          ),
          190
        )
    };
  };


  const getContainedRect = (
    naturalWidth,
    naturalHeight,
    inset = 24
  ) => {
    const availableWidth =
      Math.max(
        1,
        window.innerWidth -
        (inset * 2)
      );

    const availableHeight =
      Math.max(
        1,
        window.innerHeight -
        (inset * 2)
      );


    const scale =
      Math.min(
        availableWidth /
        naturalWidth,

        availableHeight /
        naturalHeight,

        1
      );


    const width =
      naturalWidth * scale;

    const height =
      naturalHeight * scale;


    return {
      left:
        (window.innerWidth - width) / 2,

      top:
        (window.innerHeight - height) / 2,

      width,
      height
    };
  };


  const animateRect = (
    element,
    fromRect,
    toRect,
    duration,
    easing,
    extraFrom = {},
    extraTo = {}
  ) => {
    return element.animate(
      [
        {
          left:
            `${fromRect.left}px`,

          top:
            `${fromRect.top}px`,

          width:
            `${fromRect.width}px`,

          height:
            `${fromRect.height}px`,

          ...extraFrom
        },

        {
          left:
            `${toRect.left}px`,

          top:
            `${toRect.top}px`,

          width:
            `${toRect.width}px`,

          height:
            `${toRect.height}px`,

          ...extraTo
        }
      ],
      {
        duration,
        easing,
        fill: "forwards"
      }
    ).finished;
  };


  /*
    The in-page media viewer uses a six-point polygon:
      top-left cut
      top edge
      right edge
      bottom-right cut
      bottom edge
      left edge

    A normal rectangle can use the SAME six points by collapsing both cut
    edges to zero length. Because the topology stays identical, clip-path
    interpolation is continuous instead of popping between two shapes.
  */
  const rectangularSixPointClip =
    "polygon(" +
    "0% 0%, " +
    "100% 0%, " +
    "100% 100%, " +
    "100% 100%, " +
    "0% 100%, " +
    "0% 0%" +
    ")";


  const getSourceMediaClipPath = (
    sourceImage
  ) => {
    const viewer =
      sourceImage?.closest(
        ".media-viewer"
      );


    if (!viewer) {
      return rectangularSixPointClip;
    }


    const clipPath =
      getComputedStyle(
        viewer
      ).clipPath;


    return (
      clipPath &&
      clipPath !== "none"
    )
      ? clipPath
      : rectangularSixPointClip;
  };



  const getLightboxSourceMorphGeometry = (
    sourceImage
  ) => {
    if (!sourceImage) {
      return null;
    }


    const viewer =
      sourceImage.closest(
        ".media-viewer"
      );


    const pageFrame =
      sourceImage.closest(
        ".prototype-page-frame"
      );


    /*
      Brobots desktop/tablet uses an edge-to-edge COVER hero.
      getBoundingClientRect() only reports the <img> element box, not the
      larger painted image created by object-fit: cover.

      Reconstruct that painted rectangle from the natural image ratio, then
      clip it back to the visible viewer cavity. This makes the morph begin
      and end on the exact pixels the user is actually seeing.
    */
    const isGameFrameCoverHero =
      Boolean(
        viewer?.closest(
          "[data-game-frame]"
        )
      );


    /*
      Mobile uses the same framed COVER hero concept as tablet/desktop.
      The old breakpoint gate meant mobile fell back to the raw <img> box,
      which can be much smaller than the actual visible hero aperture
      (especially after the mobile wipe wrapper is involved).

      Reconstruct the painted COVER rectangle on mobile too so opening and
      closing lightbox morphs begin/end on the exact hero image the user sees.
    */


    if (
      isGameFrameCoverHero &&
      sourceImage.naturalWidth > 0 &&
      sourceImage.naturalHeight > 0
    ) {
      const viewerRect =
        viewer.getBoundingClientRect();


      const heroZone =
        viewer.closest(
          '[data-game-frame-zone="hero"]'
        );


      /*
        The viewer is deliberately oversized by 2% on every side so it
        tucks underneath the raster frame. That means the viewer's own box
        is NOT the visible source boundary.

        Use the measured hero zone as the actual aperture through which the
        image is seen. This matters most when the frame becomes unusually
        wide, because the 4% overscan becomes a much larger horizontal pixel
        difference.
      */
      const apertureRect =
        heroZone
          ? heroZone.getBoundingClientRect()
          : viewerRect;


      const scale =
        Math.max(
          viewerRect.width /
            sourceImage.naturalWidth,

          viewerRect.height /
            sourceImage.naturalHeight
        );


      const paintedWidth =
        sourceImage.naturalWidth *
        scale;

      const paintedHeight =
        sourceImage.naturalHeight *
        scale;


      const paintedLeft =
        viewerRect.left +
        (
          viewerRect.width -
          paintedWidth
        ) / 2;

      const paintedTop =
        viewerRect.top +
        (
          viewerRect.height -
          paintedHeight
        ) / 2;


      const paintedRect = {
        left:
          paintedLeft,

        top:
          paintedTop,

        width:
          paintedWidth,

        height:
          paintedHeight,

        right:
          paintedLeft +
          paintedWidth,

        bottom:
          paintedTop +
          paintedHeight
      };


      const topInset =
        Math.max(
          0,
          (
            apertureRect.top -
            paintedRect.top
          ) /
          paintedRect.height *
          100
        );

      const rightInset =
        Math.max(
          0,
          (
            paintedRect.right -
            apertureRect.right
          ) /
          paintedRect.width *
          100
        );

      const bottomInset =
        Math.max(
          0,
          (
            paintedRect.bottom -
            apertureRect.bottom
          ) /
          paintedRect.height *
          100
        );

      const leftInset =
        Math.max(
          0,
          (
            apertureRect.left -
            paintedRect.left
          ) /
          paintedRect.width *
          100
        );


      const radius =
        parseFloat(
          getComputedStyle(
            viewer
          ).borderTopLeftRadius
        ) || 0;


      return {
        rect:
          paintedRect,

        clipPath:
          `inset(${topInset}% ${rightInset}% ${bottomInset}% ${leftInset}% round ${radius}px)`,

        flatClipPath:
          "inset(0% 0% 0% 0% round 0px)"
      };
    }


    return {
      rect:
        sourceImage
          .getBoundingClientRect(),

      clipPath:
        getSourceMediaClipPath(
          sourceImage
        ),

      flatClipPath:
        rectangularSixPointClip
    };
  };


  const getCurrentPageNavButton = () => {
    /*
      Mobile's visible navigation anchor is the hamburger, not the hidden
      tablet/desktop page button. Use the live hamburger geometry for the
      lightbox button morph so opening and closing visually belong to the
      control the user can actually see.
    */
    if (
      !iconButtonMode.matches &&
      menuToggle
    ) {
      return menuToggle;
    }


    const name =
      selectedPageName ||
      activePageName;


    return (
      (
        name &&
        pageNavButtons.get(
          name
        )
      )
      ||
      document.querySelector(
        ".main-nav .nav-button.is-page-active"
      )
    );
  };


  const getNavButtonDisplayText = (
    button
  ) => {
    if (!button) {
      return "";
    }


    if (button === menuToggle) {
      return "";
    }


    const compact =
      window.matchMedia(
        "(max-width: 1400px)"
      ).matches;


    if (compact) {
      return (
        button.querySelector(
          ".nav-icon"
        )?.textContent?.trim()
        ||
        ""
      );
    }


    return (
      button.querySelector(
        ".nav-label"
      )?.textContent?.trim()
      ||
      ""
    );
  };


  const getLightboxSourceButtonSnapshot = (
    sourceButton
  ) => {
    if (!sourceButton) {
      return null;
    }


    const rect =
      sourceButton.getBoundingClientRect();


    const pseudo =
      getComputedStyle(
        sourceButton,
        "::before"
      );


    return {
      rect,

      shear:
        Math.max(
          20,
          rect.height * 0.73
        ),

      borderWidth:
        pseudo.borderTopWidth ||
        "2px",

      borderColor:
        pseudo.borderTopColor ||
        "rgba(240, 240, 240, 0.2)",

      backgroundImage:
        pseudo.backgroundImage ||
        "none",

      backgroundColor:
        pseudo.backgroundColor ||
        "transparent",

      boxShadow:
        pseudo.boxShadow ||
        "none",

      accentRgb:
        mediaLightboxState.pageAccentRgb ||
        getComputedStyle(
          sourceButton
        ).getPropertyValue(
          "--nav-accent-rgb"
        ).trim() ||
        "54, 232, 232",

      /*
        The source button is currently active, so its computed pseudo
        gives us the PRESSED/SELECTED state above.

        The ordinary and hover states come from the same CSS variables /
        rules used by the banner buttons themselves.
      */
      unpressedBorderColor:
        getComputedStyle(
          sourceButton
        ).getPropertyValue(
          "--button-border-color"
        ).trim() ||
        "rgba(240, 240, 240, 0.2)",

      unpressedBackgroundColor:
        "transparent",

      unpressedBoxShadow:
        "none",

      hoverBorderColor:
        `rgba(${
          mediaLightboxState.pageAccentRgb ||
          getComputedStyle(
            sourceButton
          ).getPropertyValue(
            "--nav-accent-rgb"
          ).trim() ||
          "54, 232, 232"
        }, 0.48)`,

      hoverBackgroundColor:
        `rgba(${
          mediaLightboxState.pageAccentRgb ||
          getComputedStyle(
            sourceButton
          ).getPropertyValue(
            "--nav-accent-rgb"
          ).trim() ||
          "54, 232, 232"
        }, 0.25)`,

      hoverBoxShadow:
        "none"
    };
  };


  const applyLightboxSnapshotToProxy = (
    proxy,
    snapshot
  ) => {
    if (
      !proxy ||
      !snapshot
    ) {
      return;
    }


    proxy.style.setProperty(
      "--media-lightbox-morph-shear",
      `${snapshot.shear}px`
    );

    proxy.style.setProperty(
      "--media-lightbox-morph-border-width",
      snapshot.borderWidth
    );

    proxy.style.setProperty(
      "--media-lightbox-morph-border-color",
      snapshot.borderColor
    );

    proxy.style.setProperty(
      "--media-lightbox-morph-background-image",
      snapshot.backgroundImage
    );

    proxy.style.setProperty(
      "--media-lightbox-morph-background-color",
      snapshot.backgroundColor
    );

    proxy.style.setProperty(
      "--media-lightbox-morph-box-shadow",
      snapshot.boxShadow
    );
  };


  const applyLightboxSnapshotToCloseButton = (
    closeButton,
    snapshot
  ) => {
    if (
      !closeButton ||
      !snapshot
    ) {
      return;
    }


    const closeHeightScale =
      parseFloat(
        getComputedStyle(
          closeButton
        ).getPropertyValue(
          "--media-lightbox-close-height-scale"
        )
      ) || 0.7;


    const scaledHeight =
      snapshot.rect.height *
      closeHeightScale;


    /*
      Width intentionally remains unchanged.
    */
    /*
      Width always mirrors the source banner button exactly.
      Only height is reduced.
    */
    closeButton.style.setProperty(
      "--media-lightbox-close-width",
      `${snapshot.rect.width}px`
    );

    closeButton.style.setProperty(
      "--media-lightbox-close-height",
      `${scaledHeight}px`
    );


    /*
      Center-squish explicitly:
      move the top edge down by HALF of the lost height.
      The bottom edge therefore moves up by the same amount.
    */
    const centeredTop =
      snapshot.rect.top +
      (
        snapshot.rect.height -
        scaledHeight
      ) / 2;


    closeButton.style.setProperty(
      "--media-lightbox-close-top",
      `${centeredTop}px`
    );


    /*
      Preserve the exact master shear angle.

      The existing relation is:
        shear run = button height * 0.73

      Recompute from the NEW height instead of scaling the old geometry
      non-uniformly.
    */
    closeButton.style.setProperty(
      "--media-lightbox-close-shear",
      `${scaledHeight * 0.73}px`
    );

    closeButton.style.setProperty(
      "--media-lightbox-close-border-width",
      snapshot.borderWidth
    );

    closeButton.style.setProperty(
      "--media-lightbox-close-border-color",
      snapshot.borderColor
    );

    closeButton.style.setProperty(
      "--media-lightbox-close-background-image",
      snapshot.backgroundImage
    );

    closeButton.style.setProperty(
      "--media-lightbox-close-background-color",
      snapshot.backgroundColor
    );

    closeButton.style.setProperty(
      "--media-lightbox-close-box-shadow",
      snapshot.boxShadow
    );


    closeButton.style.setProperty(
      "--media-lightbox-close-accent-rgb",
      snapshot.accentRgb
    );


    /*
      Preserve the exact selected-page appearance separately so the X can
      use it as its NEW hover state after its resting state is inverted.
    */
    closeButton.style.setProperty(
      "--media-lightbox-close-selected-background-color",
      snapshot.backgroundColor
    );

    closeButton.style.setProperty(
      "--media-lightbox-close-selected-border-color",
      snapshot.borderColor
    );

    closeButton.style.setProperty(
      "--media-lightbox-close-selected-box-shadow",
      snapshot.boxShadow
    );


    closeButton.style.setProperty(
      "--media-lightbox-close-unpressed-border-color",
      snapshot.unpressedBorderColor
    );

    closeButton.style.setProperty(
      "--media-lightbox-close-unpressed-background-color",
      snapshot.unpressedBackgroundColor
    );

    closeButton.style.setProperty(
      "--media-lightbox-close-unpressed-box-shadow",
      snapshot.unpressedBoxShadow
    );


    closeButton.style.setProperty(
      "--media-lightbox-close-hover-border-color",
      snapshot.hoverBorderColor
    );

    closeButton.style.setProperty(
      "--media-lightbox-close-hover-background-color",
      snapshot.hoverBackgroundColor
    );

    closeButton.style.setProperty(
      "--media-lightbox-close-hover-box-shadow",
      snapshot.hoverBoxShadow
    );
  };


  const applyLightboxRestingStyleToProxy = (
    proxy,
    snapshot
  ) => {
    if (
      !proxy ||
      !snapshot
    ) {
      return;
    }


    proxy.style.setProperty(
      "--media-lightbox-morph-border-color",
      `rgba(${snapshot.accentRgb}, 0.48)`
    );

    proxy.style.setProperty(
      "--media-lightbox-morph-background-color",
      `rgba(${snapshot.accentRgb}, 0.25)`
    );

    /*
      The resting X keeps the inherited selected-button shadow, matching
      the real X's current idle appearance.
    */
    proxy.style.setProperty(
      "--media-lightbox-morph-box-shadow",
      snapshot.boxShadow
    );
  };


  const getLightboxCloseTargetRect = (
    sourceButton,
    closeButton
  ) => {
    if (
      !sourceButton ||
      !closeButton
    ) {
      return null;
    }


    const sourceRect =
      sourceButton.getBoundingClientRect();


    const closeHeightScale =
      parseFloat(
        getComputedStyle(
          closeButton
        ).getPropertyValue(
          "--media-lightbox-close-height-scale"
        )
      ) || 0.7;


    const height =
      sourceRect.height *
      closeHeightScale;


    /*
      This is the invariant the sketch is asking for:
      shrink the button equally upward and downward around the source
      banner button's vertical center.
    */
    const top =
      sourceRect.top +
      (
        sourceRect.height -
        height
      ) / 2;


    const currentCloseRect =
      closeButton.getBoundingClientRect();


    return {
      left:
        currentCloseRect.left,

      top,

      width:
        sourceRect.width,

      height
    };
  };


  const syncLightboxCloseButtonToSource = () => {
    const lightbox =
      document.querySelector(
        "[data-media-lightbox].is-open"
      );


    if (!lightbox) {
      return;
    }


    const closeButton =
      lightbox.querySelector(
        ".media-lightbox-close"
      );


    const sourceButton =
      mediaLightboxState.sourceButton;


    if (
      !closeButton ||
      !sourceButton
    ) {
      return;
    }


    applyLightboxSnapshotToCloseButton(
      closeButton,
      getLightboxSourceButtonSnapshot(
        sourceButton
      )
    );


    /*
      Geometry is now owned entirely by the CSS custom properties written
      in applyLightboxSnapshotToCloseButton().

      Do NOT also write top/width/height as physical inline properties here.
      Those survive responsive teardown and can override the freshly updated
      variables the next time the lightbox opens.
    */
  };


  const clearLightboxClosePhysicalOverrides = (
    closeButton
  ) => {
    if (!closeButton) {
      return;
    }


    /*
      These should normally be empty now, but clear them defensively in case
      an older responsive/mobile path left stale physical geometry behind.
    */
    closeButton.style.removeProperty(
      "top"
    );

    closeButton.style.removeProperty(
      "width"
    );

    closeButton.style.removeProperty(
      "height"
    );

    closeButton.style.removeProperty(
      "left"
    );

    closeButton.style.removeProperty(
      "right"
    );
  };


  const createLightboxButtonMorph = (
    sourceButton
  ) => {
    if (!sourceButton) {
      return null;
    }


    const proxy =
      document.createElement(
        "div"
      );


    proxy.className =
      "media-lightbox-button-morph";


    const label =
      document.createElement(
        "span"
      );


    label.className =
      "media-lightbox-button-morph-label";

    label.textContent =
      getNavButtonDisplayText(
        sourceButton
      );


    const x =
      document.createElement(
        "span"
      );


    x.className =
      "media-lightbox-button-morph-x";

    x.textContent =
      "×";


    proxy.append(
      label,
      x
    );


    const snapshot =
      getLightboxSourceButtonSnapshot(
        sourceButton
      );


    if (!snapshot) {
      return null;
    }


    const sourceRect =
      snapshot.rect;


    applyLightboxSnapshotToProxy(
      proxy,
      snapshot
    );


    Object.assign(
      proxy.style,
      {
        left:
          `${sourceRect.left}px`,

        top:
          `${sourceRect.top}px`,

        width:
          `${sourceRect.width}px`,

        height:
          `${sourceRect.height}px`
      }
    );


    document.body.appendChild(
      proxy
    );


    return {
      proxy,
      label,
      x
    };
  };


  const getMediaLightbox = () => {
    let lightbox =
      document.querySelector(
        "[data-media-lightbox]"
      );


    if (lightbox) {
      return lightbox;
    }


    lightbox =
      document.createElement(
        "div"
      );


    lightbox.className =
      "media-lightbox";

    lightbox.dataset.mediaLightbox =
      "";


    const image =
      document.createElement(
        "img"
      );


    image.className =
      "media-lightbox-image";

    image.alt = "";


    const closeButton =
      document.createElement(
        "button"
      );


    closeButton.className =
      "media-lightbox-close";

    closeButton.type =
      "button";

    closeButton.setAttribute(
      "aria-label",
      "Close fullscreen image"
    );

    closeButton.innerHTML =
      "<span aria-hidden=\"true\">×</span>";


    const previousButton =
      document.createElement(
        "button"
      );


    previousButton.className =
      "media-lightbox-arrow media-lightbox-arrow--previous";

    previousButton.type =
      "button";

    previousButton.setAttribute(
      "aria-label",
      "Previous screenshot"
    );

    previousButton.textContent =
      "‹";


    const nextButton =
      document.createElement(
        "button"
      );


    nextButton.className =
      "media-lightbox-arrow media-lightbox-arrow--next";

    nextButton.type =
      "button";

    nextButton.setAttribute(
      "aria-label",
      "Next screenshot"
    );

    nextButton.textContent =
      "›";


    lightbox.append(
      image,
      previousButton,
      nextButton,
      closeButton
    );


    const updateLightboxArrowState = () => {
      previousButton.disabled =
        mediaLightboxState.imageIndex <= 0;

      nextButton.disabled =
        mediaLightboxState.imageIndex < 0 ||
        mediaLightboxState.imageIndex >=
          mediaLightboxState.imageItems.length - 1;
    };


    const showLightboxImageAt = async (
      nextIndex,
      useSwipeWipe = false
    ) => {
      if (
        mediaLightboxState.isAnimating ||
        nextIndex < 0 ||
        nextIndex >=
          mediaLightboxState.imageItems.length
      ) {
        return;
      }


      const nextItem =
        mediaLightboxState.imageItems[
          nextIndex
        ];


      if (!nextItem) {
        return;
      }


      const previousLightboxIndex =
        mediaLightboxState.imageIndex;

      const lightboxWipeDirection =
        nextIndex >
        previousLightboxIndex
          ? 1
          : -1;


      mediaLightboxState.imageIndex =
        nextIndex;


      /*
        Keep the normal gallery synchronized with the fullscreen view.

        IMPORTANT:
        Do this through the browser's real renderer rather than nextItem.click().
        A synthetic thumbnail click on mobile starts the hero wipe. The
        lightbox was then grabbing the temporary outgoing image as its return
        target, so closing could morph to the wrong/small geometry and leave
        the new hero in a broken interaction state.
      */
      const mediaBrowserRenderer =
        mediaBrowserRenderers.get(
          mediaLightboxState.mediaBrowser
        );


      if (mediaBrowserRenderer) {
        mediaBrowserRenderer(
          nextItem,
          nextIndex
        );
      }

      else {
        /*
          Safe fallback for any browser that predates registration.
        */
        nextItem.click();
      }


      const shouldUseLightboxSwipeWipe =
        useSwipeWipe &&
        window.matchMedia(
          "(max-width: 1400px)"
        ).matches &&
        lightbox.classList.contains(
          "is-settled"
        );


      if (shouldUseLightboxSwipeWipe) {
        mediaLightboxState.isAnimating =
          true;


        const wipeLayer =
          document.createElement(
            "div"
          );

        wipeLayer.className =
          "media-lightbox-wipe-layer " +
          (
            lightboxWipeDirection > 0
              ? "is-wipe-forward"
              : "is-wipe-backward"
          );


        const wipeCanvas =
          document.createElement(
            "div"
          );

        wipeCanvas.className =
          "media-lightbox-wipe-canvas";


        const incomingImage =
          document.createElement(
            "img"
          );

        incomingImage.className =
          "media-lightbox-wipe-image";

        incomingImage.src =
          nextItem.dataset.mediaSrc;

        incomingImage.alt =
          nextItem.dataset.mediaTitle ||
          "Game screenshot";

        incomingImage.decoding =
          "async";


        wipeCanvas.appendChild(
          incomingImage
        );

        wipeLayer.appendChild(
          wipeCanvas
        );

        lightbox.appendChild(
          wipeLayer
        );


        try {
          await incomingImage.decode();
        }

        catch {
          // Cached/local images may already be ready.
        }


        /*
          Paint the zero-width layer first, then reveal it exactly like the
          mobile hero wipe.
        */
        wipeLayer
          .getBoundingClientRect();


        await new Promise(
          (resolve) => {
            const finishWipe =
              () => {
                resolve();
              };


            wipeLayer.addEventListener(
              "animationend",
              finishWipe,
              {
                once: true
              }
            );


            requestAnimationFrame(
              () => {
                wipeLayer.classList.add(
                  "is-wipe-running"
                );
              }
            );
          }
        );


        /*
          The fully revealed temporary image now covers the old lightbox image.
          Swap the real image underneath to the already-loaded source, then
          remove the reveal layer on the next paint so there is no end snap.
        */
        image.src =
          nextItem.dataset.mediaSrc;

        image.alt =
          nextItem.dataset.mediaTitle ||
          "Game screenshot";


        try {
          await image.decode();
        }

        catch {
          // The incoming image already decoded this source above.
        }


        await new Promise(
          (resolve) => {
            requestAnimationFrame(
              () => {
                wipeLayer.remove();

                resolve();
              }
            );
          }
        );


        mediaLightboxState.isAnimating =
          false;
      }

      else {
        image.style.opacity =
          "0";

        image.src =
          nextItem.dataset.mediaSrc;

        image.alt =
          nextItem.dataset.mediaTitle ||
          "Game screenshot";


        try {
          await image.decode();
        }

        catch {
          // Cached/local images may already be ready.
        }


        requestAnimationFrame(() => {
          image.style.opacity =
            "";
        });
      }


      /*
        The synchronized render above deliberately skips the mobile wipe, so
        after layout settles there is exactly one real hero image to target.
        Capture it after two frames so its responsive cover geometry is final.
      */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const currentViewerImage =
            mediaLightboxState.mediaBrowser
              ?.querySelector(
                "[data-media-viewer-stage] .media-viewer-image"
              );


          if (currentViewerImage) {
            mediaLightboxState.sourceImage =
              currentViewerImage;

            currentViewerImage.style.visibility =
              "hidden";
          }
        });
      });


      updateLightboxArrowState();
    };


    previousButton.addEventListener(
      "click",
      () => {
        showLightboxImageAt(
          mediaLightboxState.imageIndex - 1
        );
      }
    );


    nextButton.addEventListener(
      "click",
      () => {
        showLightboxImageAt(
          mediaLightboxState.imageIndex + 1
        );
      }
    );


    closeButton.addEventListener(
      "click",
      () => {
        closeMediaLightbox();
      }
    );


    lightbox.addEventListener(
      "click",
      (event) => {
        if (event.target === lightbox) {
          closeMediaLightbox();
        }
      }
    );


    /*
      Tablet / mobile lightbox gestures
      ---------------------------------
      Keep the existing arrows and keyboard controls, but let a fullscreen
      screenshot behave like the mobile hero:

        finger LEFT  -> next screenshot
        finger RIGHT -> previous screenshot
        finger UP/DOWN -> close fullscreen

      Button presses are deliberately excluded so a slightly sloppy tap on
      the X / arrows can never also count as a swipe.
    */
    let lightboxSwipeStartX =
      0;

    let lightboxSwipeStartY =
      0;

    let lightboxSwipeTracking =
      false;


    const clearLightboxSwipe =
      () => {
        lightboxSwipeTracking =
          false;
      };


    lightbox.addEventListener(
      "touchstart",
      (event) => {
        if (
          !window.matchMedia(
            "(max-width: 1400px)"
          ).matches ||
          !lightbox.classList.contains(
            "is-settled"
          ) ||
          mediaLightboxState.isAnimating ||
          event.touches.length !== 1 ||
          event.target.closest(
            "button"
          )
        ) {
          clearLightboxSwipe();

          return;
        }


        const touch =
          event.touches[0];


        lightboxSwipeStartX =
          touch.clientX;

        lightboxSwipeStartY =
          touch.clientY;

        lightboxSwipeTracking =
          true;
      },
      {
        passive: true
      }
    );


    lightbox.addEventListener(
      "touchmove",
      (event) => {
        if (
          !lightboxSwipeTracking ||
          event.touches.length !== 1
        ) {
          return;
        }


        const touch =
          event.touches[0];

        const deltaX =
          touch.clientX -
          lightboxSwipeStartX;

        const deltaY =
          touch.clientY -
          lightboxSwipeStartY;


        /*
          Once intent is obvious, keep browser history navigation / page
          scrolling from stealing the fullscreen gesture.
        */
        if (
          Math.abs(deltaX) >= 8 ||
          Math.abs(deltaY) >= 8
        ) {
          event.preventDefault();
        }
      },
      {
        passive: false
      }
    );


    lightbox.addEventListener(
      "touchend",
      (event) => {
        if (
          !lightboxSwipeTracking ||
          event.changedTouches.length !== 1 ||
          !lightbox.classList.contains(
            "is-settled"
          ) ||
          mediaLightboxState.isAnimating
        ) {
          clearLightboxSwipe();

          return;
        }


        const touch =
          event.changedTouches[0];

        const deltaX =
          touch.clientX -
          lightboxSwipeStartX;

        const deltaY =
          touch.clientY -
          lightboxSwipeStartY;

        const absX =
          Math.abs(
            deltaX
          );

        const absY =
          Math.abs(
            deltaY
          );

        const swipeThreshold =
          46;


        clearLightboxSwipe();


        if (
          Math.max(
            absX,
            absY
          ) < swipeThreshold
        ) {
          return;
        }


        const horizontalIntent =
          absX >
          absY * 1.1;

        const verticalIntent =
          absY >
          absX * 1.1;


        if (horizontalIntent) {
          showLightboxImageAt(
            mediaLightboxState.imageIndex +
            (
              deltaX < 0
                ? 1
                : -1
            ),
            true
          );

          return;
        }


        if (verticalIntent) {
          closeMediaLightbox();
        }
      },
      {
        passive: true
      }
    );


    lightbox.addEventListener(
      "touchcancel",
      clearLightboxSwipe,
      {
        passive: true
      }
    );


    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          lightbox.classList.contains(
            "is-open"
          )
        ) {
          closeMediaLightbox();

          return;
        }


        if (
          event.key === "ArrowLeft" &&
          lightbox.classList.contains(
            "is-settled"
          )
        ) {
          event.preventDefault();

          previousButton.click();

          return;
        }


        if (
          event.key === "ArrowRight" &&
          lightbox.classList.contains(
            "is-settled"
          )
        ) {
          event.preventDefault();

          nextButton.click();
        }
      }
    );


    document.body.appendChild(
      lightbox
    );


    return lightbox;
  };


  const closeMediaLightbox = async () => {
    const lightbox =
      getMediaLightbox();


    if (
      mediaLightboxState.isAnimating ||
      !lightbox.classList.contains(
        "is-open"
      )
    ) {
      return;
    }


    mediaLightboxState.isAnimating =
      true;

    syncPageInputOwnership();


    const image =
      lightbox.querySelector(
        ".media-lightbox-image"
      );

    const closeButton =
      lightbox.querySelector(
        ".media-lightbox-close"
      );

    const {
      duration,
      buttonDuration,
      easing,
      closeStateDuration
    } =
      getMediaLightboxTiming();


    const sourceImage =
      mediaLightboxState.sourceImage;

    const sourceButton =
      mediaLightboxState.sourceButton;


    /*
      First make the real X behave like a proper pressed button.

      IMPORTANT:
      Keep it stationary and keep .is-settled present during this phase.
      .is-closing overrides both unpressed and hover styling, so EVERY close
      method follows the same visual sequence:

        current state -> selected/pressed -> move home
    */
    lightbox.classList.add(
      "is-closing"
    );


    await new Promise(
      (resolve) =>
        window.setTimeout(
          resolve,
          Math.max(
            0,
            closeStateDuration
          )
        )
    );


    /*
      Only after the press-in fade finishes do the arrows/background begin
      leaving and the moving proxies take ownership.
    */
    lightbox.classList.remove(
      "is-settled"
    );


    const imageProxy =
      document.createElement(
        "img"
      );


    imageProxy.className =
      "media-lightbox-image-morph";

    imageProxy.src =
      image.src;

    imageProxy.alt = "";


    const fromRect =
      image.getBoundingClientRect();


    const sourceGeometry =
      (
        sourceImage &&
        sourceImage.isConnected
      )
        ? getLightboxSourceMorphGeometry(
            sourceImage
          )
        : null;


    const sourceClipPath =
      sourceGeometry
        ?.clipPath ||
      rectangularSixPointClip;


    const sourceFlatClipPath =
      sourceGeometry
        ?.flatClipPath ||
      rectangularSixPointClip;


    const toRect =
      sourceGeometry
        ?.rect ||
      fromRect;


    Object.assign(
      imageProxy.style,
      {
        left:
          `${fromRect.left}px`,

        top:
          `${fromRect.top}px`,

        width:
          `${fromRect.width}px`,

        height:
          `${fromRect.height}px`,

        /*
          Closing starts from the rectangular fullscreen shape, so seed
          that state before the reverse animation begins as well.
        */
        clipPath:
          sourceFlatClipPath
      }
    );


    document.body.appendChild(
      imageProxy
    );


    const buttonMorph =
      createLightboxButtonMorph(
        sourceButton
      );


    if (buttonMorph && closeButton) {
      const navRectRaw =
        sourceButton.getBoundingClientRect();


      const closeRect =
        getLightboxCloseTargetRect(
          sourceButton,
          closeButton
        );


      if (!closeRect) {
        imageProxy.remove();

        buttonMorph?.proxy.remove();

        finalizeMediaLightboxClosedState(
          lightbox
        );

        return;
      }


      /*
        Keep the entire return on one horizontal row. This also protects
        against tiny fractional top-coordinate differences during responsive
        header layout.
      */
      const navRect = {
        left:
          navRectRaw.left,

        /*
          Reverse the same center-preserving height change:
          the shortened X expands upward AND downward into the full-height
          banner button while keeping the same vertical centerline.
        */
        top:
          navRectRaw.top,

        width:
          navRectRaw.width,

        height:
          navRectRaw.height
      };


      Object.assign(
        buttonMorph.proxy.style,
        {
          left:
            `${closeRect.left}px`,

          top:
            `${closeRect.top}px`,

          width:
            `${closeRect.width}px`,

          height:
            `${closeRect.height}px`
        }
      );


      const sourceSnapshot =
        getLightboxSourceButtonSnapshot(
          sourceButton
        );


      /*
        The stationary real X has already faded into the selected state.
        Seed the moving proxy with that exact same selected state so the
        handoff is visually continuous.
      */
      if (sourceSnapshot) {
        applyLightboxSnapshotToProxy(
          buttonMorph.proxy,
          sourceSnapshot
        );
      }


      buttonMorph.label.style.opacity =
        "0";

      buttonMorph.x.style.opacity =
        "1";


      const returnSourceShear =
        closeRect.height * 0.73;


      const returnTargetShear =
        sourceSnapshot
          ? sourceSnapshot.shear
          : navRect.height * 0.73;


      animateRect(
        buttonMorph.proxy,
        closeRect,
        navRect,
        buttonDuration,
        easing,
        {
          "--media-lightbox-morph-shear":
            `${returnSourceShear}px`
        },
        {
          "--media-lightbox-morph-shear":
            `${returnTargetShear}px`
        }
      );


      buttonMorph.label.animate(
        [
          { opacity: 0 },
          { opacity: 1 }
        ],
        {
          duration:
            buttonDuration * 0.55,

          delay:
            buttonDuration * 0.35,

          easing,
          fill: "forwards"
        }
      );


      buttonMorph.x.animate(
        [
          { opacity: 1 },
          { opacity: 0 }
        ],
        {
          duration:
            buttonDuration * 0.45,

          easing,
          fill: "forwards"
        }
      );
    }


    const imagePromise =
      animateRect(
        imageProxy,
        fromRect,
        toRect,
        duration,
        easing,
        {
          clipPath:
            sourceFlatClipPath,

          boxShadow:
            "0 18px 60px rgba(0,0,0,0.58)"
        },
        {
          /*
            Restore the in-page viewer's visible crop gradually as the
            screenshot returns to the frame.
          */
          clipPath:
            sourceClipPath,

          boxShadow:
            "0 0 0 rgba(0,0,0,0)"
        }
      );


    /*
      Fade the proxy away during the final sliver of the return journey.
      By the time it reaches the frame edge, its outer boundary is already
      invisible; the real clickable hero image is revealed only after the
      morph finishes.
    */
    const returnFadeDuration =
      Math.min(
        200,
        duration * 0.40
      );


    const returnFadeDelay =
      Math.max(
        0,
        duration -
        returnFadeDuration
      );


    /*
      Hand visual ownership back to the real framed hero immediately BEFORE
      the proxy begins its final fade. The proxy is still fully opaque at
      that instant, so the handoff is invisible; as it fades, the real
      clickable hero is already waiting underneath it.
    */
    if (
      sourceImage &&
      sourceImage.isConnected
    ) {
      window.setTimeout(
        () => {
          if (
            sourceImage.isConnected
          ) {
            sourceImage.style.visibility =
              "";
          }
        },
        returnFadeDelay
      );
    }


    imageProxy.animate(
      [
        { opacity: 1 },
        { opacity: 0 }
      ],
      {
        duration:
          returnFadeDuration,

        delay:
          returnFadeDelay,

        easing:
          "ease-in",

        fill:
          "forwards"
      }
    );


    /*
      Begin the black-background fade at the same moment the screenshot
      starts returning to its framed position.
    */
    lightbox.classList.remove(
      "is-open"
    );


    document.body.classList.remove(
      "is-media-lightbox-open"
    );


    await imagePromise.catch(
      () => {}
    );


    imageProxy.remove();

    buttonMorph?.proxy.remove();


    if (
      sourceImage &&
      sourceImage.isConnected
    ) {
      sourceImage.style.visibility =
        "";
    }


    sourceButton?.classList.remove(
      "is-lightbox-morph-source"
    );


    image.removeAttribute(
      "src"
    );

    image.alt = "";


    const lastFocusedElement =
      mediaLightboxState.lastFocusedElement;


    finalizeMediaLightboxClosedState(
      lightbox
    );


    if (
      lastFocusedElement &&
      lastFocusedElement.isConnected
    ) {
      lastFocusedElement
        .focus?.({
          preventScroll: true
        });
    }
  };


  const openMediaLightbox = async (
    src,
    alt = "",
    sourceImage = null
  ) => {
    const lightbox =
      getMediaLightbox();


    if (
      mediaLightboxState.isAnimating ||
      lightbox.classList.contains(
        "is-open"
      )
    ) {
      return;
    }


    const image =
      lightbox.querySelector(
        ".media-lightbox-image"
      );

    const closeButton =
      lightbox.querySelector(
        ".media-lightbox-close"
      );


    if (!image) {
      return;
    }


    mediaLightboxState.isAnimating =
      true;

    syncPageInputOwnership();


    lightbox.classList.remove(
      "is-closing"
    );


    mediaLightboxState.sourceImage =
      sourceImage;

    mediaLightboxState.sourceButton =
      getCurrentPageNavButton();

    mediaLightboxState.lastFocusedElement =
      document.activeElement;


    /*
      Cache the owning page accent directly from the media browser/frame.
      This keeps the shared lightbox page-aware for Etherian, Brobots and
      Halodoom instead of depending solely on whichever nav button happens
      to be current.
    */
    const owningPageFrame =
      sourceImage?.closest(
        ".prototype-page-frame"
      ) ||
      null;


    mediaLightboxState.pageAccentRgb =
      owningPageFrame
        ? getComputedStyle(
            owningPageFrame
          ).getPropertyValue(
            "--page-accent-rgb"
          ).trim()
        : "";


    const mediaBrowser =
      sourceImage?.closest(
        "[data-media-browser]"
      ) ||
      null;


    mediaLightboxState.mediaBrowser =
      mediaBrowser;


    mediaLightboxState.imageItems =
      mediaBrowser
        ? Array.from(
            mediaBrowser.querySelectorAll(
              '[data-media-item][data-media-type="image"]'
            )
          )
        : [];


    mediaLightboxState.imageIndex =
      mediaLightboxState.imageItems.findIndex(
        (item) =>
          item.dataset.mediaSrc ===
          src
      );


    image.src =
      src;

    image.alt =
      alt;


    /*
      Make sure natural image dimensions are available before calculating
      the final contain rectangle.
    */
    try {
      await image.decode();
    }

    catch {
      // decode() can reject for already-cached images; layout still works.
    }


    const {
      duration,
      buttonDuration,
      easing
    } =
      getMediaLightboxTiming();


    const sourceGeometry =
      getLightboxSourceMorphGeometry(
        sourceImage
      );


    const sourceClipPath =
      sourceGeometry
        ?.clipPath ||
      rectangularSixPointClip;


    const sourceFlatClipPath =
      sourceGeometry
        ?.flatClipPath ||
      rectangularSixPointClip;


    const startRect =
      sourceGeometry
        ?.rect ||
      getContainedRect(
        image.naturalWidth,
        image.naturalHeight,
        24
      );


    /*
      IMPORTANT:
      The fullscreen image is sized by CSS inside the lightbox's padded
      safe-area. Do not duplicate that layout math in JS.

      Instead, reveal the lightbox invisibly, let the browser perform its
      real layout, then measure the exact rectangle the image will occupy.
      The morph proxy therefore lands pixel-for-pixel on the final image.
    */
    document.body.classList.add(
      "is-media-lightbox-open"
    );

    lightbox.style.pointerEvents =
      "";

    lightbox.classList.add(
      "is-open"
    );


    await new Promise(
      (resolve) =>
        requestAnimationFrame(() => {
          requestAnimationFrame(
            resolve
          );
        })
    );


    const measuredEndRect =
      image.getBoundingClientRect();


    const endRect =
      (
        measuredEndRect.width > 0 &&
        measuredEndRect.height > 0
      )
        ? measuredEndRect
        : getContainedRect(
            image.naturalWidth,
            image.naturalHeight,
            24
          );


    const imageProxy =
      document.createElement(
        "img"
      );


    imageProxy.className =
      "media-lightbox-image-morph";

    imageProxy.src =
      src;

    imageProxy.alt = "";


    Object.assign(
      imageProxy.style,
      {
        left:
          `${startRect.left}px`,

        top:
          `${startRect.top}px`,

        width:
          `${startRect.width}px`,

        height:
          `${startRect.height}px`,

        /*
          Seed the exact angled source shape BEFORE the proxy is appended.
          Without this, the browser can paint one rectangular frame before
          the animation's first clip-path keyframe takes effect.
        */
        clipPath:
          sourceClipPath
      }
    );


    document.body.appendChild(
      imageProxy
    );


    /*
      The hero media lives underneath the raster frame. Fade the morph proxy
      in quickly so its oversized cover bounds never visibly "emerge" from
      behind the frame before the motion has cleared the border.
    */
    imageProxy.style.opacity =
      "0";


    const openingProxyFade =
      imageProxy.animate(
        [
          { opacity: 0 },
          { opacity: 1 }
        ],
        {
          duration:
            Math.min(
              180,
              duration * 0.36
            ),

          easing:
            "ease-out",

          fill:
            "forwards"
        }
      );


    /*
      Keep the real framed hero visible UNDER the proxy while the proxy
      fades in. Once the proxy is fully opaque, it can safely take complete
      ownership of the image without creating a blank frame underneath.
    */
    if (sourceImage) {
      openingProxyFade.finished
        .then(
          () => {
            if (
              sourceImage.isConnected
            ) {
              sourceImage.style.visibility =
                "hidden";
            }
          }
        )
        .catch(
          () => {}
        );
    }


    const sourceButton =
      mediaLightboxState.sourceButton;


    const sourceButtonSnapshot =
      getLightboxSourceButtonSnapshot(
        sourceButton
      );


    /*
      A mobile collapse may have happened since the last lightbox session.
      Start from a clean physical box so the fresh CSS-variable geometry
      completely determines the new X placement.
    */
    clearLightboxClosePhysicalOverrides(
      closeButton
    );


    applyLightboxSnapshotToCloseButton(
      closeButton,
      sourceButtonSnapshot
    );


    const buttonMorph =
      createLightboxButtonMorph(
        sourceButton
      );


    if (
      buttonMorph &&
      sourceButtonSnapshot
    ) {
      buttonMorph.proxy.style.setProperty(
        "--media-lightbox-morph-shear",
        `${sourceButtonSnapshot.shear}px`
      );
    }


    sourceButton?.classList.add(
      "is-lightbox-morph-source"
    );


    /*
      The lightbox is already open above so its CSS-sized image could be
      measured. Wait one more frame here so the close button also has its
      final target rectangle before the button morph begins.
    */
    await new Promise(
      (resolve) =>
        requestAnimationFrame(
          resolve
        )
    );


    if (buttonMorph && closeButton) {
      const navRect =
        sourceButton.getBoundingClientRect();

      const closeRect =
        getLightboxCloseTargetRect(
          sourceButton,
          closeButton
        );


      if (!closeRect) {
        return;
      }


      /*
        The proxy rectangle was already arriving at the correct size, but
        its internal skewed face was still using the source button's
        full-height shear. Animate the shear run with the height so the
        visible endpoint exactly matches the real X.
      */
      const sourceShear =
        sourceButtonSnapshot
          ? sourceButtonSnapshot.shear
          : navRect.height * 0.73;


      const targetShear =
        closeRect.height * 0.73;


      animateRect(
        buttonMorph.proxy,
        navRect,
        closeRect,
        buttonDuration,
        easing,
        {
          "--media-lightbox-morph-shear":
            `${sourceShear}px`
        },
        {
          "--media-lightbox-morph-shear":
            `${targetShear}px`
        }
      );


      buttonMorph.label.animate(
        [
          { opacity: 1 },
          { opacity: 0 }
        ],
        {
          duration:
            buttonDuration * 0.48,

          easing,
          fill: "forwards"
        }
      );


      buttonMorph.x.animate(
        [
          { opacity: 0 },
          { opacity: 1 }
        ],
        {
          duration:
            buttonDuration * 0.55,

          delay:
            buttonDuration * 0.30,

          easing,
          fill: "forwards"
        }
      );
    }


    await animateRect(
      imageProxy,
      startRect,
      endRect,
      duration,
      easing,
      {
        /*
          Start with the exact cut-corner silhouette of the in-page
          media viewer.
        */
        clipPath:
          sourceClipPath,

        boxShadow:
          "0 0 0 rgba(0,0,0,0)"
      },
      {
        /*
          Collapse the diagonal cuts to zero over the SAME movement
          lifetime, leaving a normal rectangular fullscreen image.
        */
        clipPath:
          sourceFlatClipPath,

        boxShadow:
          "0 18px 60px rgba(0,0,0,0.58)"
      }
    ).catch(
      () => {}
    );


    imageProxy.remove();

    buttonMorph?.proxy.remove();


    lightbox.classList.add(
      "is-settled"
    );


    const previousButton =
      lightbox.querySelector(
        ".media-lightbox-arrow--previous"
      );

    const nextButton =
      lightbox.querySelector(
        ".media-lightbox-arrow--next"
      );


    if (previousButton) {
      previousButton.disabled =
        mediaLightboxState.imageIndex <= 0;
    }


    if (nextButton) {
      nextButton.disabled =
        mediaLightboxState.imageIndex < 0 ||
        mediaLightboxState.imageIndex >=
          mediaLightboxState.imageItems.length - 1;
    }


    mediaLightboxState.isAnimating =
      false;

    syncPageInputOwnership();


    closeButton?.focus({
      preventScroll: true
    });
  };




  const initializeMediaBrowser = (
    browser
  ) => {
    const stage =
      browser.querySelector(
        "[data-media-viewer-stage]"
      );



    const viewer =
      browser.querySelector(
        ".media-viewer"
      );


    /*
      Stable owner for all mobile hero interaction.

      Important: mobile touch ownership belongs to the fixed hero STAGE, not
      to whichever <img> happens to be inside the current wipe wrapper.
      Completed wipe images can deliberately retain unusual geometry to avoid
      visual snapping; they should never define the interactive hit area.
    */
    const owningGamePage =
      browser.closest(
        ".prototype-page-frame"
      );


    const owningGamePageName =
      (
        Array.from(
          pageFrames.entries()
        ).find(
          (
            [
              ,
              frame
            ]
          ) =>
            frame ===
            owningGamePage
        )
        ?.[0]
      ) ||
      owningGamePage?.dataset.page ||
      null;


    const setViewerAspectRatio = (
      ratio = 16 / 9
    ) => {
      if (!viewer) {
        return;
      }


      const safeRatio =
        Number.isFinite(
          ratio
        ) &&
        ratio > 0
          ? ratio
          : 16 / 9;


      viewer.style.setProperty(
        "--media-viewer-aspect-number",
        String(
          safeRatio
        )
      );
    };

    const thumbnails =
      browser.querySelector(
        "[data-media-thumbnails]"
      );

    const items =
      Array.from(
        browser.querySelectorAll(
          "[data-media-item]"
        )
      );

    const previousButton =
      browser.querySelector(
        "[data-media-prev]"
      );

    const nextButton =
      browser.querySelector(
        "[data-media-next]"
      );


    /*
      Tablet hero navigation
      ----------------------
      Brobots no longer uses its thumbnail strip as the tablet interaction
      surface. Keep the existing authored thumbnail items as the SINGLE media
      data source, but create a lightweight hero-overlay controller from them.

      This is deliberately generated here instead of adding duplicate media
      markup to HTML. The same renderItem() function below therefore remains
      the only thing that actually changes the selected media.
    */
    const heroZone =
      browser.querySelector(
        '[data-game-frame-zone="hero"]'
      );


    let heroNavigation = null;
    let heroPreviousButton = null;
    let heroNextButton = null;
    let heroDots = [];


    if (heroZone) {
      heroNavigation =
        document.createElement(
          "div"
        );

      heroNavigation.className =
        "media-hero-navigation";

      const owningGamePage =
        browser.closest(
          ".prototype-page-frame"
        );

      const owningGameName =
        owningGamePage?.dataset.page ||
        "game";

      heroNavigation.setAttribute(
        "aria-label",
        `${owningGameName} media navigation`
      );


      heroPreviousButton =
        document.createElement(
          "button"
        );

      heroPreviousButton.type =
        "button";

      heroPreviousButton.className =
        "media-hero-arrow media-hero-arrow--previous";

      heroPreviousButton.setAttribute(
        "aria-label",
        "Previous media"
      );

      heroPreviousButton.innerHTML =
        '<span aria-hidden="true">‹</span>';


      heroNextButton =
        document.createElement(
          "button"
        );

      heroNextButton.type =
        "button";

      heroNextButton.className =
        "media-hero-arrow media-hero-arrow--next";

      heroNextButton.setAttribute(
        "aria-label",
        "Next media"
      );

      heroNextButton.innerHTML =
        '<span aria-hidden="true">›</span>';


      const dotRail =
        document.createElement(
          "div"
        );

      dotRail.className =
        "media-hero-dots";

      dotRail.setAttribute(
        "aria-label",
        "Choose media"
      );


      heroDots =
        items.map(
          (item, index) => {
            const dot =
              document.createElement(
                "button"
              );


            dot.type =
              "button";

            dot.className =
              "media-hero-dot";

            dot.setAttribute(
              "aria-label",
              `Show ${
                item.dataset.mediaTitle ||
                `media ${index + 1}`
              }`
            );

            dotRail.appendChild(
              dot
            );

            return dot;
          }
        );


      heroNavigation.append(
        heroPreviousButton,
        heroNextButton,
        dotRail
      );


      heroZone.appendChild(
        heroNavigation
      );
    }


    if (
      !stage ||
      !thumbnails ||
      items.length === 0
    ) {
      heroNavigation?.remove();

      return;
    }


    let activeIndex =
      Math.max(
        0,
        items.findIndex(
          (item) =>
            item.classList.contains(
              "is-selected"
            )
        )
      );


    /*
      Mobile single-tap lightbox
      --------------------------
      The hero stage is the interaction surface. This keeps the tappable area
      exactly equal to the visible hero cavity even when a completed wipe
      wrapper contains an oversized/repositioned image element.

      Horizontal/vertical swipes still win because we only open after touchend
      when total movement stayed below the tap threshold.
    */
    let mobileHeroTapStartX =
      0;

    let mobileHeroTapStartY =
      0;


    stage.addEventListener(
      "touchstart",
      (event) => {
        if (
          iconButtonMode.matches ||
          event.touches.length !== 1 ||
          !pageOwnsInput(
            owningGamePageName
          )
        ) {
          return;
        }


        const touch =
          event.touches[0];


        mobileHeroTapStartX =
          touch.clientX;

        mobileHeroTapStartY =
          touch.clientY;
      },
      {
        passive: true
      }
    );


    stage.addEventListener(
      "touchend",
      (event) => {
        if (
          iconButtonMode.matches ||
          event.changedTouches.length !== 1 ||
          !pageOwnsInput(
            owningGamePageName
          )
        ) {
          return;
        }


        const touch =
          event.changedTouches[0];

        const moved =
          Math.hypot(
            touch.clientX -
              mobileHeroTapStartX,
            touch.clientY -
              mobileHeroTapStartY
          );


        if (moved > 14) {
          return;
        }


        const activeItem =
          items[activeIndex];


        if (
          !activeItem ||
          activeItem.dataset.mediaType !==
            "image"
        ) {
          return;
        }


        const sourceImage =
          stage.querySelector(
            ".mobile-media-wipe-layer.is-wipe-complete:not(.is-wipe-outgoing) > .media-viewer-image"
          ) ||
          stage.querySelector(
            ".media-viewer-image"
          );


        if (!(sourceImage instanceof HTMLImageElement)) {
          return;
        }


        event.preventDefault();


        openMediaLightbox(
          activeItem.dataset.mediaSrc,
          activeItem.dataset.mediaTitle ||
            "Game screenshot",
          sourceImage
        );
      },
      {
        passive: false
      }
    );


    const updateArrowState = () => {
      const atStart =
        activeIndex <= 0;

      const atEnd =
        activeIndex >=
        items.length - 1;


      if (previousButton) {
        previousButton.disabled =
          atStart;
      }


      if (nextButton) {
        nextButton.disabled =
          atEnd;
      }


      if (heroPreviousButton) {
        heroPreviousButton.disabled =
          atStart;
      }


      if (heroNextButton) {
        heroNextButton.disabled =
          atEnd;
      }


      heroDots.forEach(
        (dot, index) => {
          const selected =
            index ===
            activeIndex;


          dot.classList.toggle(
            "is-selected",
            selected
          );


          if (selected) {
            dot.setAttribute(
              "aria-current",
              "true"
            );
          }

          else {
            dot.removeAttribute(
              "aria-current"
            );
          }
        }
      );
    };


    /*
      Thumbnail navigation is index-based rather than pixel-centered.

      The previous version centered the active thumbnail using offsetLeft.
      That could leave the rail at fractional / in-between positions, and
      those pixel positions became stale when the page changed size after
      resizing or leaving fullscreen.

      We always show three items and store the logical FIRST visible item.
      The actual scrollLeft is recalculated from current element geometry.
    */
    const visibleThumbnailCount = 3;


    let railStartIndex =
      Math.max(
        0,
        Math.min(
          Math.max(
            0,
            items.length -
            visibleThumbnailCount
          ),
          activeIndex -
          1
        )
      );


    const clampRailStart = (
      index
    ) => {
      return Math.max(
        0,
        Math.min(
          Math.max(
            0,
            items.length -
            visibleThumbnailCount
          ),
          index
        )
      );
    };


    const getRailTargetLeft = () => {
      const firstItem =
        items[0];

      const startItem =
        items[railStartIndex];


      if (
        !firstItem ||
        !startItem
      ) {
        return 0;
      }


      return Math.max(
        0,
        startItem.offsetLeft -
        firstItem.offsetLeft
      );
    };


    const syncRailToLayout = () => {
      /*
        Direct assignment is intentional for layout correction.
        It cannot queue a smooth scroll toward stale geometry.
      */
      thumbnails.scrollLeft =
        getRailTargetLeft();
    };


    const scrollRailToStart = (
      behavior = "auto"
    ) => {
      const targetLeft =
        getRailTargetLeft();


      if (behavior === "smooth") {
        thumbnails.scrollTo({
          left:
            targetLeft,

          behavior:
            "smooth"
        });

        return;
      }


      thumbnails.scrollLeft =
        targetLeft;
    };


    const ensureActiveThumbnailVisible = (
      behavior = "smooth"
    ) => {
      /*
        Keep the active item in the CENTER slot whenever the rail has enough
        items on both sides.

        With three visible thumbnails:
          desired first visible item = activeIndex - 1

        clampRailStart() naturally handles the edges:
          first item  -> [0, 1, 2]
          middle item -> [n-1, n, n+1]
          last item   -> [last-2, last-1, last]

        So "center whenever possible" falls out of one continuous rule
        instead of needing special cases.
      */
      railStartIndex =
        clampRailStart(
          activeIndex - 1
        );


      scrollRailToStart(
        behavior
      );
    };


    /*
      Keep the rail locked to its logical item position whenever its
      geometry changes — including browser resize and video fullscreen
      enter/exit. The correction is immediate, not animated.
    */
    const thumbnailResizeObserver =
      new ResizeObserver(() => {
        syncRailToLayout();
      });


    thumbnailResizeObserver.observe(
      thumbnails
    );


    /*
      Crucial for BOTH directions of the desktop/tablet handoff:
      the outer page-frame animation calls this on every RAF immediately
      after changing the frame's real width/height.
    */
    mediaRailLayoutSyncCallbacks.add(
      syncRailToLayout
    );


    document.addEventListener(
      "fullscreenchange",
      () => {
        requestAnimationFrame(() => {
          syncRailToLayout();

          requestAnimationFrame(
            syncRailToLayout
          );
        });
      }
    );


    const renderItem = (
      index,
      {
        focusThumbnail = false,
        scrollBehavior = "smooth",
        transitionDirection = 0,
        syncFromLightbox = false
      } = {}
    ) => {
      const clampedIndex =
        Math.max(
          0,
          Math.min(
            items.length - 1,
            index
          )
        );


      const previousIndex =
        activeIndex;

      const resolvedTransitionDirection =
        transitionDirection ||
        (
          clampedIndex > previousIndex
            ? 1
            : clampedIndex < previousIndex
              ? -1
              : 0
        );


      activeIndex =
        clampedIndex;


      items.forEach(
        (item, itemIndex) => {
          const selected =
            itemIndex ===
            activeIndex;


          item.classList.toggle(
            "is-selected",
            selected
          );


          item.setAttribute(
            "aria-pressed",
            selected
              ? "true"
              : "false"
          );
        }
      );


      const activeItem =
        items[activeIndex];

      const mediaElement =
        createMediaElement(
          activeItem
        );


      const mobileImageWipe =
        !syncFromLightbox &&
        !iconButtonMode.matches &&
        resolvedTransitionDirection !== 0 &&
        mediaElement instanceof HTMLImageElement &&
        stage.querySelector(
          ".media-viewer-image"
        ) instanceof HTMLImageElement;


      let outgoingMedia =
        null;


      if (mobileImageWipe) {
        /*
          If the currently-visible image is already living inside a completed
          wipe wrapper, preserve that WHOLE rendered layer as A.

          v112 cloned only the nested <img> and moved that clone directly into
          the stage. That changed its positioning context at the exact moment
          a new swipe began, which caused the new start-of-swipe pop.
        */
        const currentCompletedLayer =
          stage.querySelector(
            ".mobile-media-wipe-layer.is-wipe-complete"
          );


        if (currentCompletedLayer) {
          outgoingMedia =
            currentCompletedLayer.cloneNode(
              true
            );


          /*
            Preserve the completed layer's exact directional anchoring.

            The previous pass stripped is-wipe-complete / directional state
            and then normalized the clone with new CSS. That changed a
            right-anchored completed image into a left-anchored outgoing one
            at the instant the next swipe began — the visible "pop".

            Keep the rendered layer exactly as it is and only tag it as the
            outgoing snapshot.
          */
          outgoingMedia.classList.remove(
            "is-wipe-running"
          );


          outgoingMedia.classList.add(
            "is-wipe-outgoing"
          );
        }

        else {
          outgoingMedia =
            stage.querySelector(
              ".media-viewer-image"
            )?.cloneNode(
              true
            ) ||
            null;


          if (outgoingMedia) {
            outgoingMedia.classList.remove(
              "media-viewer-image--incoming",
              "is-wipe-forward",
              "is-wipe-backward",
              "is-wipe-running"
            );


            outgoingMedia.classList.add(
              "media-viewer-image--outgoing"
            );
          }
        }
      }

      else {
        stage.classList.remove(
          "is-ready"
        );
      }


      stage.classList.remove(
        "is-mobile-wipe-forward",
        "is-mobile-wipe-backward"
      );


      /*
        Videos and YouTube retain the established 16:9 viewer.
        Images replace that ratio with their intrinsic dimensions once the
        file is available.
      */
      setViewerAspectRatio(
        16 / 9
      );


      /*
        Replacing the child also stops any previous YouTube/local-video
        playback automatically, so media never keeps playing off-screen.
      */
      stage.replaceChildren();


      if (outgoingMedia) {
        stage.appendChild(
          outgoingMedia
        );
      }


      let incomingWipeWrapper =
        null;


      if (mediaElement) {
        if (mobileImageWipe) {
          incomingWipeWrapper =
            document.createElement(
              "div"
            );


          incomingWipeWrapper.className =
            "mobile-media-wipe-layer " +
            (
              resolvedTransitionDirection > 0
                ? "is-wipe-forward"
                : "is-wipe-backward"
            );


          /*
            Keep B at the full hero dimensions inside a width-animated,
            overflow-hidden wrapper. This avoids the mask-position ambiguity
            that made the previous versions reveal A again over B.
          */
          incomingWipeWrapper.appendChild(
            mediaElement
          );


          stage.appendChild(
            incomingWipeWrapper
          );
        }

        else {
          stage.appendChild(
            mediaElement
          );
        }
      }


      /*
        Important: do NOT start the wipe yet.

        On a phone the incoming screenshot may still be decoding/loading.
        Starting the animation here means the wipe can finish while the new
        image is still blank, leaving only the old image visible and then
        snapping to the new one afterward.

        The wipe now begins inside revealImage(), only after the incoming
        screenshot is actually ready to paint.
      */


      if (
        mediaElement instanceof HTMLImageElement
      ) {
        const revealImage = () => {
          if (
            mediaElement.naturalWidth > 0 &&
            mediaElement.naturalHeight > 0
          ) {
            setViewerAspectRatio(
              mediaElement.naturalWidth /
              mediaElement.naturalHeight
            );
          }


          requestAnimationFrame(() => {
            stage.classList.add(
              "is-ready"
            );


            if (
              mobileImageWipe &&
              incomingWipeWrapper
            ) {
              incomingWipeWrapper.addEventListener(
                "animationend",
                () => {
                  stage
                    .querySelector(
                      ".is-wipe-outgoing, .media-viewer-image--outgoing"
                    )
                    ?.remove();


                  /*
                    Do NOT unwrap B at the end of the wipe.

                    The wrapped image uses a slightly different positioning
                    context than the normal stage image. Moving B out of that
                    wrapper after the animation caused the tiny 1-2px snap the
                    user could see at completion.

                    Instead, keep the fully-revealed wrapper in place as the
                    stable final state. The next render replaces the whole
                    stage anyway, so there is no cleanup penalty.
                  */
                  incomingWipeWrapper.classList.add(
                    "is-wipe-complete"
                  );
                },
                {
                  once: true
                }
              );


              /*
                Paint the zero-width reveal layer first. The next frame expands
                that layer over static A. Only the wrapper animates; neither
                screenshot moves or changes opacity.
              */
              incomingWipeWrapper
                .getBoundingClientRect();


              requestAnimationFrame(
                () => {
                  incomingWipeWrapper.classList.add(
                    "is-wipe-running"
                  );
                }
              );
            }
          });
        };


        if (mediaElement.complete) {
          revealImage();
        }

        else {
          mediaElement.addEventListener(
            "load",
            revealImage,
            {
              once: true
            }
          );


          mediaElement.addEventListener(
            "error",
            () => {
              requestAnimationFrame(() => {
                stage.classList.add(
                  "is-ready"
                );
              });
            },
            {
              once: true
            }
          );
        }
      }

      else {
        requestAnimationFrame(() => {
          stage.classList.add(
            "is-ready"
          );
        });
      }


      ensureActiveThumbnailVisible(
        scrollBehavior
      );


      if (focusThumbnail) {
        activeItem.focus({
          preventScroll: true
        });
      }


      updateArrowState();
    };


    /*
      Give the shared lightbox a clean way to synchronize this browser while
      fullscreen. The lightbox supplies the exact image item/index and we
      intentionally skip hero wipe animation for that hidden background sync.
    */
    mediaBrowserRenderers.set(
      browser,
      (
        item,
        index
      ) => {
        if (
          !item ||
          index < 0 ||
          index >= items.length
        ) {
          return;
        }


        renderItem(
          index,
          {
            scrollBehavior: "auto",
            transitionDirection: 0,
            syncFromLightbox: true
          }
        );
      }
    );


    items.forEach(
      (item, index) => {
        item.addEventListener(
          "click",
          () => {
            renderItem(
              index
            );
          }
        );
      }
    );


    previousButton?.addEventListener(
      "click",
      () => {
        renderItem(
          activeIndex - 1,
          {
            focusThumbnail: true
          }
        );
      }
    );


    nextButton?.addEventListener(
      "click",
      () => {
        renderItem(
          activeIndex + 1,
          {
            focusThumbnail: true
          }
        );
      }
    );


    heroPreviousButton?.addEventListener(
      "click",
      () => {
        renderItem(
          activeIndex - 1
        );
      }
    );


    heroNextButton?.addEventListener(
      "click",
      () => {
        renderItem(
          activeIndex + 1
        );
      }
    );


    heroDots.forEach(
      (dot, index) => {
        dot.addEventListener(
          "click",
          () => {
            renderItem(
              index
            );
          }
        );
      }
    );


    /*
      Mobile horizontal swipe navigation
      ----------------------------------
      While a game page is open on phone, horizontal swipes belong to the
      media browser:

        finger LEFT  -> next hero media
        finger RIGHT -> previous hero media

      We claim a clearly-horizontal gesture early so browser history/edge
      navigation never steals it, but retain a larger threshold before
      actually changing media.

      Vertical gestures are left alone here so the existing media/info/page
      state machine can own them.
    */
    const owningGamePageForSwipe =
      owningGamePage;

    const owningGamePageNameForSwipe =
      owningGamePageName;


    let mediaSwipeStartX =
      0;

    let mediaSwipeStartY =
      0;

    let mediaSwipeTracking =
      false;

    let mediaSwipeConsumed =
      false;


    const clearMediaSwipe =
      () => {
        mediaSwipeTracking =
          false;

        mediaSwipeConsumed =
          false;
      };


    owningGamePageForSwipe?.addEventListener(
      "touchstart",
      (event) => {
        if (
          iconButtonMode.matches ||
          !owningGamePageForSwipe.classList.contains(
            "is-open"
          ) ||
          !pageOwnsInput(
            owningGamePageNameForSwipe
          ) ||
          event.touches.length !== 1
        ) {
          clearMediaSwipe();

          return;
        }


        const touch =
          event.touches[0];


        mediaSwipeStartX =
          touch.clientX;

        mediaSwipeStartY =
          touch.clientY;

        mediaSwipeTracking =
          true;

        mediaSwipeConsumed =
          false;
      },
      {
        passive: true
      }
    );


    owningGamePageForSwipe?.addEventListener(
      "touchmove",
      (event) => {
        if (
          !mediaSwipeTracking ||
          mediaSwipeConsumed ||
          event.touches.length !== 1
        ) {
          return;
        }


        const touch =
          event.touches[0];

        const deltaX =
          touch.clientX -
          mediaSwipeStartX;

        const deltaY =
          touch.clientY -
          mediaSwipeStartY;


        const horizontalIntentIsClear =
          Math.abs(deltaX) >= 8 &&
          Math.abs(deltaX) >
            Math.abs(deltaY) * 1.1;


        if (!horizontalIntentIsClear) {
          return;
        }


        /*
          Own the gesture immediately once it is clearly horizontal.
          This is especially important near iOS/Android screen edges where
          the browser may otherwise begin back/forward history navigation.
        */
        event.preventDefault();


        if (
          Math.abs(deltaX) < 46
        ) {
          return;
        }


        /*
          Finger moving LEFT = advance.
          Finger moving RIGHT = go back.
        */
        const targetIndex =
          deltaX < 0
            ? activeIndex + 1
            : activeIndex - 1;


        /*
          Keep the existing non-wrapping media semantics used by the arrow
          buttons. A swipe at either end simply does nothing.
        */
        if (
          targetIndex < 0 ||
          targetIndex >= items.length
        ) {
          mediaSwipeConsumed =
            true;

          return;
        }


        const swipePageName =
          owningGamePageNameForSwipe;


        playMobileHorizontalSwipeFeedback(
          deltaX < 0
            ? 1
            : -1,
          swipePageName
        );


        renderItem(
          targetIndex,
          {
            transitionDirection:
              deltaX < 0
                ? 1
                : -1
          }
        );


        mediaSwipeConsumed =
          true;
      },
      {
        passive: false
      }
    );


    owningGamePageForSwipe?.addEventListener(
      "touchend",
      clearMediaSwipe,
      {
        passive: true
      }
    );


    owningGamePageForSwipe?.addEventListener(
      "touchcancel",
      clearMediaSwipe,
      {
        passive: true
      }
    );


    browser.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();

          renderItem(
            activeIndex - 1,
            {
              focusThumbnail: true
            }
          );
        }


        if (event.key === "ArrowRight") {
          event.preventDefault();

          renderItem(
            activeIndex + 1,
            {
              focusThumbnail: true
            }
          );
        }
      }
    );


    /*
      Initial media is rendered without a scroll animation so opening the
      page frame does not cause the thumbnail rail to visibly slide.
    */
    renderItem(
      activeIndex,
      {
        scrollBehavior: "auto"
      }
    );


    /*
      One extra post-layout alignment handles fonts/images affecting the
      first measured thumbnail geometry during initial page load.
    */
    requestAnimationFrame(() => {
      scrollRailToStart(
        "auto"
      );
    });
  };


  mediaBrowsers.forEach(
    initializeMediaBrowser
  );


  /* =======================================================
     Game-info feature-card crowding guard
     ======================================================= */

  /*
    This used to be wired specifically to #etherian-page-frame even though
    the visual layout itself was already reusable. Make the behavior truly
    modular now: every .game-info-features block gets the same vertical-
    pressure culling logic.
  */
  const gameInfoFeatureGrids =
    Array.from(
      document.querySelectorAll(
        ".game-info-features"
      )
    );


  const updateGameInfoLayout = (
    frame
  ) => {
    if (!frame) {
      return;
    }


    /*
      Keep legacy state classes cleared so they cannot create resize pops.
    */
    frame.classList.remove(
      "is-info-compact",
      "is-info-tight"
    );
  };


  const getNaturalFeatureHeight = (
    featureGrid
  ) => {
    if (!featureGrid) {
      return 0;
    }


    const cards =
      Array.from(
        featureGrid.querySelectorAll(
          ".game-info-feature"
        )
      );


    if (cards.length === 0) {
      return 0;
    }


    const styles =
      getComputedStyle(
        featureGrid
      );


    const rowGap =
      parseFloat(
        styles.rowGap
      ) || 0;


    /*
      The current info layout uses two columns. Measure each visual row from
      its tallest card so the height remains stable while the parent track
      animates toward zero.
    */
    const cardHeights =
      cards.map(
        (card) =>
          card.getBoundingClientRect().height
      );


    let totalHeight = 0;


    for (
      let index = 0;
      index < cardHeights.length;
      index += 2
    ) {
      const rowHeight =
        Math.max(
          cardHeights[index] || 0,
          cardHeights[index + 1] || 0
        );


      if (rowHeight <= 0) {
        continue;
      }


      if (totalHeight > 0) {
        totalHeight +=
          rowGap;
      }


      totalHeight +=
        rowHeight;
    }


    return totalHeight;
  };


  const updateGameInfoFeatureCrowding = (
    featureGrid
  ) => {
    if (!featureGrid) {
      return;
    }


    const surface =
      featureGrid.closest(
        ".game-info-surface"
      );


    const frame =
      featureGrid.closest(
        ".prototype-page-frame"
      );


    const topZone =
      surface?.querySelector(
        ".game-info-top-zone"
      );


    const bottomZone =
      surface?.querySelector(
        ".game-info-bottom-zone"
      );


    if (
      !surface ||
      !frame ||
      !topZone ||
      !bottomZone
    ) {
      return;
    }


    updateGameInfoLayout(
      frame
    );


    const surfaceRect =
      surface.getBoundingClientRect();


    const naturalFeatureHeight =
      Math.max(
        getNaturalFeatureHeight(
          featureGrid
        ),
        1
      );


    /*
      Same threshold that was tuned for Etherian.
      The important part is that the decision responds only to genuine
      vertical pressure, not to X-axis compression.
    */
    const minimumFeatureHeight =
      575;


    let verticalPressureHeight =
      surfaceRect.height;


    if (
      fullTextDesktopMode.matches &&
      !pageLayoutTransitionActive
    ) {
      const frameRect =
        frame.getBoundingClientRect();


      const frameStyles =
        getComputedStyle(
          frame
        );


      const pageShiftY =
        parseFloat(
          frameStyles.getPropertyValue(
            "--page-frame-shift-y"
          )
        ) || 0;


      const availableFrameHeight =
        Math.max(
          frameRect.height,
          (
            2 *
            (
              window.innerHeight -
              frameRect.top +
              pageShiftY
            )
          ) -
          frameRect.height
        );


      if (
        frameRect.height > 0 &&
        availableFrameHeight > 0
      ) {
        verticalPressureHeight =
          surfaceRect.height *
          (
            availableFrameHeight /
            frameRect.height
          );
      }
    }


    const featuresCollapsed =
      verticalPressureHeight <
        minimumFeatureHeight;


    surface.classList.toggle(
      "is-features-collapsed",
      featuresCollapsed
    );


    surface.style.setProperty(
      "--feature-zone-height",
      featuresCollapsed
        ? "0px"
        : `${naturalFeatureHeight}px`
    );
  };


  /*
    One shared observer + registration path for EVERY info surface.

    This is intentionally reusable by desktop popouts and dynamically
    created tablet surfaces. Future culling stages can therefore be added
    inside updateGameInfoFeatureCrowding() once and automatically apply to
    both presentations.
  */
  let gameInfoFeatureObserver =
    null;


  if (
    typeof ResizeObserver ===
    "function"
  ) {
    gameInfoFeatureObserver =
      new ResizeObserver(
        (entries) => {
          const gridsToUpdate =
            new Set();


          entries.forEach(
            (entry) => {
              const grid =
                entry.target.matches(
                  ".game-info-features"
                )
                  ? entry.target
                  : entry.target.querySelector(
                      ".game-info-features"
                    );


              if (grid) {
                gridsToUpdate.add(
                  grid
                );
              }
            }
          );


          requestAnimationFrame(
            () => {
              gridsToUpdate.forEach(
                updateGameInfoFeatureCrowding
              );
            }
          );
        }
      );
  }


  const registerGameInfoFeatureGrid = (
    featureGrid
  ) => {
    if (!featureGrid) {
      return;
    }


    /*
      IMPORTANT: same function call for desktop + tablet.
    */
    updateGameInfoFeatureCrowding(
      featureGrid
    );


    if (!gameInfoFeatureObserver) {
      return;
    }


    gameInfoFeatureObserver.observe(
      featureGrid
    );


    const surface =
      featureGrid.closest(
        ".game-info-surface"
      );


    if (surface) {
      gameInfoFeatureObserver.observe(
        surface
      );
    }
  };


  const updateAllGameInfoFeatureCrowding = () => {
    document.querySelectorAll(
      ".game-info-features"
    ).forEach(
      updateGameInfoFeatureCrowding
    );
  };


  gameInfoFeatureGrids.forEach(
    registerGameInfoFeatureGrid
  );


  if (
    gameInfoFeatureGrids.length > 0
  ) {
    requestAnimationFrame(
      updateAllGameInfoFeatureCrowding
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

      captureActiveGameInfoDesktopSnapshot();
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

        updateAllGameInfoFeatureCrowding();

        checkRealPageInvariant();

        rememberStablePageRect();

        captureActiveGameInfoDesktopSnapshot();


        /*
          If a screenshot lightbox is open, re-read the source banner
          button AFTER the responsive header geometry updates. This keeps
          the X width/height/shear in lockstep with desktop/compact scaling.
        */
        syncLightboxCloseButtonToSource();


        menuMorph.setAttribute(
          "viewBox",
          `0 0 ${window.innerWidth} ${window.innerHeight}`
        );


        resizeFrame = null;
      });
  };


  window.addEventListener(
    "resize",
    () => {
      scheduleGeometryUpdate();


      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncLightboxCloseButtonToSource();
        });
      });
    }
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

  /* =======================================================
     Reusable game-frame raster skin scaling
     ======================================================= */

  const gameFrameAreas =
    Array.from(
      document.querySelectorAll(
        "[data-game-frame]"
      )
    );


  const gameFrameDimensionStates =
    new WeakMap();


  const getGameFrameDimensionState =
    (frameArea) => {
      let state =
        gameFrameDimensionStates.get(
          frameArea
        );


      if (!state) {
        state = {
          fixed:
            new Map(),

          stretchers:
            new Map(),

          derived:
            null
        };


        gameFrameDimensionStates.set(
          frameArea,
          state
        );
      }


      return state;
    };


  const getCssBackgroundUrl = (
    element
  ) => {
    const inline =
      element.style
        .getPropertyValue(
          "--brobots-stretcher-image"
        )
        .trim();


    const match =
      inline.match(
        /url\(["']?(.*?)["']?\)/
      );


    return (
      match?.[1] ||
      ""
    );
  };


  /* =======================================================
     Mobile Safari fixed-piece self-background renderer
     =======================================================

     Safari was sharper when the fixed frame artwork was painted as a CSS
     background, but creating sibling elements broke the shared frame scaling.

     This version keeps each ORIGINAL <img> as the geometry element. Safari
     simply paints the same source as that element's own background, while
     moving the replaced-image pixels outside the visible content box.

     Result:
       - exact same element
       - exact same width / height interpolation
       - exact same positioning / transforms / transitions
       - naturalWidth / naturalHeight remain available to JS
       - only the paint path changes on mobile Safari
     ======================================================= */

  const isMobileSafariFrameRenderer =
    (() => {
      const ua =
        navigator.userAgent || "";


      return (
        /AppleWebKit/i.test(
          ua
        ) &&
        /Safari/i.test(
          ua
        ) &&
        /iPhone|iPad|iPod/i.test(
          ua
        ) &&
        !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(
          ua
        )
      );
    })();


  if (isMobileSafariFrameRenderer) {
    document.documentElement.classList.add(
      "is-mobile-safari-frame-renderer"
    );
  }


  const applyMobileSafariFrameSelfBackgrounds =
    (
      frameArea
    ) => {
      if (
        !isMobileSafariFrameRenderer ||
        !frameArea
      ) {
        return;
      }


      frameArea
        .querySelectorAll(
          "img[data-game-frame-piece]"
        )
        .forEach(
          (image) => {
            const source =
              image.currentSrc ||
              image.src;


            if (!source) {
              return;
            }


            image.style.setProperty(
              "--safari-frame-piece-background",
              `url("${source.replace(
                /"/g,
                '\\"'
              )}")`
            );
          }
        );
    };


  const measureImageSource = (
    src
  ) => {
    return new Promise(
      (resolve) => {
        if (!src) {
          resolve(
            {
              width: 0,
              height: 0
            }
          );

          return;
        }


        const probe =
          new Image();


        probe.onload = () => {
          resolve(
            {
              width:
                probe.naturalWidth,

              height:
                probe.naturalHeight
            }
          );
        };


        probe.onerror = () => {
          resolve(
            {
              width: 0,
              height: 0
            }
          );
        };


        probe.src =
          src;
      }
    );
  };


  const measureGameFrameAssets =
    async (frameArea) => {
      if (!frameArea) {
        return;
      }


      const state =
        getGameFrameDimensionState(
          frameArea
        );


      state.fixed.clear();
      state.stretchers.clear();


      const fixedElements =
        Array.from(
          frameArea
            .querySelectorAll(
              "[data-game-frame-piece]"
            )
        );


      for (
        const element
        of fixedElements
      ) {
        let width =
          0;

        let height =
          0;


        if (
          element instanceof
            HTMLImageElement
        ) {
          if (
            !element.complete ||
            element.naturalWidth <= 0
          ) {
            await new Promise(
              (resolve) => {
                element.addEventListener(
                  "load",
                  resolve,
                  {
                    once: true
                  }
                );

                element.addEventListener(
                  "error",
                  resolve,
                  {
                    once: true
                  }
                );
              }
            );
          }


          width =
            element.naturalWidth;

          height =
            element.naturalHeight;
        }


        state.fixed.set(
          element.dataset
            .gameFramePiece,

          {
            element,
            width,
            height
          }
        );
      }


      const stretcherElements =
        Array.from(
          frameArea
            .querySelectorAll(
              "[data-game-frame-stretcher]"
            )
        );


      for (
        const element
        of stretcherElements
      ) {
        const dimensions =
          await measureImageSource(
            getCssBackgroundUrl(
              element
            )
          );


        state.stretchers.set(
          element.dataset
            .gameFrameStretcher,

          {
            element,
            ...dimensions
          }
        );
      }
    };


  const deriveGameFrameGeometry =
    (frameArea) => {
      if (!frameArea) {
        return null;
      }


      const state =
        getGameFrameDimensionState(
          frameArea
        );

      const fixed =
        state.fixed;

      const stretchers =
        state.stretchers;


      const f =
        (key) =>
          fixed.get(key) || {
            width: 0,
            height: 0
          };


      const s =
        (key) =>
          stretchers.get(key) || {
            width: 0,
            height: 0
          };


      const widths = {
        heroTop:
          f("hero-top-left").width +
          s("hero-stretch-top").width +
          f("hero-top-right").width,

        heroBottom:
          f("hero-bottom-left").width +
          s("hero-stretch-bottom").width +
          f("hero-bottom-right").width,

        thumbTop:
          f("thumb-top-left").width +
          s("thumb-stretch-top").width +
          f("thumb-top-right").width,

        thumbBottom:
          f("thumb-bottom-left").width +
          s("thumb-stretch-bottom").width +
          f("thumb-bottom-right").width
      };


      const heroHeights = {
        left:
          f("hero-top-left").height +
          s("hero-stretch-left").height +
          f("hero-bottom-left").height,

        right:
          f("hero-top-right").height +
          s("hero-stretch-right").height +
          f("hero-bottom-right").height
      };


      const thumbHeights = {
        left:
          f("thumb-top-left").height +
          s("thumb-stretch-left").height +
          f("thumb-bottom-left").height,

        right:
          f("thumb-top-right").height +
          s("thumb-stretch-right").height +
          f("thumb-bottom-right").height
      };


      const widthCandidates =
        Object.values(widths)
          .filter(
            (value) =>
              Number.isFinite(value) &&
              value > 0
          );


      const heroHeightCandidates =
        Object.values(heroHeights)
          .filter(
            (value) =>
              Number.isFinite(value) &&
              value > 0
          );


      const thumbHeightCandidates =
        Object.values(thumbHeights)
          .filter(
            (value) =>
              Number.isFinite(value) &&
              value > 0
          );


      if (
        widthCandidates.length === 0 ||
        heroHeightCandidates.length === 0 ||
        thumbHeightCandidates.length === 0
      ) {
        return null;
      }


      const average =
        (values) =>
          values.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          values.length;


      const nativeWidth =
        Math.round(
          average(
            widthCandidates
          )
        );


      const nativeHeroHeight =
        Math.round(
          average(
            heroHeightCandidates
          )
        );


      const nativeThumbHeight =
        Math.round(
          average(
            thumbHeightCandidates
          )
        );


      const nativeSeparatorHeight =
        0;


      const nativeHeight =
        nativeHeroHeight +
        nativeThumbHeight;


      const warnIfMismatch =
        (
          label,
          entries
        ) => {
          const values =
            Object.values(entries)
              .filter(
                (value) =>
                  Number.isFinite(value) &&
                  value > 0
              );


          if (values.length < 2) {
            return;
          }


          const min =
            Math.min(...values);

          const max =
            Math.max(...values);


          if (
            Math.abs(
              max - min
            ) >
            0.01
          ) {
            console.warn(
              `[${frameArea.dataset.gameFrame} frame] ${label} source dimensions do not agree:`,
              entries
            );
          }
        };


      warnIfMismatch(
        "native widths",
        widths
      );


      warnIfMismatch(
        "hero heights",
        heroHeights
      );


      warnIfMismatch(
        "thumbnail heights",
        thumbHeights
      );


      const derived = {
        nativeWidth,
        nativeHeight,
        nativeHeroHeight,
        nativeSeparatorHeight,
        nativeThumbHeight,

        heroEndRatio:
          nativeHeroHeight /
          nativeHeight,

        thumbStartRatio:
          nativeHeroHeight /
          nativeHeight,

        widths,
        heroHeights,
        thumbHeights
      };


      state.derived =
        derived;


      return derived;
    };


  const applyGameFrameMeasuredDimensions =
    (frameArea) => {
      if (!frameArea) {
        return;
      }


      const state =
        getGameFrameDimensionState(
          frameArea
        );

      const derived =
        state.derived;


      if (
        !derived ||
        derived.nativeWidth <= 0 ||
        derived.nativeHeight <= 0
      ) {
        return;
      }


      const responsiveLength =
        (sourcePixels) => {
          return (
            `min(` +
            `calc(100cqw * ${sourcePixels / derived.nativeWidth}), ` +
            `calc(100cqh * ${sourcePixels / derived.nativeHeight})` +
            `)`
          );
        };


      /*
        Preserve the original fixed-piece sizing substrate exactly.

        The component CSS still consumes these shared per-piece variables.
        v91 accidentally dropped this pass while parameterizing the frame
        controller, which left the fixed raster pieces without the same
        responsive scale basis as the stretchers.
      */
      state.fixed.forEach(
        (record) => {
          const baseWidth =
            responsiveLength(
              record.width
            );

          const baseHeight =
            responsiveLength(
              record.height
            );


          const infoWidth =
            `min(` +
            `calc(100cqw * ${record.width / derived.nativeWidth}), ` +
            `calc(var(--brobots-tablet-info-hero-end-y) * ${record.width / derived.nativeHeroHeight})` +
            `)`;

          const infoHeight =
            `min(` +
            `calc(100cqw * ${record.height / derived.nativeWidth}), ` +
            `calc(var(--brobots-tablet-info-hero-end-y) * ${record.height / derived.nativeHeroHeight})` +
            `)`;


          record.element.style
            .setProperty(
              "--brobots-piece-base-w",
              baseWidth
            );

          record.element.style
            .setProperty(
              "--brobots-piece-base-h",
              baseHeight
            );

          record.element.style
            .setProperty(
              "--brobots-piece-info-w",
              infoWidth
            );

          record.element.style
            .setProperty(
              "--brobots-piece-info-h",
              infoHeight
            );

          record.element.style
            .setProperty(
              "--brobots-piece-w",
              "var(--brobots-piece-live-w, var(--brobots-piece-base-w))"
            );

          record.element.style
            .setProperty(
              "--brobots-piece-h",
              "var(--brobots-piece-live-h, var(--brobots-piece-base-h))"
            );
        }
      );


      const exposeFixed =
        (
          key,
          prefix
        ) => {
          const record =
            state.fixed.get(
              key
            );


          if (!record) {
            return;
          }


          const baseWidth =
            responsiveLength(
              record.width
            );

          const baseHeight =
            responsiveLength(
              record.height
            );

          const infoWidth =
            `min(` +
            `calc(100cqw * ${record.width / derived.nativeWidth}), ` +
            `calc(var(--brobots-tablet-info-hero-end-y) * ${record.width / derived.nativeHeroHeight})` +
            `)`;

          const infoHeight =
            `min(` +
            `calc(100cqw * ${record.height / derived.nativeWidth}), ` +
            `calc(var(--brobots-tablet-info-hero-end-y) * ${record.height / derived.nativeHeroHeight})` +
            `)`;


          frameArea.style
            .setProperty(
              `--${prefix}-w-base`,
              baseWidth
            );


          frameArea.style
            .setProperty(
              `--${prefix}-h-base`,
              baseHeight
            );


          frameArea.style
            .setProperty(
              `--${prefix}-w-info`,
              infoWidth
            );


          frameArea.style
            .setProperty(
              `--${prefix}-h-info`,
              infoHeight
            );


          frameArea.style
            .setProperty(
              `--${prefix}-w`,
              `var(--${prefix}-w-live, var(--${prefix}-w-base))`
            );


          frameArea.style
            .setProperty(
              `--${prefix}-h`,
              `var(--${prefix}-h-live, var(--${prefix}-h-base))`
            );
        };


      exposeFixed(
        "hero-top-left",
        "brobots-hero-top-left"
      );

      exposeFixed(
        "hero-top-right",
        "brobots-hero-top-right"
      );

      exposeFixed(
        "hero-bottom-left",
        "brobots-hero-bottom-left"
      );

      exposeFixed(
        "hero-bottom-right",
        "brobots-hero-bottom-right"
      );

      exposeFixed(
        "thumb-top-left",
        "brobots-thumb-top-left"
      );

      exposeFixed(
        "thumb-top-right",
        "brobots-thumb-top-right"
      );

      exposeFixed(
        "thumb-bottom-left",
        "brobots-thumb-bottom-left"
      );

      exposeFixed(
        "thumb-bottom-right",
        "brobots-thumb-bottom-right"
      );


      state.stretchers.forEach(
        (record, key) => {
          const width =
            responsiveLength(
              record.width
            );

          const height =
            responsiveLength(
              record.height
            );

          const infoWidth =
            `min(` +
            `calc(100cqw * ${record.width / derived.nativeWidth}), ` +
            `calc(var(--brobots-tablet-info-hero-end-y) * ${record.width / derived.nativeHeroHeight})` +
            `)`;

          const infoHeight =
            `min(` +
            `calc(100cqw * ${record.height / derived.nativeWidth}), ` +
            `calc(var(--brobots-tablet-info-hero-end-y) * ${record.height / derived.nativeHeroHeight})` +
            `)`;


          record.element.style
            .setProperty(
              "--brobots-stretcher-base-w",
              width
            );

          record.element.style
            .setProperty(
              "--brobots-stretcher-base-h",
              height
            );

          record.element.style
            .setProperty(
              "--brobots-stretcher-info-w",
              infoWidth
            );

          record.element.style
            .setProperty(
              "--brobots-stretcher-info-h",
              infoHeight
            );

          record.element.style
            .setProperty(
              "--brobots-stretcher-w",
              "var(--brobots-stretcher-live-w, var(--brobots-stretcher-base-w))"
            );

          record.element.style
            .setProperty(
              "--brobots-stretcher-h",
              "var(--brobots-stretcher-live-h, var(--brobots-stretcher-base-h))"
            );


          const exposedNames = {
            "hero-stretch-left":
              "--brobots-hero-left-rail-w",

            "hero-stretch-right":
              "--brobots-hero-right-rail-w",

            "hero-stretch-top":
              "--brobots-hero-top-bar-h",

            "hero-stretch-bottom":
              "--brobots-hero-bottom-bar-h",

            "thumb-stretch-left":
              "--brobots-thumb-left-rail-w",

            "thumb-stretch-right":
              "--brobots-thumb-right-rail-w",

            "thumb-stretch-top":
              "--brobots-thumb-top-bar-h",

            "thumb-stretch-bottom":
              "--brobots-thumb-bottom-bar-h"
          };


          const exposedName =
            exposedNames[key];


          if (exposedName) {
            const useWidth =
              key.endsWith(
                "left"
              ) ||
              key.endsWith(
                "right"
              );


            frameArea.style
              .setProperty(
                `${exposedName}-base`,
                useWidth
                  ? width
                  : height
              );

            frameArea.style
              .setProperty(
                `${exposedName}-info`,
                useWidth
                  ? infoWidth
                  : infoHeight
              );

            frameArea.style
              .setProperty(
                exposedName,
                `var(${exposedName}-live, var(${exposedName}-base))`
              );
          }
        }
      );


      frameArea.style
        .setProperty(
          "--brobots-hero-end-base-y",
          `calc(100cqh * ${derived.heroEndRatio})`
        );

      /*
        16-piece frame: there is no center separator. The thumbnail region
        begins exactly where the hero region ends.
      */
      frameArea.style
        .setProperty(
          "--brobots-thumb-start-base-y",
          "var(--brobots-hero-end-base-y)"
        );

      frameArea.style
        .setProperty(
          "--brobots-hero-end-y",
          "var(--brobots-hero-end-live-y, var(--brobots-hero-end-base-y))"
        );

      frameArea.style
        .setProperty(
          "--brobots-thumb-start-y",
          "var(--brobots-thumb-start-live-y, var(--brobots-thumb-start-base-y))"
        );
    };


  if (gameFrameAreas.length > 0) {
    Promise.all(
      gameFrameAreas.map(
        async (frameArea) => {
          await measureGameFrameAssets(
            frameArea
          );

          deriveGameFrameGeometry(
            frameArea
          );

          applyGameFrameMeasuredDimensions(
            frameArea
          );


          applyMobileSafariFrameSelfBackgrounds(
            frameArea
          );
        }
      )
    );
  }


  /* =======================================================
     Shared game-info blurb fitting
     =======================================================

     One layout paradigm at every scale:

       - the game-info surface gives the top zone whatever vertical space is
         left after the features + facts/actions zones claim their space
       - the blurb always spans the full width of that top zone
       - if longer copy no longer fits the remaining height, only the blurb
         type scales down
       - desktop, tablet, and mobile use the exact same fitter

     This replaces breakpoint-specific copy widths / mobile-only crowding.
     ======================================================= */

  const gameInfoBlurbFitState =
    new WeakMap();

  const gameInfoBlurbFitLockedFrames =
    new WeakSet();

  let gameInfoBlurbFitRaf =
    0;


  const fitGameInfoBlurb =
    (
      blurb
    ) => {
      if (
        !blurb ||
        !blurb.isConnected
      ) {
        return;
      }


      const surface =
        blurb.closest(
          ".game-info-surface"
        );

      const frameArea =
        blurb.closest(
          ".game-frame-area"
        );


      if (
        !surface ||
        (
          frameArea &&
          gameInfoBlurbFitLockedFrames.has(
            frameArea
          )
        )
      ) {
        return;
      }


      /*
        This pass deliberately leaves the v134 / v153 layout completely alone.

        We only intervene when the EXISTING info surface actually overflows its
        fixed cavity. That means desktop/tablet formatting remains untouched
        while small mobile layouts can sacrifice blurb type size instead of
        pushing the facts/actions below the frame.
      */
      blurb.style.removeProperty(
        "--game-info-blurb-fit-size"
      );


      const computed =
        getComputedStyle(
          blurb
        );

      let maxFontSize =
        parseFloat(
          computed.fontSize
        ) ||
        16;


      /*
        On small mobile frames, the surrounding labels / facts / buttons have
        already scaled down more aggressively than the authored blurb size.
        Nudge the blurb's natural ceiling down too so its visual hierarchy
        stays balanced even before true overflow forces further fitting.

        Desktop/tablet are deliberately untouched.
      */
      if (
        window.matchMedia(
          "(max-width: 750px)"
        ).matches
      ) {
        const viewportWidth =
          Math.max(
            320,
            Math.min(
              window.innerWidth,
              750
            )
          );


        /*
          750px -> 100% of authored size
          320px -> ~88% of authored size
        */
        const mobileScale =
          0.88 +
          (
            (
              viewportWidth - 320
            ) /
            430
          ) *
          0.12;


        maxFontSize *=
          Math.max(
            0.88,
            Math.min(
              1,
              mobileScale
            )
          );
      }

      const minFontSize =
        Math.min(
          maxFontSize,
          parseFloat(
            computed.getPropertyValue(
              "--game-info-blurb-min-size"
            )
          ) ||
          9.5
        );


      const surfaceFits =
        () => {
          /*
            scrollHeight still reports the content that extends beyond an
            overflow:hidden surface, so this directly detects the failure we
            care about: lower elements being pushed outside the info cavity.
          */
          return (
            surface.scrollHeight <=
            surface.clientHeight + 0.75
          );
        };


      const fitsAt =
        (fontSize) => {
          blurb.style.setProperty(
            "--game-info-blurb-fit-size",
            `${fontSize}px`
          );


          return surfaceFits();
        };


      /*
        Critical behavior:
        if the authored v134/v153 layout already fits, keep it exactly as-is.
        No alternate width, grid, spacing, alignment, or responsive rules.
      */
      if (
        fitsAt(
          maxFontSize
        )
      ) {
        return;
      }


      let low =
        minFontSize;

      let high =
        maxFontSize;


      /*
        Find the largest blurb size that lets the complete existing info layout
        remain inside its cavity.
      */
      for (
        let iteration = 0;
        iteration < 8;
        iteration += 1
      ) {
        const midpoint =
          (
            low +
            high
          ) /
          2;


        if (
          fitsAt(
            midpoint
          )
        ) {
          low =
            midpoint;
        }

        else {
          high =
            midpoint;
        }
      }


      blurb.style.setProperty(
        "--game-info-blurb-fit-size",
        `${low}px`
      );


      gameInfoBlurbFitState.set(
        blurb,
        low
      );
    };


  const measureFinalInfoBlurbFontSize =
    (
      gameFrameArea
    ) => {
      if (
        !gameFrameArea ||
        !gameFrameArea.parentElement
      ) {
        return null;
      }


      /*
        Measure the REAL final info geometry without touching the visible frame.

        A hidden clone is inserted beside the live frame with:
          - final info-state class already present
          - frame progress forced to 1
          - transitions/animations disabled

        Because the clone enters the document already in its final state,
        ResizeObserver / transition timing cannot trick the fitter into
        measuring an intermediate cavity.
      */
      const probe =
        gameFrameArea.cloneNode(
          true
        );


      probe.classList.add(
        "is-tablet-info-geometry",
        "is-game-info-fit-probe"
      );


      probe.style.setProperty(
        "--brobots-tablet-frame-progress",
        "1"
      );

      probe.style.setProperty(
        "position",
        "absolute",
        "important"
      );

      probe.style.setProperty(
        "visibility",
        "hidden",
        "important"
      );

      probe.style.setProperty(
        "pointer-events",
        "none",
        "important"
      );

      probe.style.setProperty(
        "transition",
        "none",
        "important"
      );

      probe.style.setProperty(
        "animation",
        "none",
        "important"
      );

      probe.setAttribute(
        "aria-hidden",
        "true"
      );


      probe
        .querySelectorAll(
          "*"
        )
        .forEach(
          (element) => {
            element.style.setProperty(
              "transition",
              "none",
              "important"
            );

            element.style.setProperty(
              "animation",
              "none",
              "important"
            );
          }
        );


      gameFrameArea.parentElement.appendChild(
        probe
      );


      const probeBlurb =
        probe.querySelector(
          ".game-tablet-info-host .game-info-blurb"
        ) ||
        probe.querySelector(
          ".game-info-blurb"
        );


      let result =
        null;


      if (probeBlurb) {
        fitGameInfoBlurb(
          probeBlurb
        );


        result =
          probeBlurb.style.getPropertyValue(
            "--game-info-blurb-fit-size"
          ).trim();


        /*
          If no shrink was required, preserve the final authored size as an
          explicit pixel value while the live frame animates.
        */
        if (!result) {
          result =
            getComputedStyle(
              probeBlurb
            ).fontSize;
        }
      }


      probe.remove();


      return result ||
        null;
    };


  const fitAllGameInfoBlurbs =
    () => {
      document
        .querySelectorAll(
          ".prototype-page-frame[data-game-frame-page] .game-info-blurb"
        )
        .forEach(
          fitGameInfoBlurb
        );
    };


  const scheduleGameInfoBlurbFit =
    () => {
      cancelAnimationFrame(
        gameInfoBlurbFitRaf
      );


      gameInfoBlurbFitRaf =
        requestAnimationFrame(
          () => {
            requestAnimationFrame(
              fitAllGameInfoBlurbs
            );
          }
        );
    };


  const gameInfoBlurbResizeObserver =
    new ResizeObserver(
      scheduleGameInfoBlurbFit
    );


  const observeGameInfoFitTargets =
    () => {
      document
        .querySelectorAll(
          ".prototype-page-frame[data-game-frame-page] .game-info-surface, " +
          ".prototype-page-frame[data-game-frame-page] .game-info-top-zone, " +
          ".prototype-page-frame[data-game-frame-page] .game-info-bottom-zone, " +
          ".prototype-page-frame[data-game-frame-page] .game-info-blurb"
        )
        .forEach(
          (element) => {
            if (
              element.dataset.gameInfoFitObserved ===
              "true"
            ) {
              return;
            }


            element.dataset.gameInfoFitObserved =
              "true";


            gameInfoBlurbResizeObserver.observe(
              element
            );
          }
        );


      scheduleGameInfoBlurbFit();
    };


  const gameInfoBlurbMutationObserver =
    new MutationObserver(
      observeGameInfoFitTargets
    );


  gameInfoBlurbMutationObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );


  window.addEventListener(
    "resize",
    scheduleGameInfoBlurbFit,
    {
      passive: true
    }
  );


  observeGameInfoFitTargets();


  /* =======================================================
     Reusable game-frame tablet controller
     ======================================================= */

  /*
    First mobile prototype:
    use the exact same game-page interaction/state controller from phones
    through tablet. Page opening/closing itself still keeps the existing
    mobile navigation/morph system; only the game-page internals are shared.
  */
  const gameFrameTabletMode =
    window.matchMedia(
      "(max-width: 1400px)"
    );


  const initializeGameFrameTablet =
    (pageName) => {
      const gameFrameArea =
        document.querySelector(
          `[data-game-frame="${pageName}"]`
        );


      const gamePageFrame =
        getPageFrame(
          pageName
        );


      if (
        !gameFrameArea ||
        !gamePageFrame
      ) {
        return;
      }


      const pageLabel =
        pageName.charAt(0).toUpperCase() +
        pageName.slice(1);

    /*
      Tablet info host
      ----------------
      Keep desktop popout markup completely untouched.

      The tablet surface is cloned from the existing page .game-info node,
      so there is still only one authored content source in HTML. This avoids
      reparenting the desktop secondary panel during breakpoint transitions
      and keeps the proven PC popout system isolated.
    */

    const desktopInfo =
      gamePageFrame
        ?.querySelector(
          ".desktop-secondary-panel .game-info"
        ) ||
      null;


    const desktopGlassStack =
      gamePageFrame
        ?.querySelector(
          ".desktop-secondary-panel .etherian-popout-layer-stack"
        ) ||
      null;


    const tabletInfoHost =
      document.createElement(
        "section"
      );


    tabletInfoHost.className =
      "game-tablet-info-host";

    tabletInfoHost.setAttribute(
      "aria-label",
      `${pageLabel} game information`
    );

    tabletInfoHost.setAttribute(
      "aria-hidden",
      "true"
    );


    if (desktopGlassStack) {
      const tabletGlassClone =
        desktopGlassStack.cloneNode(
          true
        );


      tabletGlassClone.classList.add(
        "game-tablet-glass-stack"
      );


      tabletInfoHost.appendChild(
        tabletGlassClone
      );
    }


    let tabletFeatureGrid =
      null;


    if (desktopInfo) {
      const tabletInfoClone =
        desktopInfo.cloneNode(
          true
        );


      tabletInfoClone.classList.add(
        "game-info--tablet"
      );


      tabletInfoHost.appendChild(
        tabletInfoClone
      );


      tabletFeatureGrid =
        tabletInfoClone.querySelector(
          ".game-info-features"
        );
    }


    if (gameFrameArea) {
      gameFrameArea.appendChild(
        tabletInfoHost
      );
    }


    /*
      Register the tablet clone through the SAME generic crowding function and
      observer used by the desktop popout.
    */
    registerGameInfoFeatureGrid(
      tabletFeatureGrid
    );


    /*
      Tablet landing identity
      -----------------------
      The collapsed tablet state no longer uses the thumbnail strip as its
      primary lower-region content. Instead, show the game logo plus a
      simple interaction cue.

      Clone the existing authored game logo from the desktop info surface
      so the logo source stays centralized.
    */
    const landingIdentity =
      document.createElement(
        "div"
      );


    landingIdentity.className =
      "game-tablet-landing-identity";


    const landingLogo =
      desktopInfo
        ?.querySelector(
          ".game-info-logo"
        )
        ?.cloneNode(
          true
        ) ||
      null;


    if (landingLogo) {
      /*
        IMPORTANT:
        This clone is only artwork for the tablet landing state. Remove the
        generic .game-info-logo class so desktop/info resize rules, compact
        states, and their width transitions cannot fight this layout.
      */
      landingLogo.classList.remove(
        "game-info-logo"
      );


      landingLogo.classList.add(
        "game-tablet-landing-logo"
      );


      landingIdentity.appendChild(
        landingLogo
      );
    }


    const landingCue =
      document.createElement(
        "button"
      );


    landingCue.type =
      "button";

    landingCue.className =
      "game-tablet-scroll-cue";

    landingCue.setAttribute(
      "aria-label",
      `${pageLabel} game information`
    );

    landingCue.innerHTML =
      '<span class="game-tablet-scroll-cue-text">Scroll for more</span>' +
      '<span class="game-tablet-scroll-cue-arrow" aria-hidden="true">⌄</span>';


    landingIdentity.appendChild(
      landingCue
    );


    if (gameFrameArea) {
      gameFrameArea.appendChild(
        landingIdentity
      );
    }


    /*
      Measure the tablet landing logo's travel from its CURRENT collapsed
      centre to the CURRENT hero viewer centre.

      The old CSS used a guessed multiple of the logo height, which could leave
      a small piece visible on some tablet/window proportions. Measuring the
      actual two visual centres keeps the endpoint tied to the real hero rather
      than to an arbitrary clearance value.
    */
    const updateTabletLogoTarget =
      () => {
        if (
          !gameFrameArea ||
          !landingLogo ||
          !gameFrameTabletMode.matches
        ) {
          return;
        }


        const heroViewer =
          gameFrameArea.querySelector(
            ".game-media-zone--hero .media-viewer"
          );


        if (!heroViewer) {
          return;
        }


        const logoRect =
          landingLogo.getBoundingClientRect();


        const heroRect =
          heroViewer.getBoundingClientRect();


        if (
          logoRect.width <= 0 ||
          logoRect.height <= 0 ||
          heroRect.width <= 0 ||
          heroRect.height <= 0
        ) {
          return;
        }


        const logoCenterY =
          logoRect.top +
          logoRect.height / 2;


        const heroCenterY =
          heroRect.top +
          heroRect.height / 2;


        gameFrameArea.style.setProperty(
          "--brobots-tablet-logo-target-y",
          `${heroCenterY - logoCenterY}px`
        );
      };


    const setTabletGeometryState =
      (
        infoGeometry,
        allowOutsideTablet = false
      ) => {
        if (
          !gameFrameArea ||
          (
            !gameFrameTabletMode.matches &&
            !allowOutsideTablet
          )
        ) {
          return;
        }


        /*
          Capture the collapsed centres BEFORE adding the info-state class.
          That gives the logo one stable destination for the whole transition.
          On the reverse trip we keep the same value so it retraces the path.
        */
        if (infoGeometry) {
          updateTabletLogoTarget();
        }


        /*
          Before OPENING the info state, calculate the blurb size against the
          final geometry offscreen and lock that size for the whole morph.

          This fixes the actual bug: ResizeObserver was repeatedly fitting
          against intermediate frame sizes during the 720ms transition.
        */
        const liveBlurb =
          tabletInfoHost.querySelector(
            ".game-info-blurb"
          );


        if (
          infoGeometry &&
          liveBlurb
        ) {
          const finalBlurbFontSize =
            measureFinalInfoBlurbFontSize(
              gameFrameArea
            );


          if (finalBlurbFontSize) {
            liveBlurb.style.setProperty(
              "--game-info-blurb-fit-size",
              finalBlurbFontSize
            );
          }


          gameInfoBlurbFitLockedFrames.add(
            gameFrameArea
          );


          const unlockBlurbFit =
            (event) => {
              if (
                event &&
                (
                  event.target !==
                    gameFrameArea ||
                  event.propertyName !==
                    "--brobots-tablet-frame-progress"
                )
              ) {
                return;
              }


              gameFrameArea.removeEventListener(
                "transitionend",
                unlockBlurbFit
              );

              gameInfoBlurbFitLockedFrames.delete(
                gameFrameArea
              );
            };


          gameFrameArea.addEventListener(
            "transitionend",
            unlockBlurbFit
          );


          /*
            Safety only for browsers that fail to emit transitionend for a
            registered custom property. It no longer causes a visual pop,
            because the correct final font size was applied BEFORE animation.
          */
          window.setTimeout(
            () => {
              if (
                gameInfoBlurbFitLockedFrames.has(
                  gameFrameArea
                )
              ) {
                unlockBlurbFit(
                  null
                );
              }
            },
            900
          );
        }

        else if (
          !infoGeometry
        ) {
          gameInfoBlurbFitLockedFrames.delete(
            gameFrameArea
          );
        }


        gameFrameArea.classList.toggle(
          "is-tablet-info-geometry",
          infoGeometry
        );


        tabletInfoHost.setAttribute(
          "aria-hidden",
          infoGeometry
            ? "false"
            : "true"
        );


        /*
          Treat the tablet/mobile info state as the halfway point between
          this page and the next page on the decorative side-frame progress
          indicator.
        */
        if (
          selectedPageName ===
            pageName ||
          activePageName ===
            pageName
        ) {
          updateViewportFramePageProgress(
            pageName,
            infoGeometry
          );
        }
      };


    landingCue.addEventListener(
      "click",
      () => {
        setTabletGeometryState(
          true
        );
      }
    );


    /* =======================================================
       Brobots tablet media <-> info gesture navigation
       =======================================================

       The arrow, mouse wheel, trackpad, and touch gestures ALL call the same
       setTabletGeometryState() function above. There is no second
       transition implementation.

       Wheel/trackpad:
         - accumulate intent rather than firing on one tiny delta
         - reset accumulation when direction reverses or input pauses
         - short lockout after a successful transition prevents momentum from
           instantly undoing/redoing it

       Touch:
         - only vertical gestures count
         - horizontal movement is ignored so future gallery/swipe behavior is
           not stolen
    */

    let tabletWheelIntent =
      0;

    let tabletWheelDirection =
      0;

    let tabletWheelResetTimer =
      null;

    let tabletGestureLockedUntil =
      0;

    /*
      Tablet navigation is deliberately staged in both directions:

        DOWN:
          collapsed media -> info -> NEW gesture -> next page

        UP:
          info -> collapsed media -> NEW gesture -> previous page

      The navigation arm is never enabled merely because the visual
      transition finished. Trackpad inertia from the state-change gesture
      must go quiet first.
    */
    let tabletNextGestureArmed =
      false;

    let tabletNextGestureArmPending =
      false;

    let tabletNextGestureArmTimer =
      null;

    let tabletPreviousGestureArmed =
      false;

    let tabletPreviousGestureArmPending =
      false;

    let tabletPreviousGestureArmTimer =
      null;


    const cancelTabletPreviousGestureArm =
      () => {
        tabletPreviousGestureArmed =
          false;

        tabletPreviousGestureArmPending =
          false;


        if (
          tabletPreviousGestureArmTimer
        ) {
          clearTimeout(
            tabletPreviousGestureArmTimer
          );

          tabletPreviousGestureArmTimer =
            null;
        }
      };


    const cancelTabletNextGestureArm =
      () => {
        tabletNextGestureArmed =
          false;

        tabletNextGestureArmPending =
          false;


        if (
          tabletNextGestureArmTimer
        ) {
          clearTimeout(
            tabletNextGestureArmTimer
          );

          tabletNextGestureArmTimer =
            null;
        }
      };


    const scheduleTabletNextGestureArm =
      () => {
        tabletNextGestureArmed =
          false;

        tabletNextGestureArmPending =
          true;


        if (
          tabletNextGestureArmTimer
        ) {
          clearTimeout(
            tabletNextGestureArmTimer
          );
        }


        tabletNextGestureArmTimer =
          setTimeout(
            () => {
              const remainingLock =
                tabletGestureLockedUntil -
                performance.now();


              if (
                remainingLock > 0 ||
                pageFrameIsAnimating
              ) {
                tabletNextGestureArmTimer =
                  setTimeout(
                    scheduleTabletNextGestureArm,
                    remainingLock > 0
                      ? remainingLock + 24
                      : 90
                  );

                return;
              }


              /*
                The page may have retained its tablet-info geometry while it
                was closed. Only arm once this specific page is actually open
                again and is the selected/active page.
              */
              if (
                !gamePageFrame?.classList.contains(
                  "is-open"
                ) ||
                (
                  selectedPageName !== pageName &&
                  activePageName !== pageName
                )
              ) {
                tabletNextGestureArmPending =
                  false;

                tabletNextGestureArmTimer =
                  null;

                return;
              }


              tabletNextGestureArmPending =
                false;

              tabletNextGestureArmed =
                true;

              tabletNextGestureArmTimer =
                null;
            },
            190
          );
      };


    const scheduleTabletPreviousGestureArm =
      () => {
        tabletPreviousGestureArmed =
          false;

        tabletPreviousGestureArmPending =
          true;


        if (
          tabletPreviousGestureArmTimer
        ) {
          clearTimeout(
            tabletPreviousGestureArmTimer
          );
        }


        tabletPreviousGestureArmTimer =
          setTimeout(
            () => {
              const remainingLock =
                tabletGestureLockedUntil -
                performance.now();


              if (
                remainingLock > 0 ||
                pageFrameIsAnimating
              ) {
                tabletPreviousGestureArmTimer =
                  setTimeout(
                    scheduleTabletPreviousGestureArm,
                    remainingLock > 0
                      ? remainingLock + 24
                      : 90
                  );

                return;
              }


              if (
                !gamePageFrame?.classList.contains(
                  "is-open"
                ) ||
                (
                  selectedPageName !== pageName &&
                  activePageName !== pageName
                )
              ) {
                tabletPreviousGestureArmPending =
                  false;

                tabletPreviousGestureArmTimer =
                  null;

                return;
              }


              tabletPreviousGestureArmPending =
                false;

              tabletPreviousGestureArmed =
                true;

              tabletPreviousGestureArmTimer =
                null;
            },
            190
          );
      };


    /*
      A tablet page intentionally keeps its info/media geometry when another
      game is opened. If an info-state page is later reopened, its old
      next-gesture arm may have been consumed by the previous page switch.

      Re-arm it whenever this page becomes open while already in info mode.
      This restores the expected:
        reopened info page + fresh down-scroll -> next page
    */
    const tabletPageOpenObserver =
      new MutationObserver(
        () => {
          if (
            !gameFrameTabletMode.matches
          ) {
            return;
          }


          const pageIsOpen =
            gamePageFrame.classList.contains(
              "is-open"
            );


          if (!pageIsOpen) {
            /*
              Do not let an old armed state survive invisibly. Whichever
              geometry this page retains will be freshly armed on reopen.
            */
            cancelTabletNextGestureArm();
            cancelTabletPreviousGestureArm();
            return;
          }


          if (
            gameFrameArea.classList.contains(
              "is-tablet-info-geometry"
            )
          ) {
            cancelTabletPreviousGestureArm();
            scheduleTabletNextGestureArm();
          }

          else {
            cancelTabletNextGestureArm();
            scheduleTabletPreviousGestureArm();
          }
        }
      );


    tabletPageOpenObserver.observe(
      gamePageFrame,
      {
        attributes: true,
        attributeFilter: [
          "class"
        ]
      }
    );


    const tabletGestureCanRun =
      () => (
        gameFrameTabletMode.matches &&
        gameFrameArea &&
        gamePageFrame?.classList.contains(
          "is-open"
        ) &&
        pageOwnsInput(
          pageName
        ) &&
        performance.now() >=
          tabletGestureLockedUntil
      );


    const triggerTabletGesture =
      (direction) => {
        if (
          !tabletGestureCanRun() ||
          direction === 0
        ) {
          return false;
        }


        const infoIsOpen =
          gameFrameArea.classList.contains(
            "is-tablet-info-geometry"
          );


        /*
          DOWN:
            collapsed -> open info
            expanded + freshly armed gesture -> next page

          UP:
            expanded -> collapse info

          The existing page switch remains the only implementation used to
          close/open pages; this controller merely requests it.
        */
        if (
          direction > 0 &&
          !infoIsOpen
        ) {
          cancelTabletPreviousGestureArm();


          playMobileVerticalSwipeFeedback(
            1,
            pageName,
            pageName
          );


          setTabletGeometryState(
            true
          );


          tabletGestureLockedUntil =
            performance.now() +
            780;


          /*
            Do not arm "next" yet. The wheel handler will keep pushing this
            quiet-window timer while inertia from the opening gesture arrives.
          */
          scheduleTabletNextGestureArm();
        }

        else if (
          direction > 0 &&
          infoIsOpen &&
          tabletNextGestureArmed
        ) {
          const nextPageName =
            getNextPageName(
              pageName
            );


          playMobileVerticalSwipeFeedback(
            1,
            pageName,
            nextPageName ||
            pageName
          );


          const switched =
            requestNextPage(
              pageName
            );


          if (!switched) {
            return false;
          }


          cancelTabletNextGestureArm();
          cancelTabletPreviousGestureArm();


          tabletGestureLockedUntil =
            performance.now() +
            780;
        }

        else if (
          direction < 0 &&
          infoIsOpen
        ) {
          cancelTabletNextGestureArm();


          playMobileVerticalSwipeFeedback(
            -1,
            pageName,
            pageName
          );


          setTabletGeometryState(
            false
          );


          tabletGestureLockedUntil =
            performance.now() +
            780;


          /*
            Mirror the forward path: the gesture that collapses info is fully
            consumed. Only a fresh upward gesture may navigate to the
            previous page.
          */
          scheduleTabletPreviousGestureArm();
        }

        else if (
          direction < 0 &&
          !infoIsOpen &&
          tabletPreviousGestureArmed
        ) {
          const previousPageName =
            getPreviousPageName(
              pageName
            );


          playMobileVerticalSwipeFeedback(
            -1,
            pageName,
            previousPageName ||
            pageName
          );


          const switched =
            requestPreviousPage(
              pageName
            );


          if (!switched) {
            return false;
          }


          cancelTabletNextGestureArm();
          cancelTabletPreviousGestureArm();


          tabletGestureLockedUntil =
            performance.now() +
            780;
        }

        else {
          return false;
        }


        tabletWheelIntent =
          0;

        tabletWheelDirection =
          0;


        return true;
      };


    const resetTabletWheelIntent =
      () => {
        tabletWheelIntent =
          0;

        tabletWheelDirection =
          0;

        tabletWheelResetTimer =
          null;
      };


    const handleTabletWheel =
      (event) => {
        /*
          While waiting to arm expanded-info -> next-page, EVERY continuing
          wheel event belongs to the gesture that opened info. Push the quiet
          window back even if the visual transition is still locked.
        */
        if (
          (
            tabletNextGestureArmPending ||
            tabletPreviousGestureArmPending
          ) &&
          Math.abs(event.deltaY) >= 1
        ) {
          if (
            tabletNextGestureArmPending
          ) {
            scheduleTabletNextGestureArm();
          }


          if (
            tabletPreviousGestureArmPending
          ) {
            scheduleTabletPreviousGestureArm();
          }


          event.preventDefault();

          return;
        }


        if (
          !tabletGestureCanRun()
        ) {
          return;
        }


        /*
          Ignore overwhelmingly horizontal trackpad gestures.
        */
        if (
          Math.abs(event.deltaX) >
          Math.abs(event.deltaY)
        ) {
          return;
        }


        if (
          Math.abs(event.deltaY) <
          1
        ) {
          return;
        }


        const direction =
          Math.sign(
            event.deltaY
          );


        const infoIsOpen =
          gameFrameArea.classList.contains(
            "is-tablet-info-geometry"
          );


        const gestureCanChangeState =
          (
            direction > 0 &&
            (
              !infoIsOpen ||
              (
                infoIsOpen &&
                tabletNextGestureArmed &&
                Boolean(
                  getNextPageName(
                    pageName
                  )
                )
              )
            )
          ) ||
          (
            direction < 0 &&
            (
              infoIsOpen ||
              (
                !infoIsOpen &&
                tabletPreviousGestureArmed &&
                Boolean(
                  getPreviousPageName(
                    pageName
                  )
                )
              )
            )
          );


        /*
          Do not hijack wheel input that has nowhere useful to go.
        */
        if (!gestureCanChangeState) {
          resetTabletWheelIntent();
          return;
        }


        /*
          Once this wheel direction is meaningful to our two-state page,
          consume it so the browser doesn't also move the document underneath.
        */
        event.preventDefault();


        if (
          direction !==
          tabletWheelDirection
        ) {
          tabletWheelIntent =
            0;

          tabletWheelDirection =
            direction;
        }


        /*
          Desktop mouse wheels should feel almost like a normal page step:
          one deliberate notch ought to be enough.

          Trackpads can emit lots of tiny deltas, so those still accumulate
          briefly instead of firing from incidental movement.
        */
        const absoluteDelta =
          Math.abs(
            event.deltaY
          );


        const isCoarseWheelStep =
          event.deltaMode !== 0 ||
          absoluteDelta >= 18;


        if (isCoarseWheelStep) {
          triggerTabletGesture(
            direction
          );

          return;
        }


        /*
          High-resolution trackpad input:
          accumulate a much smaller amount of intent than v62 required.
        */
        tabletWheelIntent +=
          Math.min(
            absoluteDelta,
            18
          );


        if (
          tabletWheelResetTimer
        ) {
          clearTimeout(
            tabletWheelResetTimer
          );
        }


        tabletWheelResetTimer =
          setTimeout(
            resetTabletWheelIntent,
            180
          );


        if (
          tabletWheelIntent >=
          22
        ) {
          triggerTabletGesture(
            direction
          );
        }
      };


    gamePageFrame?.addEventListener(
      "wheel",
      handleTabletWheel,
      {
        passive: false
      }
    );


    /* -----------------------
       Touch / tablet swipe
       ----------------------- */

    let tabletTouchStartX =
      0;

    let tabletTouchStartY =
      0;

    let tabletTouchTracking =
      false;

    let tabletTouchConsumed =
      false;


    const clearTabletTouch =
      () => {
        tabletTouchTracking =
          false;

        tabletTouchConsumed =
          false;
      };


    gamePageFrame?.addEventListener(
      "touchstart",
      (event) => {
        if (
          !tabletGestureCanRun() ||
          tabletNextGestureArmPending ||
          tabletPreviousGestureArmPending ||
          event.touches.length !== 1
        ) {
          clearTabletTouch();
          return;
        }


        const touch =
          event.touches[0];


        tabletTouchStartX =
          touch.clientX;

        tabletTouchStartY =
          touch.clientY;

        tabletTouchTracking =
          true;

        tabletTouchConsumed =
          false;
      },
      {
        passive: true
      }
    );


    gamePageFrame?.addEventListener(
      "touchmove",
      (event) => {
        if (
          !tabletTouchTracking ||
          tabletTouchConsumed ||
          event.touches.length !== 1
        ) {
          return;
        }


        const touch =
          event.touches[0];

        const deltaX =
          touch.clientX -
          tabletTouchStartX;

        const deltaY =
          touch.clientY -
          tabletTouchStartY;


        /*
          Claim vertical movement as soon as its intent is clear.

          Waiting until the full 46px navigation threshold before calling
          preventDefault() gives mobile browsers enough time to begin native
          page overscroll / pull-to-refresh. Once this touch is clearly more
          vertical than horizontal, the game-page gesture controller owns it.

          We still keep the larger 46px threshold for actually changing
          state, so accidental small finger motion does not trigger navigation.
        */
        const verticalIntentIsClear =
          Math.abs(deltaY) >= 8 &&
          Math.abs(deltaY) >
            Math.abs(deltaX) * 1.1;


        if (verticalIntentIsClear) {
          event.preventDefault();
        }


        /*
          Require a deliberate vertical distance before firing the site's
          media/info/page navigation.
        */
        if (
          Math.abs(deltaY) < 46 ||
          !verticalIntentIsClear
        ) {
          return;
        }


        const direction =
          deltaY < 0
            ? 1
            : -1;


        if (
          triggerTabletGesture(
            direction
          )
        ) {
          tabletTouchConsumed =
            true;

          event.preventDefault();
        }
      },
      {
        passive: false
      }
    );


    gamePageFrame?.addEventListener(
      "touchend",
      () => {
        clearTabletTouch();


        if (
          tabletNextGestureArmPending
        ) {
          scheduleTabletNextGestureArm();
        }


        if (
          tabletPreviousGestureArmPending
        ) {
          scheduleTabletPreviousGestureArm();
        }
      },
      {
        passive: true
      }
    );


    gamePageFrame?.addEventListener(
      "touchcancel",
      clearTabletTouch,
      {
        passive: true
      }
    );


    /* =======================================================
       Brobots desktop <-> tablet content handoff
       =======================================================

       The frame itself already resizes continuously. The awkward part was
       only the content swap at 1400px: desktop thumbnails disappeared and the
       tablet landing identity appeared in one frame.

       Keep one physical thumbnail strip and animate it toward/from the hero.
       The travel distance is measured from the actual rendered centers after
       the breakpoint change, so odd aspect ratios do not need a guessed CSS
       offset.
    */

    let breakpointHandoffTimer =
      null;

    let brobotsTabletBreakpointHandoffStartTimer =
      null;

    let breakpointThumbStartTimer =
      null;


    const clearTabletBreakpointHandoff =
      () => {
        if (!gameFrameArea) {
          return;
        }


        if (breakpointHandoffTimer) {
          clearTimeout(
            breakpointHandoffTimer
          );

          breakpointHandoffTimer =
            null;
        }


        if (brobotsTabletBreakpointHandoffStartTimer) {
          clearTimeout(
            brobotsTabletBreakpointHandoffStartTimer
          );

          brobotsTabletBreakpointHandoffStartTimer =
            null;
        }


        if (breakpointThumbStartTimer) {
          clearTimeout(
            breakpointThumbStartTimer
          );

          breakpointThumbStartTimer =
            null;
        }


        gameFrameArea.classList.remove(
          "is-tablet-breakpoint-entering",
          "is-tablet-breakpoint-leaving",
          "is-tablet-breakpoint-handoff-active",
          "is-tablet-breakpoint-thumb-active"
        );
      };


    const updateTabletBreakpointShift =
      () => {
        if (!gameFrameArea) {
          return;
        }


        const heroViewer =
          gameFrameArea.querySelector(
            ".game-media-zone--hero .media-viewer"
          );


        const mediaStrip =
          gameFrameArea.querySelector(
            ".game-media-zone--thumbs .media-strip"
          );


        if (
          !heroViewer ||
          !mediaStrip
        ) {
          return;
        }


        const heroRect =
          heroViewer.getBoundingClientRect();

        const stripRect =
          mediaStrip.getBoundingClientRect();


        if (
          heroRect.width <= 0 ||
          heroRect.height <= 0 ||
          stripRect.width <= 0 ||
          stripRect.height <= 0
        ) {
          return;
        }


        const heroCenterY =
          heroRect.top +
          heroRect.height / 2;

        const stripCenterY =
          stripRect.top +
          stripRect.height / 2;


        gameFrameArea.style.setProperty(
          "--brobots-breakpoint-thumb-shift-y",
          `${heroCenterY - stripCenterY}px`
        );
      };


    const playTabletBreakpointHandoff =
      (enteringTablet) => {
        if (!gameFrameArea) {
          return;
        }


        clearTabletBreakpointHandoff();


        /*
          Only animate a visible Brobots page. If the breakpoint changes while
          another page is active, simply leave Brobots in the correct resting
          state for the next time it opens.
        */
        if (
          !gamePageFrame?.classList.contains(
            "is-open"
          )
        ) {
          return;
        }


        const directionClass =
          enteringTablet
            ? "is-tablet-breakpoint-entering"
            : "is-tablet-breakpoint-leaving";


        gameFrameArea.classList.add(
          directionClass
        );


        /*
          Measure after the media query has switched, but before the animated
          end state is applied. The transient class keeps both surfaces alive
          and gives us stable geometry to measure.
        */
        updateTabletBreakpointShift();


        /* Force the start state to paint before transitioning to the end. */
        void gameFrameArea.offsetWidth;


        /*
          Delay the CONTENT swap so it follows the larger page choreography
          instead of firing the instant the 1400px media query flips.

          Desktop -> tablet:
            wait for the desktop secondary popout to finish retracting. This
            uses the same CSS timing token as the actual popout close, so the
            thumbnail strip begins travelling behind the hero right as that
            panel has been absorbed back into the frame.

          Tablet -> desktop:
            use a smaller lead-in during the main-frame expansion. The desktop
            thumbnails therefore do not pop in immediately at the breakpoint,
            but they are established before the secondary panel grows outward.
        */
        const frameStyles =
          getComputedStyle(
            gamePageFrame
          );


        const pageLayoutDuration =
          parseCssTime(
            frameStyles.getPropertyValue(
              "--page-layout-transition-duration"
            ),
            480
          );


        const secondaryDelay =
          parseCssTime(
            frameStyles.getPropertyValue(
              "--secondary-panel-delay"
            ),
            160
          );


        const secondaryOpenDuration =
          parseCssTime(
            frameStyles.getPropertyValue(
              "--secondary-panel-duration"
            ),
            720
          );


        /*
          Split the landing-identity timing from the thumbnail timing.

          DESKTOP -> TABLET
            - thumbnails retract upward IMMEDIATELY on resize
            - tablet logo/cue begin fading in immediately as the desktop
              secondary panel begins retracting

          TABLET -> DESKTOP
            - keep the current logo/cue fade timing: start when the desktop
              secondary popout itself begins emerging
            - hold the thumbnails until the popout INFO fade begins. Brobots'
              info content currently starts at 78% of the secondary-panel
              emergence animation, matching the CSS transition-delay used by
              .desktop-secondary-panel-content.
        */
        const secondaryCloseDuration =
          parseCssTime(
            frameStyles.getPropertyValue(
              "--secondary-panel-close-duration"
            ),
            460
          );


        const identityDelay =
          enteringTablet
            ? (
                /*
                  DESKTOP -> TABLET

                  The Brobots frame resize does NOT begin immediately when the
                  breakpoint flips. The existing layout transition first waits
                  for the desktop secondary panel to retract, and only THEN
                  runs the 480ms frame resize.

                  So the tablet logo/cue must wait for BOTH phases:
                    secondary-panel retraction
                    + main frame resize

                  The thumbnail retraction remains immediate.
                */
                secondaryCloseDuration +
                pageLayoutDuration
              )
            : (
                pageLayoutDuration +
                secondaryDelay
              );


        const thumbnailDelay =
          enteringTablet
            ? 0
            : (
                pageLayoutDuration +
                secondaryDelay +
                (
                  secondaryOpenDuration *
                  0.78
                )
              );


        brobotsTabletBreakpointHandoffStartTimer =
          setTimeout(
            () => {
              brobotsTabletBreakpointHandoffStartTimer =
                null;


              requestAnimationFrame(() => {
                gameFrameArea.classList.add(
                  "is-tablet-breakpoint-handoff-active"
                );
              });
            },
            Math.max(
              0,
              identityDelay
            )
          );


        breakpointThumbStartTimer =
          setTimeout(
            () => {
              breakpointThumbStartTimer =
                null;


              requestAnimationFrame(() => {
                gameFrameArea.classList.add(
                  "is-tablet-breakpoint-thumb-active"
                );
              });
            },
            Math.max(
              0,
              thumbnailDelay
            )
          );


        const handoffDuration =
          parseCssTime(
            getComputedStyle(
              gameFrameArea
            ).getPropertyValue(
              "--brobots-breakpoint-handoff-duration"
            ),
            1240
          );


        breakpointHandoffTimer =
          setTimeout(
            () => {
              clearTabletBreakpointHandoff();
            },
            Math.max(
              identityDelay,
              thumbnailDelay
            ) +
            handoffDuration +
            100
          );
      };


    const resetTabletGeometry =
      (event = null) => {
        if (!gameFrameArea) {
          return;
        }


        const isTabletNow =
          event?.matches ??
          gameFrameTabletMode.matches;


        /*
          Animate the desktop/tablet content handoff before settling into the
          destination's ordinary CSS state.
        */
        if (event) {
          playTabletBreakpointHandoff(
            isTabletNow
          );
        }


        /*
          If we leave tablet while the Brobots info state is open, do NOT
          manually strip the class. That was bypassing the exact state-change
          path used by an upward wheel/swipe and produced the visible snap.

          Instead, invoke the existing "return to media" state change itself.
          The second argument only bypasses the tablet-mode guard because the
          matchMedia change event fires immediately after the breakpoint has
          crossed.
        */
        if (!isTabletNow) {
          if (
            gameFrameArea.classList.contains(
              "is-tablet-info-geometry"
            )
          ) {
            setTabletGeometryState(
              false,
              true
            );
          }


          resetTabletWheelIntent();

          clearTabletTouch();

          tabletGestureLockedUntil =
            0;
        }
      };


    if (
      typeof gameFrameTabletMode.addEventListener ===
        "function"
    ) {
      gameFrameTabletMode.addEventListener(
        "change",
        resetTabletGeometry
      );
    }

    else {
      gameFrameTabletMode.addListener(
        resetTabletGeometry
      );
    }


    };


  [
    "brobots",
    "etherian",
    "halodoom"
  ].forEach(
    initializeGameFrameTablet
  );


});
