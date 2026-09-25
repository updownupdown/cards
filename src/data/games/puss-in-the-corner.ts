import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const pussInTheCorner: GameDefinition = {
  path: "/puss-in-the-corner",
  title: "Puss in the Corner",
  tags: [GameTag.FoundationBuilders, GameTag.StockAndWaste],
  rating: {
    complexity: 25,
    difficulty: 40,
    luck: 55,
  },
  thumbnail: "PussInCorner.webp",
  background: GAME_BACKGROUNDS.greenhouse,
  animation: GameAnimations.Pollen,
  gameColorDark: "#2e2418",
  gameColorPale: "#fbeccd",
  cardBack: CardBackColors.Walnut,
  cardDescription:
    "Steer the stock into four corner piles, building by color with one redeal.",
  quickStart: [
    "Build all four foundations by color, from Ace to King.",
    "Tap a waste pile to drop the stock card on it.",
    "When the stock runs out, tap it once to redeal.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards onto the four foundations, built up from Ace to King **by color**.",

    "## Rules",
    "- A foundation accepts the next rank in **either suit of its color**.",
    "- Each stock card must be placed on one of the **four waste piles**, or played to a foundation.",
    "- Any card may go on any waste pile, but cards can never move between waste piles.",
    "- **Double-tap** the stock card or a waste pile's top card to play it to a foundation.",
    "- When the stock is empty, tap it to gather the waste piles in order for **one redeal**.",
  ],
};
