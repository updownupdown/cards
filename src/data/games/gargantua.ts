import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const gargantua: GameDefinition = {
  path: "/gargantua",
  title: "Gargantua",
  aliases: ["Double Klondike", "Harp"],
  tags: [
    GameTag.KlondikeFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 25, difficulty: 50, luck: 40 },
  thumbnail: "Gargantua.webp",
  thumbnailCredit: {
    title: "Gargantua",
    artistName: "Gustave Doré",
    date: "1873",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Gustave_Dor%C3%A9_-_Gargantua.jpg",
  },
  background: GAME_BACKGROUNDS.frozenMountain,
  animation: GameAnimations.Clouds,
  gameColorDark: "#24323a",
  gameColorPale: "#dce5df",
  cardBack: CardBackColors.Teal,
  cardDescription:
    "Climb a nine-column, two-deck Klondike with eight foundations.",
  quickStart: [
    "Move both decks to eight foundations, built by suit from A to K.",
    "Build tableau down by alternating color and move ordered runs.",
    "Only Ks fill empty columns; 1 redeal (3 in Harp).",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to eight foundations, building Ace through King by suit.",
    "## Rules",
    "- Nine tableau columns are dealt in a Klondike staircase.",
    "- Build down by alternating color and move ordered runs.",
    "- Only Kings may fill empty columns.",
    "- Turn stock cards one at a time; 1 redeal gives 2 passes total.",
    "## Harp",
    "Harp is the same game with 3 redeals, for 4 passes through the stock.",
  ],
};
