import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const windmill: GameDefinition = {
  path: "/windmill",
  title: "Windmill",
  tags: [GameTag.StockAndWaste, GameTag.SequenceBuilding],
  rating: {
    complexity: 35,
    difficulty: 45,
    luck: 55,
  },
  thumbnail: "Windmill.webp",
  background: GAME_BACKGROUNDS.dirtRoad,
  animation: GameAnimations.Birds,
  gameColorDark: "#1e2a1f",
  gameColorMid: "#7a9a4a",
  gameColorPale: "#eef5d6",
  cardDescription:
    "Feed four full runs into the windmill's hub while its corners count down from Kings.",
  quickStart: [
    "The center builds up from A to K four times, any suit.",
    "Corners start with a King and build down to A, any suit.",
    "Sails refill from the waste, then the stock.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 104 cards onto the foundations.",

    "## Foundations",
    "- The **center** starts with an Ace and builds **up regardless of suit**, running from Ace to King four times over.",
    "- Each **corner** starts with any **King** and builds **down regardless of suit** to an Ace.",

    "## Rules",
    "- The eight **sails** and the top **waste** card are available.",
    "- An empty sail is refilled at once from the waste, or from the stock if the waste is empty.",
    "- The top card of a corner may move to the center, but the **next** card played to the center must then come from a sail or the waste.",
    "- When a card could go to more than one place, tap it and then tap where it should go.",
    "- Tap the **stock** to turn one card onto the waste. There is no redeal.",
  ],
};
