import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const gargantua: GameDefinition = {
  path: "/gargantua",
  title: "Gargantua",
  aliases: ["Double Klondike"],
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 35, difficulty: 45, luck: 45 },
  thumbnail: "Gargantua.webp",
  background: GAME_BACKGROUNDS.frozenMountain,
  animation: GameAnimations.Clouds,
  gameColorDark: "#24323a",
  gameColorMid: "#578386",
  gameColorPale: "#dce5df",
  cardDescription:
    "Climb a nine-column, two-deck Klondike with eight foundations.",
  quickStart: [
    "Move both decks to eight foundations, built by suit from A to K.",
    "Build tableau down by alternating color and move ordered runs.",
    "Only Ks fill empty columns; 1 redeal gives 2 stock passes.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to eight foundations, building Ace through King by suit.",
    "## Rules",
    "- Nine tableau columns are dealt in a Klondike staircase.",
    "- Build down by alternating color and move ordered runs.",
    "- Only Kings may fill empty columns.",
    "- Turn stock cards one at a time; 1 redeal gives 2 passes total.",
  ],
};
