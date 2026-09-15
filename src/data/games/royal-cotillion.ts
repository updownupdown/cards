import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const royalCotillion: GameDefinition = {
  path: "/royal-cotillion",
  title: "Royal Cotillion",
  tags: [GameTag.StockAndWaste, GameTag.SequenceBuilding],
  rating: {
    complexity: 45,
    difficulty: 50,
    luck: 75,
  },
  thumbnail: "DefaultThumbnail.webp",
  background: GAME_BACKGROUNDS.alhambra,
  animation: GameAnimations.ManaDust,
  gameColorDark: "#211a36",
  gameColorMid: "#7a5fb0",
  gameColorPale: "#f1e6ff",
  cardDescription:
    "Two decks dance up the foundations in steps of two, from Aces and from Twos.",
  quickStart: [
    "Aces build A, 3, 5... K, 2, 4... Q by suit.",
    "Twos build 2, 4, 6... Q, A, 3... K by suit.",
    "Tap an empty right-hand space to fill it from the waste or stock.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 104 cards onto the eight foundations.",

    "## Foundations",
    "- One **Ace** and one **Two** of each suit start the foundations.",
    "- Every foundation builds **up by suit in steps of two**, wrapping around after the King.",
    "- Ace foundations: A, 3, 5, 7, 9, J, K, 2, 4, 6, 8, 10, Q.",
    "- Two foundations: 2, 4, 6, 8, 10, Q, A, 3, 5, 7, 9, J, K.",

    "## Rules",
    "- On the **left**, four columns of three cards: only the bottom card of each is available, and spaces are never refilled.",
    "- On the **right**, sixteen cards are all available.",
    "- Tap an empty right-hand space to fill it with the top **waste** card, or from the **stock** if the waste is empty.",
    "- Tap the **stock** to turn one card onto the waste. There is no redeal.",
  ],
};
