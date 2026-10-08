const id = new URLSearchParams(window.location.search).get("id");

function setAnimeSeo(anime) {
    const title =
        anime?.title?.english ||
        anime?.title?.romaji ||
        anime?.title?.native ||
        "Anime Details";

    const description = String(
        anime?.description ||
        `Explore ${title}, including its synopsis, genres, episodes, rating and status on AnimeMOSS.`
    )
        .replace(/\\s+/g, " ")
        .trim()
        .slice(0, 160);

    const pageUrl = `https://animemossofficial.github.io/animemoss/anime.html?id=${encodeURIComponent(id)}`;
    const image = anime?.coverImage?.extraLarge || anime?.bannerImage || "https://animemossofficial.github.io/animemoss/favicon.ico";

    document.title = `${title} — AnimeMOSS`;

    const descriptionMeta = document.getElementById("seo-description");
    if (descriptionMeta) descriptionMeta.setAttribute("content", description);

    const canonical = document.getElementById("seo-canonical");
    if (canonical) canonical.setAttribute("href", pageUrl);

    const ogTitle = document.getElementById("og-title");
    if (ogTitle) ogTitle.setAttribute("content", `${title} — AnimeMOSS`);

    const ogDescription = document.getElementById("og-description");
    if (ogDescription) ogDescription.setAttribute("content", description);

    const ogUrl = document.getElementById("og-url");
    if (ogUrl) ogUrl.setAttribute("content", pageUrl);

    const ogImage = document.getElementById("og-image");
    if (ogImage) ogImage.setAttribute("content", image);

    const twitterTitle = document.getElementById("twitter-title");
    if (twitterTitle) twitterTitle.setAttribute("content", `${title} — AnimeMOSS`);

    const twitterDescription = document.getElementById("twitter-description");
    if (twitterDescription) twitterDescription.setAttribute("content", description);

    const jsonLd = document.getElementById("anime-jsonld");
    if (jsonLd) {
        jsonLd.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TVSeries",
            "name": title,
            "url": pageUrl,
            "description": description,
            "image": image,
            "genre": Array.isArray(anime?.genres) ? anime.genres : [],
            "inLanguage": "en",
            ...(anime?.seasonYear ? { "startDate": String(anime.seasonYear) } : {}),
            ...(anime?.averageScore ? {
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": Number(anime.averageScore) / 10,
                    "bestRating": 10,
                    "worstRating": 0,
                    "ratingCount": 1
                }
            } : {})
        });
    }
}


document.querySelector(".watch-btn").href =
    `watch.html?id=${id}&episode=1`;

const query = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {

    title {
      romaji
      english
      native
    }

    bannerImage

    coverImage {
      extraLarge
    }

    description(asHtml: false)

    episodes

    averageScore

    genres

    status

    season

    seasonYear

    trailer {
      id
      site
    }
  }
}
`;

async function getAnimeDetails() {

    try {

        const response = await fetch("https://graphql.anilist.co", {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify({
                query,
                variables: {
                    id: Number(id)
                }
            })

        });

        const result = await response.json();

        console.log(result);
        const anime = result.data.Media;

        if (!anime) {
            throw new Error("Anime not found.");
        }

        setAnimeSeo(anime);

        // Banner
        document.getElementById("banner").src = anime.bannerImage || anime.coverImage?.extraLarge || "";
        document.getElementById("banner").alt = `${anime.title.english || anime.title.romaji || anime.title.native || "Anime"} banner`;


        // Poster
        document.getElementById("poster").src = anime.coverImage?.extraLarge || "";
        document.getElementById("poster").alt = `${anime.title.english || anime.title.romaji || anime.title.native || "Anime"} poster`;


        // Title
        document.getElementById("title").textContent =
            anime.title.english || anime.title.romaji;

        // Native Title
        document.getElementById("native-title").textContent =
            anime.title.native;

        // Status
        document.getElementById("status").textContent =
            anime.status;

        // Score
        document.getElementById("score").textContent =
            "⭐ " + anime.averageScore + "%";

        // Episodes
        document.getElementById("episodes").textContent =
            "📺 " + (anime.episodes || "?") + " Episodes";

        // Season
        document.getElementById("season").textContent =
            "📅 " + anime.season + " " + anime.seasonYear;

        // Description
        document.getElementById("description").innerHTML =
            anime.description;

        // Genres
        const genres = document.getElementById("genres");

        genres.innerHTML = "";

        anime.genres.forEach(genre => {

            genres.innerHTML += `
        <span class="genre">${genre}</span>
    `;

        });

    }

    catch (err) {

        console.error(err);

    }

}

getAnimeDetails();