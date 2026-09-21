import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const labyrinth: GameDefinition = {
  path: "/labyrinth",
  title: "Labyrinth",
  tags: [GameTag.SpatialControl, GameTag.StockAndWaste],
  rating: {
    complexity: 20,
    difficulty: 35,
    luck: 65,
  },
  thumbnail: "Labyrinth.webp",
  background: GAME_BACKGROUNDS.stoneTunnel,
  animation: GameAnimations.ManaDust,
  gameColorDark: "#1c1f26",
  gameColorMid: "#5b6b8c",
  gameColorPale: "#dde4f2",
  cardDescription:
    "Deal row after row, and work cards free from the top and bottom of the maze.",
  quickStart: [
    "Build all four foundations by suit, from Ace to King.",
    "Only cards with an open space above or below are free.",
    "Tap the stock to deal a new row when you're stuck.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards onto the four foundations, built up by suit from Ace to King.",

    "## Rules",
    "- A card is **free** when the space directly above it or below it is empty, so the top and bottom rows are always free.",
    "- Tap a free card to play it to its foundation.",
    "- A gap in the **first row** is refilled automatically from the stock. Gaps further down stay empty.",
    "- Tap the **stock** to deal a new row of eight across the bottom. There is no redeal.",
  ],
};
