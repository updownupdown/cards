import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const irisGarden: GameDefinition = {
  path: "/iris-garden",
  title: "Iris Garden",
  source: {
    title: "Shisen-Sho",
    designer: "Tamtex",
    year: "1989",
  },
  tags: [GameTag.PairMatching, GameTag.SpatialControl],
  rating: {
    complexity: 15,
    difficulty: 25,
    luck: 30,
  },
  thumbnail: "IrisGarden.webp",
  thumbnailCredit: {
    title: "Horikiri Iris Garden, from One Hundred Famous Views of Edo",
    artistName: "Utagawa Hiroshige",
    date: "1857",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Utagawa_Hiroshige_I,_published_by_Uoya_Eikichi_-_Horikiri_Iris_Garden_(Horikiri_no_hanash%C5%8Dbu),_from_the_series_One_Hundred_Famous_Views_of_Edo_(Meish..._-_Google_Art_Project.jpg",
  },
  background: GAME_BACKGROUNDS.flowerGarden,
  animation: GameAnimations.Pollen,
  gameColorDark: "#1b2433",
  gameColorPale: "#e8ecf6",
  gameColorAccent: "#b8a4e6",
  cardBack: CardBackColors.Mauve,
  quickStart: [
    "Clear the whole garden by selecting matching pairs.",
    "Pairs must be adjacent, or connectable by a path through empty spaces made of at most three lines.",
  ],
  howToPlay: [
    "## Objective",
    "Clear all **48 cards** (Ace to Queen) from the garden in pairs.",

    "## Gameplay",
    "Two cards of the **same rank** make a pair, whatever their suits.",
    "A pair of **matching rank** cards can be discarded if they are orthogonally adjacent, or connected through **empty spaces**, made of at most three straight lines.",
  ],
};
