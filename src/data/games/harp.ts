import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const harp: GameDefinition = {
  path: "/harp",
  title: "Harp",
  tags: [GameTag.StockAndWaste, GameTag.TableauBuilding],
  rating: { complexity: 35, difficulty: 35, luck: 40 },
  background: GAME_BACKGROUNDS.field,
  animation: GameAnimations.Leaves,
  gameColorDark: "#293a31",
  gameColorPale: "#e7dfc4",
  cardDescription:
    "A more forgiving Double Klondike with four passes through the stock.",
  quickStart: [
    "Build tableau down by alternating color.",
    "Only Kings fill empty columns.",
    "Use four stock passes to complete eight foundations.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to eight suit foundations.",
    "## Rules",
    "- Harp uses Gargantua's nine-column Klondike layout.",
    "- Build down by alternating color and move ordered runs.",
    "- Only Kings may fill empty columns.",
    "- Turn one stock card at a time, with four total passes.",
  ],
};
