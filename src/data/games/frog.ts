import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const frog: GameDefinition = {
  path: "/frog",
  title: "Frog",
  aliases: ["Toad in the Hole"],
  tags: [GameTag.StockAndWaste],
  rating: {
    complexity: 30,
    difficulty: 45,
    luck: 55,
  },
  thumbnail: "Frog.webp",
  background: GAME_BACKGROUNDS.marsh,
  animation: GameAnimations.Firefly,
  gameColorDark: "#15261b",
  gameColorMid: "#4f8a3c",
  gameColorPale: "#e2f5c6",
  cardDescription:
    "Hop two decks onto eight foundations, sorting the stock across five lily-pad piles.",
  quickStart: [
    "Build foundations up from A to K, regardless of suit.",
    "Tap a waste pile to drop the stock card on it.",
    "Double-tap a stock, reserve or waste card to send it up.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 104 cards onto the eight foundations, each built up from Ace to King **regardless of suit**.",

    "## Rules",
    "- Only the top card of the reserve is available.",
    "- Each stock card must be placed on one of the **five waste piles**, or played to a foundation.",
    "- Any card may go on any waste pile, but cards can never move between waste piles.",
    "- Only the top card of each waste pile can be played.",
    "- **Double-tap** an available card to play it to a foundation. There is no redeal.",
  ],
};
