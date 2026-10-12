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
  // Keep the navbar clear at the very top; add a subtle glass tint after a small scroll.
  const topbar = document.querySelector(".moss-topbar");
  if (topbar) {
    const updateTopbar = () => topbar.classList.toggle("is-scrolled", window.scrollY > 12);
    updateTopbar();
    window.addEventListener("scroll", updateTopbar, { passive: true });
  }
})();
