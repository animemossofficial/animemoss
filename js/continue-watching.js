(() => {
  "use strict";
  const API = "https://animemoss-api-production.up.railway.app";
  const KEY = "animemoss-continue-watching";
  const section = document.getElementById("continue-watching-section");
  const list = document.getElementById("continue-watching-list");

  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  };
  const write = (items) => {
    try { localStorage.setItem(KEY, JSON.stringify(items.slice(0, 20))); return true; }
    catch (error) { console.warn("[Continue Watching] storage write failed", error); return false; }
  };
  const escape = (value) => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  function save(animeId, episode, type) {
    if (animeId == null || String(animeId).trim() === "") return;
    const id = String(animeId);
    const ep = Math.max(1, Number(episode) || 1);
    const items = read().filter(item => String(item.animeId) !== id);
    items.unshift({ animeId:id, episode:ep, type:type === "dub" ? "dub" : "sub", updatedAt:Date.now() });
    write(items);
    if (section && list) render();
  }
  function normalize(payload, id) {
    let a = payload?.anime || payload?.data || payload;
    if (Array.isArray(a)) a = a[0];
    if (!a || typeof a !== "object") return null;
    let cover = a.coverImage ?? a.cover_image ?? a.coverImageUrl ?? a.image ?? "";
    if (typeof cover === "string") cover = { large:cover, extraLarge:cover };
    let title = a.title;
    if (typeof title === "string") title = { english:title, romaji:title };
    if (!title) title = { english:a.titleEnglish || a.title_english || a.titleRomaji || a.title_romaji || a.name || ("Anime " + id) };
    return { ...a, id:a.id || id, title, coverImage:cover || {}, titleEnglish:title?.english || a.titleEnglish || a.title_english || "", titleRomaji:title?.romaji || a.titleRomaji || a.title_romaji || "" };
  }
  async function getAnime(item) {
    try {
      const response = await fetch(API + "/anime/" + encodeURIComponent(item.animeId), { cache:"no-store" });
      if (!response.ok) throw new Error("Anime endpoint returned " + response.status);
      const anime = normalize(await response.json(), item.animeId);
      if (anime && (anime.title?.english || anime.title?.romaji) && (anime.coverImage?.large || anime.coverImage?.extraLarge)) return anime;
    } catch (error) {
      console.warn("[Continue Watching] primary anime details unavailable; trying AniList", item.animeId, error);
    }
    // The site's IDs are AniList media IDs. Use AniList directly if the app API cache is empty.
    try {
      const response = await fetch("https://graphql.anilist.co", {
        method:"POST",
        headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({
          query:"query ($id: Int) { Media(id: $id, type: ANIME) { id title { english romaji native } episodes coverImage { large extraLarge } } }",
          variables:{id:Number(item.animeId)}
        })
      });
      if (!response.ok) throw new Error("AniList returned " + response.status);
      const payload = await response.json();
      const anime = normalize(payload?.data?.Media, item.animeId);
      if (anime) return anime;
    } catch (error) {
      console.warn("[Continue Watching] AniList fallback unavailable", item.animeId, error);
    }
    return null;
  }
  async function getEpisodeThumbnail(item) {
    try {
      const response = await fetch(API + "/episodes/" + encodeURIComponent(item.animeId), { cache:"no-store" });
      if (!response.ok) return "";
      const payload = await response.json();
      const episodes = Array.isArray(payload?.episodes) ? payload.episodes : [];
      const exact = episodes.find(ep => Number(ep.number) === Number(item.episode));
      // Current API episode rows may have null thumbnails; never treat a missing thumbnail as a failed card.
      return typeof exact?.thumbnail === "string" ? exact.thumbnail : "";
    } catch (error) {
      console.warn("[Continue Watching] episode thumbnail unavailable", item.animeId, item.episode, error);
      return "";
    }
  }
  function card(item, anime, episodeThumbnail) {
    const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.native || anime?.titleEnglish || anime?.titleRomaji || ("Anime " + item.animeId);
    const cover = episodeThumbnail || anime?.coverImage?.extraLarge || anime?.coverImage?.large || "";
    const episode = Math.max(1, Number(item.episode) || 1);
    const total = Math.max(0, Number(anime?.episodes) || 0);
    const progress = total ? Math.min(100, Math.round(episode / total * 100)) : 0;
    const href = "watch.html?id=" + encodeURIComponent(item.animeId) + "&episode=" + episode + (item.type === "dub" ? "&type=dub" : "");
    return '<a class="moss-continue-card" href="' + href + '">' +
      '<div class="moss-continue-art">' +
      (cover ? '<img class="moss-continue-poster" src="' + escape(cover) + '" alt="' + escape(title) + '" loading="lazy" decoding="async">' : '<div class="moss-continue-poster moss-continue-placeholder"><i class="fa-solid fa-play"></i></div>') +
      '<span class="moss-continue-badge">EP ' + episode + (total ? ' / ' + total : '') + '</span><span class="moss-continue-overlay"><i class="fa-solid fa-play"></i></span></div>' +
      '<span class="moss-continue-copy"><span class="moss-continue-title">' + escape(title) + '</span>' +
      '<span class="moss-continue-episode">Episode ' + episode + '</span>' +
      '</span></a>';
  }
  let renderToken = 0;
  async function render() {
    if (!section || !list) return;
    const token = ++renderToken;
    const history = read().sort((a,b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)).slice(0, 10);
    if (!history.length) { section.hidden = true; return; }
    section.hidden = false;
    list.innerHTML = '<div class="moss-continue-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading your recently watched anime…</div>';
    const resolved = await Promise.all(history.map(async item => { const anime = await getAnime(item); const total = Math.max(0, Number(anime?.episodes) || 0); if (total && Number(item.episode) > total) { item.episode = total; } const episodeThumbnail = await getEpisodeThumbnail(item); return {item, anime, episodeThumbnail}; }));
    if (token !== renderToken) return;
    list.innerHTML = resolved.map(({item,anime,episodeThumbnail}) => card(item,anime,episodeThumbnail)).join("");
  }
  window.AnimeMossContinueWatching = { save, refresh:render, read };
  // On watch pages, persist the requested episode immediately; playback success is not required.
  if (!section && /watch\.html$/i.test(location.pathname)) {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (id) save(id, params.get("episode") || 1, params.get("type"));
  }
  if (section && list) {
    render();
    window.addEventListener("storage", event => { if (event.key === KEY) render(); });
  }
})();