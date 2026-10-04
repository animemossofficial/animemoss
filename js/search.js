const API_BASE = "https://animemoss-api-production.up.railway.app";
const CATALOG_API = `${API_BASE}/catalog`;

const resultsContainer = document.getElementById("search-results-container");
const resultsTitle = document.getElementById("search-results-title");
const resultsCount = document.getElementById("search-results-count");
const prevButton = document.getElementById("search-prev");
const nextButton = document.getElementById("search-next");
const paginationContainer =
    document.querySelector(".search-results-pagination");

const params = new URLSearchParams(window.location.search);
const searchQuery = (params.get("search") || "").trim();
const section = (params.get("section") || "").trim().toLowerCase();
const genreQuery = (params.get("genre") || "").trim();
const typeQuery = (params.get("type") || "").trim().toUpperCase();

let currentPage = Math.max(1, Number(params.get("page")) || 1);
let totalPages = 1;
let hasNextPage = false;
let loading = false;


function renderPagination() {
    if (!paginationContainer) {
        return;
    }

    const buttons = [];

    const addPage = page => {
        buttons.push(`
            <button
                type="button"
                class="search-page-number ${page === currentPage ? "active" : ""}"
                data-page="${page}"
                ${page === currentPage ? "aria-current=\"page\"" : ""}
            >
                ${page}
            </button>
        `);
    };

    if (currentPage > 1) {
        buttons.push(`
            <button
                type="button"
                class="search-page-prev"
                data-page="${currentPage - 1}"
            >
                &lt;
            </button>
        `);
    }

    const maxVisible = 7;
    const pages = new Set();

    pages.add(1);
    pages.add(totalPages);
    pages.add(currentPage);

    for (let i = 1; i <= 3; i++) {
        pages.add(currentPage - i);
        pages.add(currentPage + i);
    }

    const validPages = Array.from(pages)
        .filter(page => page >= 1 && page <= totalPages)
        .sort((a, b) => a - b);

    let previousPage = null;

    validPages.forEach(page => {
        if (previousPage !== null && page - previousPage > 1) {
            buttons.push(`
                <span class="search-page-dots">...</span>
            `);
        }

        addPage(page);
        previousPage = page;
    });

    if (currentPage < totalPages || hasNextPage) {
        buttons.push(`
            <button
                type="button"
                class="search-page-next"
                data-page="${currentPage + 1}"
                ${!hasNextPage && currentPage >= totalPages ? "disabled" : ""}
            >
                &gt;
            </button>
        `);
    }

    paginationContainer.innerHTML = buttons.join("");

    paginationContainer
        .querySelectorAll("[data-page]")
        .forEach(button => {
            button.addEventListener("click", () => {
                const page = Number(button.dataset.page);

                if (
                    !page ||
                    page === currentPage ||
                    loading ||
                    (!hasNextPage && page > totalPages)
                ) {
                    return;
                }

                loadSearchResults(page);
            });
        });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getTitle(anime) {
    return (
        anime?.title?.english ||
        anime?.title?.romaji ||
        anime?.title?.native ||
        "Unknown Anime"
    );
}

function getImage(anime) {
    return (
        anime?.coverImage?.extraLarge ||
        anime?.coverImage?.large ||
        ""
    );
}

function getBadge(anime) {
    if (anime?.episodes) {
        return `EP ${anime.episodes}`;
    }

    if (anime?.status === "FINISHED") {
        return "Episodes ?";
    }

    return "Ongoing";
}

function renderCard(anime) {
    const title = escapeHtml(getTitle(anime));
    const image = escapeHtml(getImage(anime));
    const badge = escapeHtml(getBadge(anime));
    const id = encodeURIComponent(anime.id);

    resultsContainer.insertAdjacentHTML(
        "beforeend",
        `
        <a href="anime.html?id=${id}" class="anime-card-link">
            <div class="card">
                <div class="image">
                    <img
                        src="${image}"
                        alt="${title}"
                        loading="lazy"
                        onerror="this.style.visibility='hidden';"
                    >

                    <div class="overlay">

                        <div
                            class="anime-hover-panel"
                            onclick="event.stopPropagation();"
                        >
                            <div class="anime-panel-title">
                                ${title}
                            </div>

                            <div class="anime-panel-meta">
                                <span>★</span>
                                <span>${anime.averageScore || "—"}</span>
                                <span>${anime.seasonYear || "—"}</span>
                                <span>${anime.episodes ? anime.episodes + " EP" : "Series"}</span>
                            </div>

                            <div class="anime-panel-genres">
                                ${
                                    Array.isArray(anime.genres)
                                        ? anime.genres
                                            .slice(0, 3)
                                            .map(genre => escapeHtml(genre))
                                            .join(" · ")
                                        : ""
                                }
                            </div>

                            <button
                                class="watch-series"
                                type="button"
                                onclick="event.preventDefault(); event.stopPropagation(); window.location.href='watch.html?id=${id}&episode=1';"
                            >
                                <span class="watch-icon">&#9654;</span>
                                <span>Watch Series</span>
                            </button>
                        </div>

                        <div class="episode">
                            ${badge}
                        </div>

                    </div>
                </div>
            </div>
        </a>
        `
    );
}

async function loadSearchResults(page = 1) {
    if (loading) {
        return;
    }

    loading = true;

    resultsContainer.innerHTML = `
        <div class="search-results-loading">
            Loading...
        </div>
    `;

    prevButton.disabled = true;
    nextButton.disabled = true;

    try {
        let animeList = [];
        let responsePage = page;
        let responseHasNextPage = false;

        if (
            section === "releases" ||
            section === "completed" ||
            section === "popular" ||
            section === "schedule" ||
            section === "ongoing" ||
            genreQuery ||
            typeQuery
        ) {
            let endpoint = "";

            if (section === "releases") {
                endpoint = "/api/recent-releases?days=14&limit=20";
            } else if (section === "completed") {
                endpoint = "/api/recently-completed?days=60&limit=20";
            } else if (section === "schedule") {
                endpoint = `/api/schedule?page=${page}`;
            } else {
                const query = new URLSearchParams();

                if (section) {
                    query.set("section", section);
                }

                if (genreQuery) {
                    query.set("genre", genreQuery);
                }

                if (typeQuery) {
                    query.set("type", typeQuery);
                }

                query.set("page", String(page));

                endpoint = `/api/catalog-section?${query.toString()}`;
            }

            const response = await fetch(`${API_BASE}${endpoint}`, {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`Section request failed: ${response.status}`);
            }

            const result = await response.json();

            animeList = Array.isArray(result.results)
                ? result.results
                : [];

            responsePage = Number(result.page) || page;
            responseHasNextPage = Boolean(result.hasNextPage);
            totalPages = Math.max(
                responsePage,
                Number(result.lastPage) || responsePage
            );

            if (resultsTitle) {
                if (section === "releases") {
                    resultsTitle.textContent = "New Releases";
                } else if (section === "completed") {
                    resultsTitle.textContent = "Recently Completed";
                } else if (section === "popular") {
                    resultsTitle.textContent = "Popular Anime";
                } else if (section === "schedule") {
                    resultsTitle.textContent = "Airing Schedule";
                } else if (section === "ongoing") {
                    resultsTitle.textContent = "Ongoing Anime";
                } else if (genreQuery) {
                    resultsTitle.textContent = `${genreQuery} Anime`;
                } else if (typeQuery) {
                    resultsTitle.textContent =
                        `${typeQuery.replace(/_/g, " ")} Anime`;
                }
            }
        } else {
            const url = new URL(CATALOG_API);

            url.searchParams.set("page", String(page));
            url.searchParams.set("search", searchQuery);
            url.searchParams.set("sort", "popular");

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Search request failed: ${response.status}`);
            }

            const result = await response.json();

            animeList = Array.isArray(result.results)
                ? result.results
                : [];

            responsePage = Number(result.page) || page;
            responseHasNextPage = Boolean(result.hasNextPage);
            totalPages = Math.max(
                responsePage,
                Number(result.lastPage) || responsePage
            );

            if (resultsTitle) {
                resultsTitle.textContent = searchQuery
                    ? `Search results for "${searchQuery}"`
                    : "Search Results";
            }
        }

        currentPage = responsePage;
        hasNextPage = responseHasNextPage;

        resultsContainer.innerHTML = "";


        if (animeList.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-results-empty">
                    No anime found.
                </div>
            `;
        } else if (section === "schedule") {
            renderSchedule(animeList);
        } else {
            animeList.forEach(renderCard);
        }

        renderPagination();

        if (section || genreQuery || typeQuery) {
            const historyParams = new URLSearchParams();

            if (section) {
                historyParams.set("section", section);
            }

            if (genreQuery) {
                historyParams.set("genre", genreQuery);
            }

            if (typeQuery) {
                historyParams.set("type", typeQuery);
            }

            historyParams.set("page", String(currentPage));

            window.history.replaceState(
                {},
                "",
                `search.html?${historyParams.toString()}`
            );
        } else {
            const searchParams = new URLSearchParams();

            if (searchQuery) {
                searchParams.set("search", searchQuery);
            }

            searchParams.set("page", String(currentPage));

            window.history.replaceState(
                {},
                "",
                `search.html?${searchParams.toString()}`
            );
        }

    } catch (error) {
        console.error("Search/section error:", error);

        resultsContainer.innerHTML = `
            <div class="search-results-error">
                Failed to load anime.
            </div>
        `;
    } finally {
        loading = false;
    }
}

if (
    section === "releases" ||
    section === "completed" ||
    section === "popular" ||
    section === "schedule" ||
    section === "ongoing" ||
    genreQuery ||
    typeQuery
) {
    loadSearchResults(1);
} else if (!searchQuery) {
    resultsTitle.textContent = "Search Anime";
    resultsContainer.innerHTML = `
        <div class="search-results-empty">
            Enter an anime name to search.
        </div>
    `;
} else {
    loadSearchResults(currentPage);
}


function formatScheduleDate(timestamp) {
    return new Date(Number(timestamp) * 1000).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getScheduleCountdown(timestamp) {
    const diff = Math.max(
        0,
        Number(timestamp) * 1000 - Date.now()
    );

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days}d ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderSchedule(list) {
    if (!resultsContainer) return;

    resultsContainer.innerHTML = list.map(item => {
        const anime = item.media || {};

        const title =
            anime.title?.english ||
            anime.title?.romaji ||
            anime.title?.native ||
            "Unknown Anime";

        const image =
            anime.coverImage?.extraLarge ||
            anime.coverImage?.large ||
            anime.coverImage?.medium ||
            "";

        const episode = Number(item.episode) || "?";
        const airingAt = Number(item.airingAt) || 0;

        return `
            <a href="anime.html?id=${anime.id}" class="anime-card-link schedule-card-link">
                <div class="card schedule-card">
                    <div class="image">
                        <img src="${image}" alt="${escapeHtml(title)}" loading="lazy">

                        <div class="schedule-info">
                            <div class="schedule-title">${escapeHtml(title)}</div>
                            <div class="schedule-episode">Episode ${episode}</div>
                            <div class="schedule-date">${formatScheduleDate(airingAt)}</div>
                            <div class="schedule-countdown" data-airing-at="${airingAt}">
                                ${getScheduleCountdown(airingAt)}
                            </div>
                        </div>
                    </div>
                </div>
            </a>
        `;
    }).join("");
}

if (section === "schedule") {
    window.scheduleCountdownTimer = setInterval(() => {
        document.querySelectorAll(".schedule-countdown").forEach(el => {
            const timestamp = Number(el.dataset.airingAt);

            if (timestamp) {
                el.textContent = getScheduleCountdown(timestamp);
            }
        });
    }, 1000);
}

document.addEventListener("mouseover", event => {
    const card = event.target.closest("#search-results-container .card");

    if (!card) {
        return;
    }

    const cards = Array.from(
        document.querySelectorAll("#search-results-container .card")
    );

    if (!cards.length) {
        return;
    }

    const hoveredRect = card.getBoundingClientRect();

    const sameRow = cards.filter(item => {
        const rect = item.getBoundingClientRect();

        return Math.abs(rect.top - hoveredRect.top) < 8;
    });

    const rightmostCard = sameRow.reduce((rightmost, item) => {
        const itemRect = item.getBoundingClientRect();
        const rightmostRect = rightmost.getBoundingClientRect();

        return itemRect.left > rightmostRect.left
            ? item
            : rightmost;
    });

    cards.forEach(item => {
        item.classList.remove("panel-open-left");
    });

    if (rightmostCard === card) {
        card.classList.add("panel-open-left");
    }
});