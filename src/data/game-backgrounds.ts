import { ImageSourcePropType } from "react-native";

export type GameBackground = {
  source: ImageSourcePropType;
  authorName?: string;
  authorLink?: string;
};

export const GAME_BACKGROUNDS = {
  river: {
    source: require("@/assets/backgrounds/river.jpg"),
    authorName: "Deyan Peychev",
    authorLink: "https://unsplash.com/@deyan_peychev",
  },
  yukon: {
    source: require("@/assets/backgrounds/yukon.jpg"),
    authorName: "Kalen Emsley",
    authorLink: "https://unsplash.com/@kalenemsley",
  },
  siberia: {
    source: require("@/assets/backgrounds/siberia.jpg"),
    authorName: "Roman Purtov",
    authorLink: "https://unsplash.com/@roman_purtow",
  },
  mountain1: {
    source: require("@/assets/backgrounds/mountain-1.jpg"),
    authorName: "Mads Schmidt Rasmussen",
    authorLink: "https://unsplash.com/@mvds",
  },
  nightSky: {
    source: require("@/assets/backgrounds/night-sky.jpg"),
    authorName: "Thomas Ciszewski",
    authorLink: "https://unsplash.com/@coc6",
  },
  field: {
    source: require("@/assets/backgrounds/field.jpg"),
    authorName: "Claudio Testa",
    authorLink: "https://unsplash.com/@claudiotesta",
  },
  sahara: {
    source: require("@/assets/backgrounds/sahara.jpg"),
    authorName: "Andrzej Kryszpiniuk",
    authorLink: "https://unsplash.com/@kryszpin",
  },
  antarctica: {
    source: require("@/assets/backgrounds/antarctica.jpg"),
    authorName: "Cassie Matias",
    authorLink: "https://unsplash.com/@cass4504",
  },
  dungeon: {
    source: require("@/assets/backgrounds/dungeon.jpg"),
    authorName: "Intricate Explorer",
    authorLink: "https://unsplash.com/@intricateexplorer",
  },
  castle: {
    source: require("@/assets/backgrounds/castle.jpg"),
    authorName: "Jörg Angeli",
    authorLink: "https://unsplash.com/@joerga",
  },
  interchange: {
    source: require("@/assets/backgrounds/interchange.jpg"),
    authorName: "Tom Barrett",
    authorLink: "https://unsplash.com/@wistomsin",
  },
  stoneTunnel: {
    source: require("@/assets/backgrounds/stone-tunnel.jpg"),
    authorName: "Francesco Ungaro",
    authorLink: "https://unsplash.com/@francesco_ungaro",
  },
  london: {
    source: require("@/assets/backgrounds/london.jpg"),
    authorName: "Ashleigh Joy Photography",
    authorLink: "https://unsplash.com/@ashleighjoyphotography",
  },
  casino: {
    source: require("@/assets/backgrounds/casino.jpg"),
    authorName: "Leo_Visions",
    authorLink: "https://unsplash.com/@leo_visions_",
  },
  monteCarlo: {
    source: require("@/assets/backgrounds/monte-carlo.jpg"),
    authorName: "Braden Egli",
    authorLink: "https://unsplash.com/@bradenegli",
  },
  golf: {
    source: require("@/assets/backgrounds/golf.jpg"),
    authorName: "Andrew Shelley",
    authorLink: "https://unsplash.com/@andrewshelley",
  },
  fallLeaves: {
    source: require("@/assets/backgrounds/fall-leaves.jpg"),
    authorName: "Piotr Miklaszewski",
    authorLink: "https://unsplash.com/@p_imik",
  },
  bowling: {
    source: require("@/assets/backgrounds/bowling.jpg"),
    authorName: "Steven Cordes",
    authorLink: "https://unsplash.com/@steven3466",
  },
  island: {
    source: require("@/assets/backgrounds/island.jpg"),
    authorName: "Simon Spring",
    authorLink: "https://unsplash.com/@springsimon",
  },
  forest: {
    source: require("@/assets/backgrounds/forest.jpg"),
    authorName: "Degleex Ganzorig",
    authorLink: "https://unsplash.com/@degleex",
  },
  oldRoom: {
    source: require("@/assets/backgrounds/old-room.jpg"),
    authorName: "The Metropolitan Museum of Art",
    authorLink: "https://unsplash.com/@metropolitanmuseum",
  },
  brickStreet: {
    source: require("@/assets/backgrounds/brick-street.jpg"),
    authorName: "Barney Goodman",
    authorLink: "https://unsplash.com/@bgoodpic",
  },
  swamp: {
    source: require("@/assets/backgrounds/swamp.jpg"),
    authorName: "Žan Janžekovič",
    authorLink: "https://unsplash.com/@zanjanzekovic",
  },
  city: {
    source: require("@/assets/backgrounds/city.jpg"),
    authorName: "Thomas Habr",
    authorLink: "https://unsplash.com/@thomashabr",
  },
  savanah: {
    source: require("@/assets/backgrounds/savanah.jpg"),
    authorName: "David Clode",
    authorLink: "https://unsplash.com/@davidclode",
  },
  treeRain: {
    source: require("@/assets/backgrounds/tree-rain.jpg"),
    authorName: "Jonathan Klok",
    authorLink: "https://unsplash.com/@mostly_brave",
  },
  greenhouse: {
    source: require("@/assets/backgrounds/greenhouse.jpg"),
    authorName: "Jack Prew",
    authorLink: "https://unsplash.com/@jack_prew",
  },
  cherryBlossoms: {
    source: require("@/assets/backgrounds/cherry-blossoms.jpg"),
    authorName: "Meriç Dağlı",
    authorLink: "https://unsplash.com/@meric",
  },
  club: {
    source: require("@/assets/backgrounds/club.jpg"),
    authorName: "Aleksandr Popov",
    authorLink: "https://unsplash.com/@5tep5",
  },
  bookstore: {
    source: require("@/assets/backgrounds/bookstore.jpg"),
    authorName: "Ashley Byrd",
    authorLink: "https://unsplash.com/@byrdman85",
  },
  darkAlley: {
    source: require("@/assets/backgrounds/dark-alley.jpg"),
    authorName: "Adam Sprouse",
    authorLink: "https://unsplash.com/@asprouse97",
  },
  painting: {
    source: require("@/assets/backgrounds/painting.jpg"),
    authorName: "Susan Wilkinson",
    authorLink: "https://unsplash.com/@susan_wilkinson",
  },
  cozyCabin: {
    source: require("@/assets/backgrounds/cozy-cabin.jpg"),
    authorName: "Ian Keefe",
    authorLink: "https://unsplash.com/@iankeefe",
  },
  cabinInterior: {
    source: require("@/assets/backgrounds/cabin-interior.jpg"),
    authorName: "Clay Banks",
    authorLink: "https://unsplash.com/@claybanks",
  },
  greece: {
    source: require("@/assets/backgrounds/greece.jpg"),
    authorName: "Tânia Mousinho",
    authorLink: "https://unsplash.com/@shotsbytania",
  },
} satisfies Record<string, GameBackground>;

export const {
  river,
  yukon,
  siberia,
  mountain1,
  nightSky,
  field,
  sahara,
  antarctica,
  dungeon,
  castle,
  interchange,
  stoneTunnel,
  london,
  casino,
  monteCarlo,
  golf,
  fallLeaves,
  bowling,
  island,
  forest,
  oldRoom,
  brickStreet,
  swamp,
  city,
  savanah,
  treeRain,
  greenhouse,
  cherryBlossoms,
  club,
  bookstore,
  darkAlley,
  painting,
  cozyCabin,
  cabinInterior,
  greece,
} = GAME_BACKGROUNDS;
