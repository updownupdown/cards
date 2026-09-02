import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const gargantua: GameDefinition = {
  path: "/gargantua",
  title: "Gargantua",
  aliases: ["Double Klondike"],
  tags: [GameTag.StockAndWaste, GameTag.TableauBuilding],
  rating: { complexity: 35, difficulty: 45, luck: 45 },
  background: GAME_BACKGROUNDS.mountain1,
  animation: GameAnimations.Clouds,
  gameColorDark: "#24323a",
  gameColorPale: "#dce5df",
  cardDescription:
    "Climb a nine-column, two-deck Klondike with eight foundations.",
  quickStart: [
    "Build tableau down by alternating color.",
    "Move ordered runs; only Kings fill empty columns.",
    "Build eight foundations by suit; the stock has two passes.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to eight foundations, building Ace through King by suit.",
    "## Rules",
    "- Nine tableau columns are dealt in a Klondike staircase.",
    "- Build down by alternating color and move ordered runs.",
    "- Only Kings may fill empty columns.",
    "- Turn stock cards one at a time; the stock may be dealt twice.",
  ],
};
