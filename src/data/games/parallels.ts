import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const parallels: GameDefinition = {
  path: "/parallels",
  title: "Parallels",
  tags: [GameTag.SpatialControl, GameTag.StockAndWaste],
  rating: {
    complexity: 30,
    difficulty: 45,
    luck: 55,
  },
  thumbnail: "Parallels.webp",
  background: GAME_BACKGROUNDS.stoneWall,
  animation: GameAnimations.Rain,
  gameColorDark: "#1a1f24",
  gameColorMid: "#6e7f8f",
  gameColorPale: "#e3eaf0",
  cardDescription:
    "Stack parallel rows of two decks between Ace and King foundations, freeing cards from either edge.",
  quickStart: [
    "Move all 104 cards to the foundations. Build As up and Ks down by suit.",
    "With three or more rows, a card needs an open space above or below.",
    "Tap the stock to fill gaps, or add a row once there are none.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 104 cards onto the eight foundations.",

    "## Foundations",
    "- Aces build **up** by suit; Kings build **down** by suit.",

    "## Rules",
    "- While there are one or two rows, every card is available.",
    "- From three rows on, a card is **free** only when the space directly above or below it is empty.",
    "- Tap the **stock** to fill every gap in the tableau. If there are no gaps, it deals a new row of ten across the bottom.",
    "- There is no building in the tableau and no redeal.",
  ],
};
