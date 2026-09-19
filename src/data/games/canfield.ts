import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations/types";

export const canfield: GameDefinition = {
  path: "/canfield",
  title: "Canfield",
  tags: [GameTag.StockAndWaste],
  rating: {
    complexity: 40,
    difficulty: 65,
    luck: 55,
  },
  thumbnail: "Canfield.webp",
  background: GAME_BACKGROUNDS.cozyRoom3,
  animation: GameAnimations.Dust,
  gameColorDark: "#311a1e",
  gameColorMid: "#8f4d4b",
  gameColorPale: "#E4F6FF",
  cardDescription:
    "Build suit foundations from a random base rank, fed by a 13-card reserve.",
  quickStart: [
    "Build foundations up by suit.",
    "Build tableau columns down by alternating color.",
    "Empties use reserve.",
  ],
  howToPlay: [
    "## Objective",
    "Send all 52 cards to their foundations.",

    "## Foundations",
    "- Build foundations **up by suit** from the base rank.",
    "- Foundations wrap past the King back to the Ace, for example: 10, J, Q, K, A, 2, 3, etc.",

    "## Tableau",
    "- Build tableau columns down in **alternating colors** (wrapping from Ace to King).",
    "- Move single cards or an ordered group of cards between columns.",
    "- When a tableau column empties, it is refilled from the **reserve** (or, once the reserve is gone, by any card).",

    "## Stock",
    "Turn cards from the stock (one or three at a time, depending on your settings) to the waste. You may redeal as often as you like.",
  ],
};
