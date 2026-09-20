const animeList = [
    {
        image: "https://media.themoviedb.org/t/p/w440_and_h660_face/tI5CDqLzJKGBGGACG1O2jwZ2KC1.jpg",

        tag: "TRENDING NOW",

        title: "Solo Leveling",

        description:
            "The weakest hunter becomes humanity's strongest after obtaining a mysterious system.",

        watch: "#",

        details: "#"
    },

    {
        image: "https://i.pinimg.com/1200x/fd/b7/37/fdb7375f182a39dc7ffd540d11c0f9fd.jpg",

        tag: "MOST POPULAR",

        title: "One Piece",

        description:
            "Join Monkey D. Luffy and the Straw Hat Pirates on the greatest adventure ever.",

        watch: "#",

        details: "#"
    },

    {
        image: "https://i.pinimg.com/736x/cd/ec/b1/cdecb11edd24867bf1e2f4be220aab2c.jpg",

        tag: "NEW EPISODE",

        title: "Dandadan",

        description:
            "Aliens, ghosts and nonstop action collide in one of the craziest anime ever.",

        watch: "#",

        details: "#"
    },

    {
        image: "https://i.pinimg.com/736x/a1/46/7f/a1467fb9dfe067858af2003ef8925569.jpg",

        tag: "TOP RATED",

        title: "Chainsaw Man",

        description:
            "Denji enters the brutal world of devil hunters chasing his impossible dreams.",

        watch: "#",

        details: "#"
    }

];



const bannerImage = document.getElementById("banner-image");

const bannerTag = document.getElementById("banner-tag");

const bannerTitle = document.getElementById("banner-title");

const bannerDescription = document.getElementById("banner-description");

const watchBtn = document.getElementById("watch-btn");

const detailsBtn = document.getElementById("details-btn");

const dots = document.querySelectorAll(".dot");



let current = 0;



function showAnime(index) {

    bannerImage.src = animeList[index].image;

    bannerTag.textContent = animeList[index].tag;

    bannerTitle.textContent = animeList[index].title;

    bannerDescription.textContent = animeList[index].description;

    watchBtn.href = animeList[index].watch;

    detailsBtn.href = animeList[index].details;


    dots.forEach(dot => {

        dot.classList.remove("active");

    });

    dots[index].classList.add("active");

}



showAnime(current);



setInterval(() => {

    current++;

    if (current >= animeList.length) {

        current = 0;

    }

    showAnime(current);

}, 5000);



dots.forEach((dot, index) => {

    dot.addEventListener("click", () => {

        current = index;

        showAnime(current);

    });

});