// Mapping Marvel Rivals (héros et maps)
// Utilise des images hébergées ou locales si possible

export const HEROES = {
  "Iron Man": {
    name: "Iron Man",
    img: "https://static.marvelrivals.com/heroes/ironman.png"
  },
  "Loki": {
    name: "Loki",
    img: "https://static.marvelrivals.com/heroes/loki.png"
  },
  "Star-Lord": {
    name: "Star-Lord",
    img: "https://static.marvelrivals.com/heroes/starlord.png"
  },
  "Magik": {
    name: "Magik",
    img: "https://static.marvelrivals.com/heroes/magik.png"
  },
  "Black Panther": {
    name: "Black Panther",
    img: "https://static.marvelrivals.com/heroes/blackpanther.png"
  },
  // ... ajoute d'autres héros ici
};

export const MAPS = {
  "1001": {
    name: "Tokyo 2099",
    img: "https://static.marvelrivals.com/maps/tokyo2099.jpg"
  },
  "1002": {
    name: "Yggsgard",
    img: "https://static.marvelrivals.com/maps/yggsgard.jpg"
  },
  "1003": {
    name: "Stark Tower",
    img: "https://static.marvelrivals.com/maps/starktower.jpg"
  },
  // ... ajoute d'autres maps ici
};

export function getHeroData(heroName) {
  return HEROES[heroName] || { name: heroName, img: "https://static.marvelrivals.com/heroes/unknown.png" };
}

export function getMapData(mapId) {
  return MAPS[mapId] || { name: `Map #${mapId}`, img: "https://static.marvelrivals.com/maps/unknown.jpg" };
}
