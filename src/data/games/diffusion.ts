import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const diffusion: GameDefinition = {
  path: "/diffusion",
  title: "Diffusion",
  tags: [GameTag.StockAndWaste],
  rating: {
    complexity: 30,
    difficulty: 30,
    luck: 30,
  },
  thumbnail: "Diffusion.webp",
  background: GAME_BACKGROUNDS.painting,
  animation: GameAnimations.Firefly,
  gameColorDark: "#2f1236",
  gameColorMid: "#726fa8",
  gameColorPale: "#dcf7ff",
  cardDescription:
    "A tableau building game where the ranks above seep into the rows below.",
  quickStart: [
    "Move all cards to the foundations, in any order, by suit.",
    "The top row accepts any card of its suit.",
    "Lower rows only accept a card if a card of the same rank already sits in the row directly above.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards onto the four **foundation rows**, one suit per row.",

    "## Rules",
    "- The first row starts with the **key card**, selected at random each time.",
    "- The **first row** accepts any card of its suit, in any order.",
    "- To **start** a new row, play a card of the **key rank** in a new suit.",
    "- A lower row accepts a card of its suit only if a card of the **same rank already sits in the row directly above**.",
    "- Tap the **stock** to turn a card to the waste; when the stock is empty, tap it to redeal.",
  ],
};
