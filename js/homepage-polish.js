/* Small homepage interactions; does not replace catalog or authentication logic. */
(() => {
  const facts = [
    "A great opening theme can make an anime instantly unforgettable.",
    "Slice-of-life stories often make the smallest moments feel special.",
    "A character's color palette can hint at their personality and mood.",
    "Some of the best anime discoveries come from trying a new genre.",
    "Background art helps make an anime world feel alive.",
    "A memorable ending can change how the whole story feels."
  ];
  const fact = document.getElementById("idol-fact");
  if (fact) {
    let index = Math.floor(Date.now() / 12000) % facts.length;
    fact.textContent = facts[index];
    setInterval(() => {
      index = (index + 1) % facts.length;
      fact.style.opacity = "0";
      setTimeout(() => { fact.textContent = facts[index]; fact.style.opacity = "1"; }, 180);
    }, 12000);
    fact.style.transition = "opacity .18s ease";
  }
  document.querySelectorAll("[data-share]").forEach(button => {
    button.addEventListener("click", async () => {
      const shareData = { title: "AnimeMOSS", text: "Discover your next favorite anime on AnimeMOSS.", url: location.href };
      try {
        if (button.dataset.share === "native" && navigator.share) {
          await navigator.share(shareData);
        } else if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(location.href);
          button.title = "Link copied!";
          button.setAttribute("aria-label", "Link copied");
          setTimeout(() => { button.title = "Copy site link"; button.setAttribute("aria-label", "Copy site link"); }, 1800);
        } else {
          window.prompt("Copy the AnimeMOSS link:", location.href);
        }
      } catch (error) {
        if (error && error.name !== "AbortError") console.warn("Share unavailable", error);
      }
    });
  });
  // Navbar controller: pin it to the viewport and set the glass state directly.
  const topbar = document.querySelector(".moss-topbar.moss-idol-topbar");
  if (topbar) {
    let spacer = document.querySelector(".moss-topbar-spacer");
    if (!spacer) {
      spacer = document.createElement("div");
      spacer.className = "moss-topbar-spacer";
      spacer.setAttribute("aria-hidden", "true");
      topbar.parentNode.insertBefore(spacer, topbar);
    }

    // A transformed ancestor can break fixed positioning, so keep the header under body.
    if (topbar.parentElement !== document.body) document.body.appendChild(topbar);

    const pinTopbar = () => {
      topbar.style.setProperty("position", "fixed", "important");
      topbar.style.setProperty("top", "0", "important");
      topbar.style.setProperty("left", "0", "important");
      topbar.style.setProperty("right", "0", "important");
      topbar.style.setProperty("z-index", "2147483000", "important");
      topbar.style.setProperty("width", "100%", "important");
    };
    const syncTopbarHeight = () => {
      spacer.style.height = Math.ceil(topbar.getBoundingClientRect().height) + "px";
    };
    const updateTopbar = () => {
      const scrolled = window.scrollY > 12;
      topbar.classList.toggle("is-scrolled", scrolled);
      // Inline important values ensure another stylesheet cannot turn the glass opaque.
      topbar.style.setProperty("background", scrolled ? "rgba(11,11,16,.48)" : "rgba(11,11,16,.10)", "important");
      topbar.style.setProperty("background-color", scrolled ? "rgba(11,11,16,.48)" : "rgba(11,11,16,.10)", "important");
      topbar.style.setProperty("backdrop-filter", scrolled ? "blur(14px)" : "blur(0)", "important");
      topbar.style.setProperty("-webkit-backdrop-filter", scrolled ? "blur(14px)" : "blur(0)", "important");
      topbar.style.setProperty("border-bottom-color", scrolled ? "rgba(255,255,255,.10)" : "transparent", "important");
      topbar.style.setProperty("box-shadow", scrolled ? "0 6px 22px rgba(0,0,0,.14)" : "none", "important");
    };

    pinTopbar();
    syncTopbarHeight();
    updateTopbar();
    window.addEventListener("resize", () => { pinTopbar(); syncTopbarHeight(); }, { passive: true });
    window.addEventListener("scroll", updateTopbar, { passive: true });
  }
})();
