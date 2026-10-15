(() => {
  "use strict";
  const API = "https://animemoss-api-production.up.railway.app";
  const section = document.getElementById("continue-watching-section");
  const list = document.getElementById("continue-watching-list");


  function identity(user) {
    return user ? String(user.id || user.userId || user.email || user.username || user.handle || "signed-in") : "guest";
  }
  function storageKey(user) { return "animemoss-continue-watching:" + identity(user); }
  function readHistory(user) {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey(user)) || "[]");
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  async function load() {
    if (!section || !list) return;
    let user = null;
    try { user = await window.AnimeMossAuth?.getCurrentUser?.() || null; } catch {}
    const history = readHistory(user).sort((a,b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)).slice(0, 8);
    if (!history.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    list.innerHTML = '<div class="moss-continue-loading">Loading your anime…</div>';
    const items = await Promise.all(history.map(async item => {
      try {
        const response = await fetch(API + "/anime/" + encodeURIComponent(item.animeId));
        if (!response.ok) throw new Error("Anime unavailable");
        const anime = await response.json();
        return { ...item, anime };
      } catch { return { ...item, anime: null }; }
    }));
    const valid = items.filter(item => item.anime);
    if (!valid.length) {
      list.innerHTML = '<div class="moss-continue-empty">Your recent watch history could not be loaded. It will appear here when you watch again.</div>';
      return;
    }
    list.innerHTML = valid.map(item => {
      const anime = item.anime;
      const title = anime.title?.english || anime.title?.romaji || anime.title?.native || "Anime";
      const image = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage || "";
      const episode = Math.max(1, Number(item.episode) || 1);
      const total = Math.max(0, Number(anime.episodes) || 0);
      const progress = total ? Math.min(100, Math.round(episode / total * 100)) : 0;
      const href = "watch.html?id=" + encodeURIComponent(item.animeId) + "&episode=" + episode + (item.type === "dub" ? "&type=dub" : "");
      return '<a class="moss-continue-card" href="' + href + '">' +
        '<img class="moss-continue-poster" src="' + escapeHtml(image) + '" alt="' + escapeHtml(title) + '" loading="lazy" decoding="async">' +
        '<span class="moss-continue-copy"><span class="moss-continue-title">' + escapeHtml(title) + '</span>' +
        '<span class="moss-continue-episode">Episode ' + episode + '</span>' +
        '<span class="moss-continue-hint">' + (total ? 'of ' + total + ' episodes' : 'Continue your episode') + '</span>' +
        '<span class="moss-continue-progress"><span style="width:' + progress + '%"></span></span>' +
        '<span class="moss-continue-play"><i class="fa-solid fa-play"></i> Continue</span></span></a>';
    }).join("");
  }
  window.AnimeMossContinueWatching = {
    save: async function(animeId, episode, type) {
      if (!animeId || !episode) return;
      let user = null;
      try { user = await window.AnimeMossAuth?.getCurrentUser?.() || null; } catch {}
      const key = storageKey(user);
      const history = readHistory(user);
      const id = String(animeId);
      const record = { animeId: id, episode: Math.max(1, Number(episode) || 1), type: type === "dub" ? "dub" : "sub", updatedAt: Date.now() };
      const next = [record, ...history.filter(item => String(item.animeId) !== id)].slice(0, 20);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch (error) { console.warn("Could not save watch history", error); }
    },
    refresh: load
  };
  load();
})();