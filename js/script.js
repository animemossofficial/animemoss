const FEATURED_CATALOG_API = "https://animemoss-api-production.up.railway.app/catalog";

const banner = document.querySelector(".featured-banner");
const bannerImage = document.getElementById("banner-image");
const bannerTag = document.getElementById("banner-tag");
const bannerTitle = document.getElementById("banner-title");
const bannerDescription = document.getElementById("banner-description");
const watchBtn = document.getElementById("watch-btn");
const dots = document.querySelectorAll(".dot");

let animeList = [];
let current = 0;

const FEATURED_ROTATION_MS = 10 * 60 * 1000;
const FEATURED_PAGE_COUNT = 30;

function getFeaturedRotationPage() {
    const bucket = Math.floor(
        Date.now() / FEATURED_ROTATION_MS
    );

    return (bucket % FEATURED_PAGE_COUNT) + 1;
}

const bannerTags = [
    "TRENDING NOW",
    "MOST POPULAR",
    "NEW EPISODE",
    "TOP RATED"
];

function getAnimeTitle(anime) {
    return (
        anime?.title?.english ||
        anime?.title?.romaji ||
        anime?.title?.native ||
        "Unknown Anime"
    );
}

function getAnimeImage(anime) {
    return (
        anime?.coverImage?.extraLarge ||
        anime?.coverImage?.large ||
        ""
    );
}

function getAnimeDescription(anime) {
    return (
        anime?.description ||
        anime?.synopsis ||
        "Discover this anime and start watching now."
    );
}

function showAnime(index) {
    if (!animeList.length) {
        return;
    }

    const anime = animeList[index];
    const animeId = anime?.id;

    if (!animeId) {
        return;
    }

    bannerImage.src = getAnimeImage(anime);
    bannerImage.alt = getAnimeTitle(anime);

    bannerTag.textContent =
        bannerTags[index] || "FEATURED ANIME";

    bannerTitle.textContent =
        getAnimeTitle(anime);

    bannerDescription.textContent =
        getAnimeDescription(anime);

    watchBtn.href =
        `watch.html?id=${encodeURIComponent(animeId)}&episode=1`;

    banner.dataset.animeId = animeId;

    dots.forEach(dot => {
        dot.classList.remove("active");
    });

    if (dots[index]) {
        dots[index].classList.add("active");
    }
}

async function loadFeaturedAnime() {
    try {
        const page = getFeaturedRotationPage();

        const params = new URLSearchParams({
            page: String(page),
            search: "",
            sort: "-averageRating"
        });

        const response = await fetch(
            `${FEATURED_CATALOG_API}?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error(
                `Featured catalog request failed: ${response.status}`
            );
        }

        const result = await response.json();

        if (!Array.isArray(result.results)) {
            throw new Error("Invalid catalog response.");
        }

        animeList = result.results
            .filter(anime => anime && anime.id)
            .slice(0, dots.length || 5);

        if (!animeList.length) {
            return;
        }

        current = 0;
        showAnime(current);

    } catch (error) {
        console.error("Featured anime error:", error);
    }
}

loadFeaturedAnime();

setInterval(() => {
    if (!animeList.length) {
        return;
    }

    current++;

    if (current >= animeList.length) {
        current = 0;
    }

    showAnime(current);
}, 5000);

setInterval(() => {
    loadFeaturedAnime();
}, FEATURED_ROTATION_MS);

dots.forEach((dot, index) => {
    dot.addEventListener("click", event => {
        event.stopPropagation();

        if (!animeList[index]) {
            return;
        }

        current = index;
        showAnime(current);
    });
});

banner.addEventListener("click", event => {
    if (event.target.closest("#watch-btn")) {
        return;
    }

    const animeId = banner.dataset.animeId;

    if (!animeId) {
        return;
    }

    window.location.href =
        `anime.html?id=${encodeURIComponent(animeId)}`;
});

banner.setAttribute("role", "link");
banner.setAttribute("tabindex", "0");
banner.style.cursor = "pointer";

banner.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }

    event.preventDefault();

    const animeId = banner.dataset.animeId;

    if (!animeId) {
        return;
    }

    window.location.href =
        `anime.html?id=${encodeURIComponent(animeId)}`;
});

// ANIMEMOSS NAVBAR DROPDOWN SCRIPT

document.querySelectorAll(".nav-dropdown-toggle").forEach(button => {
    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        const parent = button.closest(".nav-dropdown");

        document.querySelectorAll(".nav-dropdown.open").forEach(item => {
            if (item !== parent) {
                item.classList.remove("open");
            }
        });

        parent.classList.toggle("open");
    });
});

document.addEventListener("click", event => {
    if (!event.target.closest(".nav-dropdown")) {
        document.querySelectorAll(".nav-dropdown.open").forEach(item => {
            item.classList.remove("open");
        });
    }
});

document.querySelectorAll(".mobile-nav-toggle").forEach(button => {
    button.addEventListener("click", event => {
        event.preventDefault();

        const group = button.closest(".mobile-nav-group");

        document.querySelectorAll(".mobile-nav-group.open").forEach(item => {
            if (item !== group) {
                item.classList.remove("open");
            }
        });

        group.classList.toggle("open");
    });
});


// MOBILE NAV DROPDOWN FIX
document.addEventListener("click", event => {
    const toggle = event.target.closest(
        "#mobileMenu .nav-dropdown-toggle"
    );

    if (!toggle) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const dropdown = toggle.closest(".nav-dropdown");

    if (!dropdown) {
        return;
    }

    document
        .querySelectorAll("#mobileMenu .nav-dropdown.mobile-open")
        .forEach(item => {
            if (item !== dropdown) {
                item.classList.remove("mobile-open");
            }
        });

    dropdown.classList.toggle("mobile-open");
});


// ============================
// FRESH MOBILE NAVBAR
// ============================

const mobileMenuButton =
    document.getElementById("mobileMenuButton");

const mobileDrawer =
    document.getElementById("mobileDrawer");

const mobileDrawerOverlay =
    document.getElementById("mobileDrawerOverlay");

const mobileDrawerClose =
    document.getElementById("mobileDrawerClose");

function closeMobileDrawer() {
    if (!mobileMenuButton || !mobileDrawer || !mobileDrawerOverlay) return;

    mobileMenuButton.classList.remove("active");
    mobileDrawer.classList.remove("active");
    mobileDrawerOverlay.classList.remove("active");

    mobileMenuButton.setAttribute("aria-expanded", "false");
    mobileDrawer.setAttribute("aria-hidden", "true");

    document.body.classList.remove("mobile-nav-open");
}

function openMobileDrawer() {
    if (!mobileMenuButton || !mobileDrawer || !mobileDrawerOverlay) return;

    mobileMenuButton.classList.add("active");
    mobileDrawer.classList.add("active");
    mobileDrawerOverlay.classList.add("active");

    mobileMenuButton.setAttribute("aria-expanded", "true");
    mobileDrawer.setAttribute("aria-hidden", "false");

    document.body.classList.add("mobile-nav-open");
}

if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", () => {
        if (mobileDrawer.classList.contains("active")) {
            closeMobileDrawer();
        } else {
            openMobileDrawer();
        }
    });
}

if (mobileDrawerClose) {
    mobileDrawerClose.addEventListener("click", closeMobileDrawer);
}

if (mobileDrawerOverlay) {
    mobileDrawerOverlay.addEventListener("click", closeMobileDrawer);
}


document
    .querySelectorAll(".mobile-drawer a")
    .forEach(link => {
        link.addEventListener("click", closeMobileDrawer);
    });

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeMobileDrawer();
    }
});





/* =========================================================
   ANIMEMOSS HOMEPAGE SEARCH
   ========================================================= */
(function () {
    const searchBox = document.querySelector(".hero .search-box");
    const input = searchBox?.querySelector('input[type="search"]');
    const button = searchBox?.querySelector("button");

    if (!input || !button) return;

    function goToSearch() {
        const query = input.value.trim();

        if (!query) {
            input.focus();
            return;
        }

        window.location.href =
            `search.html?search=${encodeURIComponent(query)}`;
    }

    button.addEventListener("click", event => {
        event.preventDefault();
        goToSearch();
    });

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            goToSearch();
        }
    });
})();


/* =========================================================
   ANIMEMOSS SHARE BUTTONS
   ========================================================= */
(function () {
    const buttons = document.querySelectorAll(".share-buttons a");

    if (!buttons.length) return;

    const shareUrl = window.location.href.split("#")[0];
    const shareTitle = "AnimeMOSS — Watch Anime Without Limits";

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);
    const encodedText = encodeURIComponent(
        `${shareTitle} ${shareUrl}`
    );

    const targets = {
        facebook:
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,

        twitter:
            `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,

        reddit:
            `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,

        whatsapp:
            `https://api.whatsapp.com/send?text=${encodedText}`,

        telegram:
            `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`
    };

    buttons.forEach(button => {
        button.addEventListener("click", async event => {
            event.preventDefault();

            const type =
                button.classList.contains("facebook") ? "facebook" :
                button.classList.contains("twitter") ? "twitter" :
                button.classList.contains("reddit") ? "reddit" :
                button.classList.contains("whatsapp") ? "whatsapp" :
                button.classList.contains("telegram") ? "telegram" :
                "other";

            if (type === "other") {
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: shareTitle,
                            text: "Discover AnimeMOSS",
                            url: shareUrl
                        });
                    } catch (error) {
                        if (error?.name !== "AbortError") {
                            console.warn(
                                "Native share failed:",
                                error
                            );
                        }
                    }

                    return;
                }

                try {
                    await navigator.clipboard.writeText(shareUrl);
                    alert("AnimeMOSS link copied!");
                } catch {
                    window.prompt(
                        "Copy AnimeMOSS link:",
                        shareUrl
                    );
                }

                return;
            }

            window.open(
                targets[type],
                "_blank",
                "noopener,noreferrer,width=700,height=600"
            );
        });
    });
})();


