import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";
export const easthaven: GameDefinition = {
  path: "/easthaven",
  title: "Easthaven",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 35, difficulty: 60, luck: 55 },
  thumbnail: "Easthaven.webp",
  background: GAME_BACKGROUNDS.stonyBeach,
  gameColorDark: "#203638",
  gameColorMid: "#5aafaf",
  gameColorPale: "#dcefed",
  cardDescription:
    "Build seven compact columns, then deal each new stock row straight onto the tableau.",
  quickStart: [
    "Build foundations up by suit.",
    "Build tableau down by rank.",
    "Deal one stock card to every column; Ks fill spaces.",
  ],
  howToPlay: [
    "## Objective",
    "Build four foundations up by suit from Ace to King.",
    "## Rules",
    "- Build tableau down by rank.",
    "- Move descending same-suit runs together.",
    "- Only Kings fill empty columns.",
    "- Each stock tap deals one card to every column.",
  ],
};
