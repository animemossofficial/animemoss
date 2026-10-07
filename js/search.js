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
    const fallback = escapeHtml(
        anime?.coverImage?.large ||
        anime?.coverImage?.medium ||
        ""
    );
    const badge = escapeHtml(getBadge(anime));
    const id = encodeURIComponent(anime.id);
    const genres = Array.isArray(anime.genres)
        ? anime.genres.slice(0, 3).map(genre => escapeHtml(genre)).join(" · ")
        : "";

    resultsContainer.insertAdjacentHTML("beforeend", `
        <a
            href="anime.html?id=${id}"
            class="anime-card-link"
            data-anime-id="${id}"
            data-info-title="${title}"
            data-info-score="${escapeHtml(anime.averageScore || "—")}"
            data-info-year="${escapeHtml(anime.seasonYear || "—")}"
            data-info-episodes="${escapeHtml(anime.episodes ? anime.episodes + " EP" : "Series")}"
            data-info-genres="${genres}"
        >
            <div class="card">
                <div class="image">
                    <span class="play-btn" aria-hidden="true">▶</span>
                    <img
                        src="${image}"
                        data-fallback="${fallback}"
                        alt="${title}"
                        loading="lazy"
                        decoding="async"
                        width="190"
                        height="275"
                    >
                    <div class="overlay"></div>
                    <div class="episode">${badge}</div>
                </div>
            </div>
            <div class="anime-card-title" title="${title}">${title}</div>
        </a>
    `);
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


let searchInfoPanel = null;
let searchInfoCard = null;

function closeSearchInfoPanel(){
    searchInfoPanel?.classList.remove("is-open");
    searchInfoCard = null;
}

function openSearchInfoPanel(card){
    if(!card) return;
    if(!searchInfoPanel){
        searchInfoPanel=document.createElement("aside");
        searchInfoPanel.className="am-info-panel";
        document.body.appendChild(searchInfoPanel);
    }
    const id=card.dataset.animeId||"";
    searchInfoPanel.innerHTML=`
        <div class="am-info-head">
            <div class="am-info-kicker">ANIME DETAILS</div>
            <button class="am-info-close" type="button" aria-label="Close">×</button>
        </div>
        <h3 class="am-info-title"></h3>
        <div class="am-info-stats">
            <span>★ ${escapeHtml(card.dataset.infoScore||"—")}</span>
            <span>${escapeHtml(card.dataset.infoYear||"—")}</span>
            <span>${escapeHtml(card.dataset.infoEpisodes||"Series")}</span>
        </div>
        <div class="am-info-genres">${escapeHtml(card.dataset.infoGenres||"")}</div>
        <button class="am-info-watch" type="button"><span>▶</span> Watch Now</button>
    `;
    searchInfoPanel.querySelector(".am-info-title").textContent=card.dataset.infoTitle||"Unknown Anime";
    searchInfoPanel.querySelector(".am-info-watch").onclick=()=>{
        window.location.href="watch.html?id="+encodeURIComponent(id)+"&episode=1";
    };
    searchInfoPanel.querySelector(".am-info-close").onclick=closeSearchInfoPanel;

    const r=card.getBoundingClientRect(), gap=12, edge=10;
    const right=Math.max(0,innerWidth-r.right-gap-edge);
    const left=Math.max(0,r.left-gap-edge);
    const side=right>=left?"right":"left";
    const space=side==="right"?right:left;
    const width=Math.min(300,Math.max(150,space));
    searchInfoPanel.style.width=width+"px";
    searchInfoPanel.style.minWidth=width+"px";
    searchInfoPanel.style.maxWidth=width+"px";
    searchInfoPanel.style.left="0px";
    searchInfoPanel.style.top="0px";
    const h=Math.min(searchInfoPanel.getBoundingClientRect().height,innerHeight-edge*2);
    const top=Math.max(edge,Math.min(r.top+(r.height-h)/2,innerHeight-h-edge));
    searchInfoPanel.style.top=top+"px";
    searchInfoPanel.style.left=(side==="right"?r.right+gap:Math.max(edge,r.left-gap-width))+"px";
    searchInfoPanel.classList.add("is-open");
    searchInfoCard=card;
}

document.addEventListener("pointerover",e=>{
    if(e.pointerType!=="mouse") return;
    const c=e.target.closest("#search-results-container .anime-card-link");
    if(c && !c.contains(e.relatedTarget)) openSearchInfoPanel(c);
});
document.addEventListener("pointerout",e=>{
    if(e.pointerType!=="mouse") return;
    const c=e.target.closest("#search-results-container .anime-card-link");
    if(!c || c.contains(e.relatedTarget)) return;
    setTimeout(()=>{
        if(searchInfoPanel?.matches(":hover")) return;
        const over=document.elementFromPoint(e.clientX,e.clientY)?.closest?.(".anime-card-link");
        if(over!==c) closeSearchInfoPanel();
    },100);
});
document.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse") return;
    const c=e.target.closest("#search-results-container .anime-card-link");
    if(c) openSearchInfoPanel(c);
});
document.addEventListener("pointerup",e=>{
    if(e.pointerType!=="mouse") requestAnimationFrame(closeSearchInfoPanel);
});
document.addEventListener("pointercancel",e=>{
    if(e.pointerType!=="mouse") closeSearchInfoPanel();
});
document.addEventListener("touchend",closeSearchInfoPanel,{passive:true});
document.addEventListener("touchcancel",closeSearchInfoPanel,{passive:true});
document.addEventListener("pointerdown",e=>{
    if(!searchInfoCard) return;
    if(searchInfoPanel?.contains(e.target)) return;
    if(e.target.closest("#search-results-container .anime-card-link")===searchInfoCard) return;
    closeSearchInfoPanel();
},true);

function setupSearchImageFallbacks(){
    document.querySelectorAll("#search-results-container img[data-fallback]").forEach(img=>{
        if(img.dataset.fallbackBound==="1") return;
        img.dataset.fallbackBound="1";
        img.addEventListener("error",()=>{
            const fallback=img.dataset.fallback;
            if(fallback && img.src!==fallback){
                img.src=fallback;
            }else{
                img.classList.add("image-load-failed");
            }
        });
    });
}

const searchObserver=new MutationObserver(setupSearchImageFallbacks);
if(resultsContainer) searchObserver.observe(resultsContainer,{childList:true,subtree:true});
setupSearchImageFallbacks();
