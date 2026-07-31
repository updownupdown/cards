import { ImageSourcePropType } from "react-native";

export type GameBackground = {
  source: ImageSourcePropType;
  authorName?: string;
  authorLink?: string;
};

export const concreteBackground: GameBackground = {
  source: require("@/assets/backgrounds/concrete.jpg"),
};

export const feltDarkBlueBackground: GameBackground = {
  source: require("@/assets/backgrounds/felt-dark-blue.jpg"),
};

export const feltDarkGreenBackground: GameBackground = {
  source: require("@/assets/backgrounds/felt-dark-green.jpg"),
};

export const feltDarkPurpleBackground: GameBackground = {
  source: require("@/assets/backgrounds/felt-dark-purple.jpg"),
};

export const feltDarkRedBackground: GameBackground = {
  source: require("@/assets/backgrounds/felt-dark-red.jpg"),
};

export const feltGreyBackground: GameBackground = {
  source: require("@/assets/backgrounds/felt-grey.jpg"),
};

export const rockWallBackground: GameBackground = {
  source: require("@/assets/backgrounds/rock-wall.jpg"),
};

export const wallTileBackground: GameBackground = {
  source: require("@/assets/backgrounds/wall-tile.jpg"),
};

export const woodTableBackground: GameBackground = {
  source: require("@/assets/backgrounds/wood-table.jpg"),
};

export const woodVerticalBackground: GameBackground = {
  source: require("@/assets/backgrounds/wood-vertical.jpg"),
};

export const river: GameBackground = {
  source: require("@/assets/backgrounds/river.jpg"),
  authorName: "Deyan Peychev",
  authorLink: "https://unsplash.com/@deyan_peychev",
};

export const yukon: GameBackground = {
  source: require("@/assets/backgrounds/yukon.jpg"),
  authorName: "Kalen Emsley",
  authorLink: "https://unsplash.com/@kalenemsley",
};

export const siberia: GameBackground = {
  source: require("@/assets/backgrounds/siberia.jpg"),
  authorName: "Roman Purtov",
  authorLink: "https://unsplash.com/@roman_purtow",
};

export const mountain1: GameBackground = {
  source: require("@/assets/backgrounds/mountain-1.jpg"),
  authorName: "Mads Schmidt Rasmussen",
  authorLink: "https://unsplash.com/@mvds",
};

export const nightSky: GameBackground = {
  source: require("@/assets/backgrounds/night-sky.jpg"),
  authorName: "Nathan Anderson",
  authorLink: "https://unsplash.com/@nathananderson",
};

export const field: GameBackground = {
  source: require("@/assets/backgrounds/field.jpg"),
  authorName: "Claudio Testa",
  authorLink: "https://unsplash.com/@claudiotesta",
};

export const sahara: GameBackground = {
  source: require("@/assets/backgrounds/sahara.jpg"),
  authorName: "Andrzej Kryszpiniuk",
  authorLink: "https://unsplash.com/@kryszpin",
};

export const antarctica: GameBackground = {
  source: require("@/assets/backgrounds/antarctica.jpg"),
  authorName: "Cassie Matias",
  authorLink: "https://unsplash.com/@cass4504",
};

export const dungeon: GameBackground = {
  source: require("@/assets/backgrounds/dungeon.jpg"),
  authorName: "Intricate Explorer",
  authorLink: "https://unsplash.com/@intricateexplorer",
};

export const castle: GameBackground = {
  source: require("@/assets/backgrounds/castle.jpg"),
  authorName: "Jörg Angeli",
  authorLink: "https://unsplash.com/@joerga",
};

export const interchange: GameBackground = {
  source: require("@/assets/backgrounds/interchange.jpg"),
  authorName: "Tom Barrett",
  authorLink: "https://unsplash.com/@wistomsin",
};

export const london: GameBackground = {
  source: require("@/assets/backgrounds/london.jpg"),
  authorName: "Ashleigh Joy Photography",
  authorLink: "https://unsplash.com/@ashleighjoyphotography",
};

export const casino: GameBackground = {
  source: require("@/assets/backgrounds/casino.jpg"),
  authorName: "Leo_Visions",
  authorLink: "https://unsplash.com/@leo_visions_",
};

export const monteCarlo: GameBackground = {
  source: require("@/assets/backgrounds/monte-carlo.jpg"),
  authorName: "Braden Egli",
  authorLink: "https://unsplash.com/@bradenegli",
};

export const golf: GameBackground = {
  source: require("@/assets/backgrounds/golf.jpg"),
  authorName: "Andrew Shelley",
  authorLink: "https://unsplash.com/@andrewshelley",
};

export const playground: GameBackground = {
  source: require("@/assets/backgrounds/playground.jpg"),
  authorName: "Jinhan Moon",
  authorLink: "https://unsplash.com/@jinhan_photo",
};

export const bowling: GameBackground = {
  source: require("@/assets/backgrounds/bowling.jpg"),
  authorName: "Steven Cordes",
  authorLink: "https://unsplash.com/@steven3466",
};

export const island: GameBackground = {
  source: require("@/assets/backgrounds/island.jpg"),
  authorName: "Simon Spring",
  authorLink: "https://unsplash.com/@springsimon",
};

export const forest: GameBackground = {
  source: require("@/assets/backgrounds/forest.jpg"),
  authorName: "Degleex Ganzorig",
  authorLink: "https://unsplash.com/@degleex",
};

export const GAME_BACKGROUNDS = {
  concrete: concreteBackground,
  feltDarkBlue: feltDarkBlueBackground,
  feltDarkGreen: feltDarkGreenBackground,
  feltDarkPurple: feltDarkPurpleBackground,
  feltDarkRed: feltDarkRedBackground,
  feltGrey: feltGreyBackground,
  rockWall: rockWallBackground,
  wallTile: wallTileBackground,
  woodTable: woodTableBackground,
  woodVertical: woodVerticalBackground,
  river: river,
  yukon: yukon,
  siberia: siberia,
  mountain1: mountain1,
  nightSky: nightSky,
  field: field,
  sahara: sahara,
  antarctica: antarctica,
  dungeon: dungeon,
  castle: castle,
  interchange: interchange,
  london: london,
  casino: casino,
  monteCarlo: monteCarlo,
  golf: golf,
  playground: playground,
  bowling: bowling,
  island: island,
  forest: forest,
} as const;
