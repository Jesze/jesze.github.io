document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");

  const mobileMenu =
    document.querySelector("#mobile-menu") ||
    document.querySelector(".mobile-menu");

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
});