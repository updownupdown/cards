import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const spiderette: GameDefinition = {
  path: "/spiderette",
  title: "Spiderette",
  tags: [GameTag.SpiderFamily, GameTag.SequenceBuilding],
  rating: { complexity: 35, difficulty: 70, luck: 40 },
  thumbnail: "Spiderette.webp",
  thumbnailCredit: {
    title: "Pink-Toed Tarantula, from Metamorphosis of the Insects of Surinam",
    artistName: "Maria Sibylla Merian",
    date: "1705",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Avicularia-avicularia.jpg",
  },
  background: GAME_BACKGROUNDS.forestGrasses,
  animation: GameAnimations.Spiders,
  gameColorDark: "#202e27",
  gameColorPale: "#dae6cf",
  cardBack: CardBackColors.Rose,
  cardDescription:
    "A compact single-deck Spider played across seven Klondike-shaped columns.",
  quickStart: [
    "Remove four complete suited runs from King to Ace.",
    "Build down by rank and move descending same-suit runs.",
    "Deal stock rows only when every column is occupied.",
  ],
  howToPlay: [
    "## Objective",
    "Remove four complete suited runs from King to Ace.",
    "## Rules",
    "- Build tableau down by rank, regardless of suit.",
    "- Only descending same-suit runs move together.",
    "- Any card or valid run may fill an empty column.",
    "- Stock deals one card to every column, but only when no column is empty.",
  ],
};
