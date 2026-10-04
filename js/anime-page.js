const id = new URLSearchParams(window.location.search).get("id");
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

        // Banner
        document.getElementById("banner").src = anime.bannerImage;

        // Poster
        document.getElementById("poster").src = anime.coverImage.extraLarge;

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