import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const windmill: GameDefinition = {
  path: "/windmill",
  title: "Windmill",
  tags: [
    GameTag.DoubleDeckers,
    GameTag.SequenceBuilding,
    GameTag.StockAndWaste,
  ],
  rating: {
    complexity: 35,
    difficulty: 45,
    luck: 65,
  },
  thumbnail: "Windmill.webp",
  thumbnailCredit: {
    title: "Landscape with a Windmill",
    artistName: "Jacob van Ruisdael",
    date: "1646",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://clevelandart.org/art/1967.19",
  },
  background: GAME_BACKGROUNDS.dirtRoad,
  animation: GameAnimations.Birds,
  gameColorDark: "#1e2a1f",
  gameColorPale: "#eef5d6",
  cardBack: CardBackColors.Olive,
  cardDescription:
    "Feed four full runs into the windmill's hub while its corners count down from Kings.",
  quickStart: [
    "Move all 104 cards to the foundations.",
    "Build the center from Ace to King four times, and the corners from King to Ace, regardless of suit.",
    "Sails refill from the waste, then the stock.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 104 cards onto the foundations.",

    "## Foundations",
    "- Build the **center up regardless of suit**, running from Ace to King four times over.",
    "- Build each **corner down regardless of suit**, from King to Ace.",

    "## Rules",
    "- The eight **sails** and the top **waste** card are available.",
    "- An empty sail is refilled automatically from the waste, or from the stock if the waste is empty.",
    "- The top card of a corner may move to the center, but the **next** card played to the center must then come from a sail or the waste.",
    "- When a card could go to more than one place, tap it and then tap where it should go.",
    "- Tap the **stock** to turn one card onto the waste. There is no redeal.",
  ],
};
