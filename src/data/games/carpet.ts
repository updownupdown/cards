import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const carpet: GameDefinition = {
  path: "/carpet",
  title: "Carpet",
  tags: [GameTag.EasyToLearn, GameTag.StockAndWaste],
  rating: {
    complexity: 15,
    difficulty: 25,
    luck: 70,
  },
  thumbnail: "Carpet.webp",
  background: GAME_BACKGROUNDS.castleIndoors,
  animation: GameAnimations.Dust,
  gameColorDark: "#2b1a14",
  gameColorMid: "#9a4b2f",
  gameColorPale: "#f6dcc0",
  cardDescription:
    "Lift a twenty-card carpet onto the foundations as the stock patches every gap.",
  quickStart: [
    "Build foundations up by suit from the Aces.",
    "Tap a carpet or waste card to send it up.",
    "Gaps in the carpet refill from the waste, then the stock.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards onto the four foundations, built up by suit from Ace to King.",

    "## Rules",
    "- The four **Aces** start on the foundations; twenty cards form the **carpet**.",
    "- Any carpet card, and the top waste card, can be played to its foundation.",
    "- A gap in the carpet is filled at once with the top **waste** card, or from the **stock** if the waste is empty.",
    "- Tap the **stock** to turn one card onto the waste. There is no redeal.",
  ],
};
