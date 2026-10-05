const container = document.getElementById("anime-container");

const searchInput = document.querySelector('.search-box input[type="search"]');
const searchButton = document.querySelector(".search-box button");
const filters = document.querySelectorAll(".filters a");

const CATALOG_API = "https://animemoss-api-production.up.railway.app/catalog";
const API_BASE = "https://animemoss-api-production.up.railway.app";

const PAGE_SIZE = 24;
const AVAILABILITY_CONCURRENCY = 4;

let currentPage = 1;
let currentSearch = "";
let loading = false;
let hasNextPage = true;
let activeFilter = "all";

const availabilityCache = new Map();
const availabilityRequests = new Map();
const catalogCache = new Map();
const catalogRequests = new Map();
const CATALOG_CACHE_TTL = 30000;

const DAILY_ROTATION_PAGE_COUNT = 30;

function getRotationDay() {
    return Math.floor(Date.now() / 86400000);
}

function getDailyCatalogPage(page) {
    const offset = getRotationDay() % DAILY_ROTATION_PAGE_COUNT;
    return page + offset;
}



function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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
        anime?.coverImage?.large ||
        anime?.coverImage?.extraLarge ||
        ""
    );
}

function getEpisodeBadge(anime) {
    if (anime?.episodes) {
        return `EP ${anime.episodes}`;
    }

    if (anime?.status === "FINISHED") {
        return "Episodes ?";
    }

    return "Ongoing";
}

function renderAnime(anime, index = 99) {
    if (!anime || !container) return;

    const title = escapeHtml(getAnimeTitle(anime));
    const large = escapeHtml(anime?.coverImage?.large || "");
    const extraLarge = escapeHtml(anime?.coverImage?.extraLarge || "");
    const medium = escapeHtml(anime?.coverImage?.medium || "");
    const fallback = escapeHtml(extraLarge || medium || "");
    const badge = escapeHtml(getEpisodeBadge(anime));
    const id = encodeURIComponent(anime.id);

    container.insertAdjacentHTML("beforeend", `
        <a href="anime.html?id=${id}"
           data-anime-id="${id}"
           class="anime-card-link"
           data-info-title="${title}"
           data-info-score="${escapeHtml(anime.averageScore || "—")}"
           data-info-year="${escapeHtml(anime.seasonYear || "—")}"
           data-info-episodes="${escapeHtml(anime.episodes ? anime.episodes + " EP" : "Series")}"
           data-info-genres="${escapeHtml(Array.isArray(anime.genres) ? anime.genres.slice(0, 3).join(" · ") : "")}">
            <div class="card">
                <div class="image">
                    <span class="play-btn" aria-hidden="true">▶</span>
                    <img
                        src="${large || fallback}"
                        data-fallback="${fallback}"
                        alt="${title}"
                        loading="${index < 4 ? "eager" : "lazy"}"
                        fetchpriority="${index < 3 ? "high" : "auto"}"
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

function setupAnimeImageFallbacks(root = document) {
    root.querySelectorAll("img[data-fallback]").forEach(img => {
        if (img.dataset.fallbackBound === "1") return;
        img.dataset.fallbackBound = "1";
        img.addEventListener("error", () => {
            const fallback = img.dataset.fallback;
            if (fallback && img.src !== fallback) {
                img.src = fallback;
                return;
            }
            img.classList.add("image-load-failed");
        }, { once: false });
    });
}
// Touch play feedback — active only while the finger is actually down.
function clearPressedCards(except=null) {
    document.querySelectorAll(".anime-card-link.is-pressed").forEach((el)=>{
        if(el!==except) el.classList.remove("is-pressed");
    });
}

document.addEventListener("touchstart",(event)=>{
    const card=event.target.closest(".anime-card-link");
    if(!card)return;
    clearPressedCards(card);
    card.classList.add("is-pressed");
},{passive:true});

document.addEventListener("touchend",()=>{
    clearPressedCards();
},{passive:true});

document.addEventListener("touchcancel",()=>{
    clearPressedCards();
},{passive:true});

document.addEventListener("touchmove",()=>{
    // Finger movement means the press is no longer a stable card interaction.
    clearPressedCards();
},{passive:true});

function showLoading(message = "Loading...") {
    let loader = document.getElementById("anime-loading");

    if (!loader) {
        loader = document.createElement("div");
        loader.id = "anime-loading";
        loader.style.cssText = `
            width: 100%;
            padding: 20px 16px;
            text-align: center;
            color: rgba(255,255,255,.65);
            box-sizing: border-box;
        `;

        const container =
            document.querySelector(".anime-container, #anime-container, main")
            || document.body;

        container.prepend(loader);
    }

    loader.textContent = message;
    loader.style.display = "block";
}

function hideLoading() {
    const loader = document.getElementById("anime-loading");

    if (!loader) {
        return;
    }

    loader.style.display = "none";
}

function updatePagination() {
    const prevButton = document.getElementById("catalog-prev");
    const nextButton = document.getElementById("catalog-next");

    if (prevButton) {
        prevButton.disabled = currentPage <= 1 || loading;
    }

    if (nextButton) {
        nextButton.disabled = !hasNextPage || loading;
    }
}

async function fetchCatalog(page, search, sort) {
    const params = new URLSearchParams({
        page: String(page),
        search: search || "",
        sort: sort || "popular"
    });

    const cacheKey = params.toString();
    const cached = catalogCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CATALOG_CACHE_TTL) {
        return cached.data;
    }

    if (catalogRequests.has(cacheKey)) {
        return catalogRequests.get(cacheKey);
    }

    const request = (async () => {
        const response = await fetch(CATALOG_API + "?" + params.toString());

        if (!response.ok) {
            throw new Error("Catalog request failed: " + response.status);
        }

        const result = await response.json();

        if (!Array.isArray(result.results)) {
            throw new Error("Invalid catalog response.");
        }

        const data = {
            pageInfo: {
                currentPage: result.page,
                hasNextPage: Boolean(result.hasNextPage)
            },
            media: result.results
        };

        catalogCache.set(cacheKey, {
            timestamp: Date.now(),
            data
        });

        return data;
    })();

    catalogRequests.set(cacheKey, request);

    try {
        return await request;
    } finally {
        catalogRequests.delete(cacheKey);
    }
}


const PLAYABILITY_API = "https://animemoss-api-production.up.railway.app/playability-batch";
const PLAYABILITY_FRONT_CACHE = new Map();
const PLAYABILITY_FRONT_TTL = 5 * 60 * 1000;

async function refreshPlayability(animeList) {
    const ids = animeList
        .map(anime => String(anime?.id || ""))
        .filter(Boolean);

    if (!ids.length) return;

    const now = Date.now();

    const missing = ids.filter(id => {
        const cached = PLAYABILITY_FRONT_CACHE.get(id);

        return !cached ||
            now - cached.timestamp >= PLAYABILITY_FRONT_TTL;
    });

    if (!missing.length) {
        removeConfirmedUnplayable();
        return;
    }

    try {
        const response = await fetch(
            PLAYABILITY_API +
            "?ids=" +
            encodeURIComponent(missing.join(","))
        );

        if (!response.ok) return;

        const data = await response.json();
        const results =
            data && typeof data.results === "object"
                ? data.results
                : {};

        for (const id of missing) {
            const value = results[id];

            /*
             * Only explicit false is considered unplayable.
             * null / undefined = unknown, so keep the card.
             */
            if (value === true || value === false) {
                PLAYABILITY_FRONT_CACHE.set(id, {
                    timestamp: now,
                    playable: value
                });
            }
        }

        removeConfirmedUnplayable();
    } catch (error) {
        console.warn(
            "Background playability check skipped:",
            error.message
        );
    }
}

function removeConfirmedUnplayable() {
    document
        .querySelectorAll(".anime-card-link[data-anime-id]")
        .forEach(card => {
            const id = card.dataset.animeId;
            const cached = PLAYABILITY_FRONT_CACHE.get(id);

            if (
                cached &&
                cached.playable === false
            ) {
                card.remove();
            }
        });
}

async function loadAnime(page = 1, reset = false) {
    if (loading) {
        return;
    }

    loading = true;

    if (reset) {
        currentPage = page;
        hasNextPage = true;
        container.innerHTML = "";
    }

    showLoading(
        reset
            ? "Loading anime..."
            : "Loading more anime..."
    );

    updatePagination();

    try {
        // Trending uses AnimeMOSS real view data instead of relying
        // on a catalog sort field that may not be supported.
        if (activeFilter === "trending" && !currentSearch) {
            const response = await fetch(
                `${API_BASE}/api/trending?limit=${PAGE_SIZE}`,
                { cache: "no-store" }
            );

            if (!response.ok) {
                throw new Error(
                    `Trending request failed: ${response.status}`
                );
            }

            const result = await response.json();

            const trendingList = Array.isArray(result.results)
                ? result.results
                : [];

            currentPage = 1;
            hasNextPage = false;
            container.innerHTML = "";

            if (!trendingList.length) {
                container.innerHTML = `
                    <h2 style="color:white;text-align:center;width:100%;">
                        No trending anime found.
                    </h2>
                `;
            } else {
                trendingList.forEach((anime, index) => {
                    renderAnime(anime, index);
                });
                setupAnimeImageFallbacks(container);
            }

            hideLoading();
            return;
        }

        const sort = "popular";

        const sourcePage =
            currentSearch
                ? page
                : getDailyCatalogPage(page);

        const pageData = await fetchCatalog(
            sourcePage,
            currentSearch,
            sort
        );

        // Keep UI pagination logical (1, 2, 3...)
        // while the backend source page rotates daily.
        currentPage = page;
        hasNextPage = pageData.pageInfo.hasNextPage;

        const animeList = Array.isArray(pageData.media)
            ? pageData.media
            : [];

        if (reset) {
            container.innerHTML = "";
        }

        if (animeList.length === 0) {
            container.innerHTML = `
                <h2 style="color:white;text-align:center;width:100%;">
                    No anime found.
                </h2>
            `;
        } else {
            animeList.forEach((anime, index) => renderAnime(anime, index));
            setupAnimeImageFallbacks(container);
        }

        hideLoading();

        // Check only the currently rendered page in the background.
        // Catalog rendering never waits for playability.
        setTimeout(() => refreshPlayability(animeList).catch(() => {}), 1200);

        if (hasNextPage) {
            const nextSourcePage =
                currentSearch
                    ? page + 1
                    : getDailyCatalogPage(page + 1);

            setTimeout(() => {
                fetchCatalog(nextSourcePage, currentSearch, sort).catch(() => {});
            }, 900);
        }

    } catch (error) {
        console.error("Anime catalog error:", error);

        hideLoading();

        if (reset) {
            container.innerHTML = `
                <h2 style="color:white;text-align:center;width:100%;">
                    Failed to load anime.
                </h2>
            `;
        }

    } finally {
        loading = false;
        updatePagination();
    }
}

async function checkAvailability(animeId, type) {
    const day = getRotationDay();
    const key = `${day}:${animeId}:${type}`;

    if (availabilityCache.has(key)) {
        return availabilityCache.get(key);
    }

    if (availabilityRequests.has(key)) {
        return availabilityRequests.get(key);
    }

    const request = (async () => {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const response = await fetch(
                    `${API_BASE}/watch/${encodeURIComponent(animeId)}/1?type=${encodeURIComponent(type)}`
                );

                if (!response.ok) {
                    if (attempt < 2) {
                        await new Promise(resolve => setTimeout(resolve, 250));
                        continue;
                    }

                    console.warn(
                        `Availability provider returned HTTP ${response.status} for ${animeId} (${type})`
                    );

                    return null;
                }

                const data = await response.json();

                const embeds = Array.isArray(data?.embeds)
                    ? data.embeds
                    : Array.isArray(data?.streams)
                        ? data.streams
                            .map(stream =>
                                stream && (
                                    stream.embed ||
                                    stream.url ||
                                    stream.extractedUrl ||
                                    stream.stream_url ||
                                    stream.streamUrl
                                )
                            )
                            .filter(Boolean)
                        : [];

                const available = embeds.length > 0;

                availabilityCache.set(key, available);

                return available;

            } catch (error) {
                if (attempt < 2) {
                    await new Promise(resolve => setTimeout(resolve, 250));
                    continue;
                }

                console.warn(
                    `Availability check failed for ${animeId} (${type}); keeping result unknown`
                );

                return null;
            }
        }

        return null;
    })();

    availabilityRequests.set(key, request);

    try {
        return await request;
    } finally {
        availabilityRequests.delete(key);
    }
}

async function filterAvailability(animeList, type) {
    const results = [];
    let index = 0;

    async function worker() {
        while (index < animeList.length) {
            const anime = animeList[index++];
            const available = await checkAvailability(
                anime.id,
                type
            );

            if (available) {
                results.push(anime);
            }
        }
    }

    const workers = Array.from(
        {
            length: Math.min(
                AVAILABILITY_CONCURRENCY,
                animeList.length
            )
        },
        worker
    );

    await Promise.all(workers);

    return results;
}

const availabilityPages = {
    sub: [],
    dub: []
};

const availabilityPageRequests = new Map();

const availabilityScanPage = {
    sub: getDailyCatalogPage(1),
    dub: getDailyCatalogPage(1)
};

let availabilityRotationDay = getRotationDay();

function ensureDailyAvailabilityRotation() {
    const today = getRotationDay();

    if (availabilityRotationDay === today) {
        return;
    }

    availabilityRotationDay = today;

    availabilityPages.sub = [];
    availabilityPages.dub = [];

    availabilityScanPage.sub = getDailyCatalogPage(1);
    availabilityScanPage.dub = getDailyCatalogPage(1);

    availabilityHasMore.sub = true;
    availabilityHasMore.dub = true;
}

const availabilityHasMore = {
    sub: true,
    dub: true
};

const MAX_SOURCE_PAGES_PER_REQUEST = 8;

async function buildAvailabilityPage(type, targetPage) {
    const cached = availabilityPages[type][targetPage - 1];

    if (cached) {
        return cached;
    }

    let results = [];
    let scannedPages = 0;

    while (
        scannedPages < MAX_SOURCE_PAGES_PER_REQUEST &&
        results.length < PAGE_SIZE &&
        availabilityHasMore[type]
    ) {
        const sourcePage = availabilityScanPage[type];

        showLoading(
            `Checking ${type.toUpperCase()} availability... Page ${sourcePage}`
        );

        const pageData = await fetchCatalog(
            sourcePage,
            "",
            "popular"
        );

        const animeList = Array.isArray(pageData.media)
            ? pageData.media
            : [];

        if (!animeList.length) {
            availabilityHasMore[type] = false;
            break;
        }

        const available = await filterAvailability(
            animeList,
            type
        );

        results.push(...available);

        scannedPages++;
        availabilityScanPage[type]++;

        availabilityHasMore[type] =
            pageData.pageInfo.hasNextPage;
    }

    const pageResults = results.slice(0, PAGE_SIZE);

    availabilityPages[type][targetPage - 1] = pageResults;

    return pageResults;
}

async function loadAvailabilityCatalog(type, page = 1) {
    ensureDailyAvailabilityRotation();

    if (loading) {
        return;
    }

    loading = true;

    activeFilter = type;
    currentPage = page;

    container.innerHTML = "";

    showLoading(
        `Loading ${type.toUpperCase()} anime...`
    );

    updatePagination();

    try {
        const pageResults =
            await buildAvailabilityPage(
                type,
                page
            );

        container.innerHTML = "";

        pageResults.forEach(renderAnime);

        if (!pageResults.length) {
            container.innerHTML = `
                <h2 style="color:white;text-align:center;width:100%;">
                    No ${type.toUpperCase()} anime available right now.
                </h2>
            `;
        }

        hasNextPage =
            Boolean(availabilityPages[type][page]) ||
            availabilityHasMore[type];

    } catch (error) {
        console.error(
            `${type.toUpperCase()} availability error:`,
            error
        );

        container.innerHTML = `
            <h2 style="color:white;text-align:center;width:100%;">
                Failed to check ${type.toUpperCase()} availability.
            </h2>
        `;

        hasNextPage = false;

    } finally {
        loading = false;
        hideLoading();
        updatePagination();
    }
}

const prevButton = document.getElementById("catalog-prev");
const nextButton = document.getElementById("catalog-next");

if (prevButton) {
    prevButton.addEventListener("click", () => {
        if (loading || currentPage <= 1) {
            return;
        }

        loadAnime(currentPage - 1, true);
    });
}

if (nextButton) {
    nextButton.addEventListener("click", () => {
        if (loading || !hasNextPage) {
            return;
        }

        loadAnime(currentPage + 1, true);
    });
}

function performSearch(event) {
    if (event) {
        event.preventDefault();
    }

    const query = searchInput
        ? searchInput.value.trim()
        : "";

    if (!query) {
        return;
    }

    const searchUrl = new URL(
        "search.html",
        window.location.href
    );

    searchUrl.searchParams.set("search", query);

    window.location.assign(searchUrl.href);
}

const searchBox = document.querySelector(".search-box");

if (searchBox) {
    searchBox.addEventListener("submit", performSearch);
}

filters.forEach(filter => {
    filter.addEventListener("click", event => {
        event.preventDefault();

        if (loading) {
            return;
        }

        const filterName =
            filter.textContent.trim().toLowerCase();

        filters.forEach(item => {
            item.classList.remove("active");
        });

        filter.classList.add("active");

        activeFilter = filterName;
        currentSearch = "";

        if (searchInput) {
            searchInput.value = "";
        }

        // All / Sub / Dub / Trending use the same fast AniList
        // catalog. Actual audio/subtitle availability is resolved
        // by the watch player, avoiding slow provider scans here.
        if (filterName === "sub" || filterName === "dub") {
            loadAvailabilityCatalog(filterName, 1);
        } else {
            loadAnime(1, true);
        }
    });
});

/* =========================================================
   HOMEPAGE DISCOVERY — bottom sections
   ========================================================= */
(function initHomeDiscovery(){
    const root=document.getElementById("home-discovery");
    if(!root) return;

    const esc=escapeHtml;
    const title=a=>getAnimeTitle(a);
    const image=a=>getAnimeImage(a);
    const imageFallback=a=>escapeHtml(a?.coverImage?.extraLarge || a?.coverImage?.medium || "");
    const href=a=>`anime.html?id=${encodeURIComponent(a.id)}`;

    function row(anime, extra=""){
        return `
            <a class="discovery-row" href="${href(anime)}">
                <img src="${esc(image(anime))}" data-fallback="${imageFallback(anime)}" alt="${esc(title(anime))}" loading="lazy" decoding="async">
                <span class="discovery-row-copy">
                    <strong>${esc(title(anime))}</strong>
                    <small>${esc(extra || (anime.episodes ? `${anime.episodes} episodes` : "Anime"))}</small>
                </span>
                <span class="discovery-arrow">›</span>
            </a>`;
    }

    function state(el,text){
        el.innerHTML=`<div class="discovery-state">${esc(text)}</div>`;
    }

    async function loadMost(period="all"){
        const el=document.getElementById("home-most-viewed");
        state(el,"Loading ranking…");
        try{
            const r=await fetch(`${API_BASE}/api/most-viewed?period=${period}&limit=5`,{cache:"default"});
            if(!r.ok) throw new Error(`HTTP ${r.status}`);
            const d=await r.json();
            const list=Array.isArray(d.results)?d.results:[];
            if(!list.length){state(el,"No recorded views yet.");return;}

            const leader=list[0];
            el.innerHTML=`
                <a class="discovery-leader" href="${href(leader)}">
                    <img src="${esc(image(leader))}" data-fallback="${imageFallback(leader)}" alt="${esc(title(leader))}" loading="lazy" decoding="async">
                    <span class="discovery-leader-shade"></span>
                    <span class="discovery-leader-rank">#01</span>
                    <span class="discovery-leader-copy">
                        <strong>${esc(title(leader))}</strong>
                        <small>${Number(leader.views||0).toLocaleString()} website views</small>
                    </span>
                </a>
                <div class="discovery-rank-list">
                    ${list.slice(1,5).map((a,i)=>row(a,`#0${i+2} · ${Number(a.views||0).toLocaleString()} views`)).join("")}
                </div>`;
            setupAnimeImageFallbacks(el);
        }catch(err){
            console.error("Homepage Most Viewed:",err);
            state(el,"Ranking temporarily unavailable.");
        }
    }

    async function loadNewAndCompleted(){
        const newEl=document.getElementById("home-new-releases");
        const doneEl=document.getElementById("home-completed");
        try{
            const [nr,cr]=await Promise.all([
                fetch(`${API_BASE}/api/recent-releases?days=14&limit=6`,{cache:"default"}),
                fetch(`${API_BASE}/api/recently-completed?days=60&limit=6`,{cache:"default"})
            ]);
            const [nd,cd]=await Promise.all([nr.json(),cr.json()]);
            if(!nr.ok) throw new Error("releases");
            if(!cr.ok) throw new Error("completed");

            const releases=Array.isArray(nd.results)?nd.results:[];
            const completed=Array.isArray(cd.results)?cd.results:[];

            newEl.innerHTML=releases.length
                ? releases.slice(0,6).map((a,i)=>row(a,`#${String(i+1).padStart(2,"0")} · ${a.latestEpisode ? `Episode ${a.latestEpisode}` : "Latest update"}`)).join("")
                : '<div class="discovery-state">No recent releases found.</div>';

            doneEl.innerHTML=completed.length
                ? completed.slice(0,6).map((a,i)=>row(a,`#${String(i+1).padStart(2,"0")} · Finished`)).join("")
                : '<div class="discovery-state">No newly completed anime found.</div>';

            setupAnimeImageFallbacks(newEl);
            setupAnimeImageFallbacks(doneEl);
        }catch(err){
            console.error("Homepage discovery:",err);
            state(newEl,"New releases temporarily unavailable.");
            state(doneEl,"Completed list temporarily unavailable.");
        }
    }

    root.querySelectorAll(".discovery-period").forEach(button=>{
        button.addEventListener("click",()=>{
            root.querySelectorAll(".discovery-period").forEach(b=>b.classList.remove("active"));
            button.classList.add("active");
            loadMost(button.dataset.period);
        });
    });

    loadMost("all");
    loadNewAndCompleted();
    setupAnimeImageFallbacks(root);

    // Keep the bottom discovery data fresh while the homepage stays open.
    window.setInterval(()=>loadMost(document.querySelector(".discovery-period.active")?.dataset.period||"all"),5*60*1000);
    window.setInterval(loadNewAndCompleted,5*60*1000);
})();
/* AnimeMOSS live search suggestions */
(() => {
    if (!searchInput) return;

    const searchBox = searchInput.closest(".search-box");
    if (!searchBox) return;

    const suggestionBox = document.createElement("div");
    suggestionBox.className = "search-suggestions";
    searchBox.appendChild(suggestionBox);

    let timer = null;
    let controller = null;

    function escapeSuggestion(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function titleOf(anime) {
        return (
            anime?.title?.english ||
            anime?.title?.romaji ||
            anime?.title?.native ||
            "Unknown Anime"
        );
    }

    function imageOf(anime) {
        return (
            anime?.coverImage?.large ||
            anime?.coverImage?.extraLarge ||
            ""
        );
    }

    function showMessage(message) {
        suggestionBox.innerHTML =
            `<div class="search-suggestions-message">${escapeSuggestion(message)}</div>`;
        suggestionBox.classList.add("show");
    }

    function hideSuggestions() {
        suggestionBox.classList.remove("show");
    }

    function showSuggestions(results, query) {
        if (!results.length) {
            showMessage("No anime found.");
            return;
        }

        const items = results.slice(0, 5).map(anime => {
            const id = encodeURIComponent(anime.id);
            const title = escapeSuggestion(titleOf(anime));
            const image = escapeSuggestion(imageOf(anime));

            const episodes = anime.episodes
                ? `${anime.episodes} episodes`
                : "Anime";

            return `
                <a
                    class="search-suggestion-item"
                    href="anime.html?id=${id}"
                >
                    <img
                        src="${image}"
                        alt="${title}"
                        loading="lazy"
                    >
                    <div class="search-suggestion-info">
                        <div class="search-suggestion-title">
                            ${title}
                        </div>
                        <div class="search-suggestion-meta">
                            ${escapeSuggestion(episodes)}
                        </div>
                    </div>
                </a>
            `;
        }).join("");

        suggestionBox.innerHTML = `
            ${items}
            <button
                class="search-view-all"
                type="button"
            >
                View All Results
            </button>
        `;

        suggestionBox.classList.add("show");

        const viewAll = suggestionBox.querySelector(".search-view-all");

        if (viewAll) {
            viewAll.addEventListener("click", () => {
                window.location.href =
                    `search.html?search=${encodeURIComponent(query)}`;
            });
        }
    }

    async function searchSuggestions(query) {
        if (!query) {
            hideSuggestions();
            return;
        }

        if (controller) {
            controller.abort();
        }

        controller = new AbortController();

        showMessage("Searching...");

        try {
            const url = new URL(CATALOG_API);

            url.searchParams.set("page", "1");
            url.searchParams.set("search", query);
            url.searchParams.set("sort", "popular");

            const response = await fetch(
                url.toString(),
                {
                    signal: controller.signal
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Suggestion request failed: ${response.status}`
                );
            }

            const result = await response.json();

            const results =
                Array.isArray(result.results)
                    ? result.results
                    : [];

            showSuggestions(results, query);
        } catch (error) {
            if (error.name === "AbortError") {
                return;
            }

            console.error("Search suggestions error:", error);
            hideSuggestions();
        }
    }

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();

        clearTimeout(timer);

        if (!query) {
            hideSuggestions();
            return;
        }

        timer = setTimeout(() => {
            searchSuggestions(query);
        }, 250);
    });

    searchInput.addEventListener("keyup", () => {
        const query = searchInput.value.trim();

        if (!query) {
            hideSuggestions();
            return;
        }

        clearTimeout(timer);

        timer = setTimeout(() => {
            searchSuggestions(query);
        }, 250);
    });

    searchInput.addEventListener("focus", () => {
        const query = searchInput.value.trim();

        if (query) {
            searchSuggestions(query);
        }
    });

    document.addEventListener("click", event => {
        if (!searchBox.contains(event.target)) {
            hideSuggestions();
        }
    });

    searchInput.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            hideSuggestions();
            searchInput.blur();
        }
    });
})();


let catalogRotationDay = getRotationDay();

setInterval(() => {
    const today = getRotationDay();

    if (today === catalogRotationDay || loading) {
        return;
    }

    catalogRotationDay = today;

    ensureDailyAvailabilityRotation();

    if (currentSearch) {
        return;
    }

    if (
        activeFilter === "sub" ||
        activeFilter === "dub"
    ) {
        loadAvailabilityCatalog(activeFilter, 1);
    } else {
        loadAnime(1, true);
    }
}, 60000);

/* AUTO POSITION HOVER PANEL BASED ON AVAILABLE SPACE */
/* =========================================================
   ANIMEMOSS INFO PANEL — CLEAN REBUILD
   One portal only. Desktop hover + touch hold.
   Always beside the active card, never over it.
   ========================================================= */
let amInfoPanel=null, amInfoCard=null, amInfoTimer=null;

function amMakePanel(card){
    if(!amInfoPanel){
        amInfoPanel=document.createElement("aside");
        amInfoPanel.className="am-info-panel";
        amInfoPanel.setAttribute("role","dialog");
        document.body.appendChild(amInfoPanel);
    }
    const id=card.dataset.animeId||"";
    const title=card.dataset.infoTitle||"Unknown Anime";
    const score=card.dataset.infoScore||"—";
    const year=card.dataset.infoYear||"—";
    const eps=card.dataset.infoEpisodes||"Series";
    const genres=card.dataset.infoGenres||"";
    amInfoPanel.innerHTML='<div class="am-info-head"><div class="am-info-kicker">ANIME DETAILS</div><button class="am-info-close" type="button" aria-label="Close">×</button></div><h3 class="am-info-title"></h3><div class="am-info-stats"><span>★ '+escapeHtml(score)+'</span><span>'+escapeHtml(year)+'</span><span>'+escapeHtml(eps)+'</span></div><div class="am-info-genres">'+escapeHtml(genres)+'</div><button class="am-info-watch" type="button"><span>▶</span> Watch Now</button>';
    amInfoPanel.querySelector(".am-info-title").textContent=title;
    amInfoPanel.querySelector(".am-info-watch").onclick=(e)=>{e.preventDefault();e.stopPropagation();window.location.href="watch.html?id="+encodeURIComponent(id)+"&episode=1";};
    amInfoPanel.querySelector(".am-info-close").onclick=(e)=>{e.preventDefault();e.stopPropagation();amCloseInfoPanel();};
    return amInfoPanel;
}
function amPlacePanel(card){
    if(!amInfoPanel) return;
    const r=card.getBoundingClientRect(),gap=12,edge=10,vw=innerWidth,vh=innerHeight;
    const right=Math.max(0,vw-r.right-gap-edge),left=Math.max(0,r.left-gap-edge);
    const side=right>=left?"right":"left",space=side==="right"?right:left;
    // Keep one stable premium shape; only shrink when the viewport physically cannot fit it.
    const width=Math.min(300, Math.max(120, space));
    amInfoPanel.style.width=width+"px";
    amInfoPanel.style.minWidth=width+"px";
    amInfoPanel.style.maxWidth=width+"px";
    amInfoPanel.style.left="0px";amInfoPanel.style.top="0px";
    const h=Math.min(amInfoPanel.getBoundingClientRect().height,vh-edge*2);
    const top=Math.max(edge,Math.min(r.top+(r.height-h)/2,vh-h-edge));
    amInfoPanel.style.top=top+"px";
    amInfoPanel.style.left=(side==="right"?r.right+gap:Math.max(edge,r.left-gap-width))+"px";
}
function amOpenInfoPanel(card){
    if(!card)return;
    if(amInfoCard&&amInfoCard!==card)amCloseInfoPanel();
    amInfoCard=card;amMakePanel(card);amPlacePanel(card);
    requestAnimationFrame(()=>amInfoPanel?.classList.add("is-open"));
}
function amCloseInfoPanel(){
    clearTimeout(amInfoTimer);amInfoTimer=null;
    amInfoPanel?.classList.remove("is-open");amInfoCard=null;
}
function amTouchDevice(){return matchMedia("(pointer:coarse)").matches;}
document.addEventListener("pointerover",e=>{
    if(e.pointerType!=="mouse"||amTouchDevice())return;
    const c=e.target.closest(".anime-card-link");
    if(!c||c.contains(e.relatedTarget))return;
    clearTimeout(amInfoTimer);
    amOpenInfoPanel(c);
});
document.addEventListener("pointerout",e=>{
    if(e.pointerType!=="mouse"||amTouchDevice())return;
    const c=e.target.closest(".anime-card-link");
    if(!c||c.contains(e.relatedTarget))return;
    clearTimeout(amInfoTimer);
    // pointerout bubbles through children, so close only after confirming
    // the pointer is no longer inside the card and is not over the portal.
    amInfoTimer=setTimeout(()=>{
        if(!amInfoCard)return;
        if(amInfoPanel?.matches(":hover"))return;
        const hovered=document.elementFromPoint(e.clientX,e.clientY)?.closest?.(".anime-card-link");
        if(hovered===amInfoCard)return;
        amCloseInfoPanel();
    },120);
});

document.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse"||!amTouchDevice())return;
    const c=e.target.closest(".anime-card-link");if(!c)return;
    clearTimeout(amInfoTimer);
    amOpenInfoPanel(c);
});
document.addEventListener("pointerup",e=>{
    if(e.pointerType!=="mouse"){
        clearTimeout(amInfoTimer);amInfoTimer=null;
        // Close immediately after the finger leaves the screen.
        requestAnimationFrame(()=>amCloseInfoPanel());
    }
});
document.addEventListener("pointercancel",e=>{
    if(e.pointerType!=="mouse") amCloseInfoPanel();
});
document.addEventListener("touchend",()=>amCloseInfoPanel(),{passive:true});
document.addEventListener("touchcancel",()=>amCloseInfoPanel(),{passive:true});
document.addEventListener("pointerdown",e=>{
    if(!amInfoCard||amInfoPanel?.contains(e.target))return;
    if(e.target.closest(".anime-card-link")===amInfoCard)return;
    amCloseInfoPanel();
},true);
