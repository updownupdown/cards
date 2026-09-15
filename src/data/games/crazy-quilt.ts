import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const crazyQuilt: GameDefinition = {
  path: "/crazy-quilt",
  title: "Crazy Quilt",
  aliases: ["Japanese Rug", "Indian Carpet"],
  tags: [GameTag.SpatialControl, GameTag.StockAndWaste],
  rating: {
    complexity: 40,
    difficulty: 55,
    luck: 45,
  },
  thumbnail: "DefaultThumbnail.webp",
  background: GAME_BACKGROUNDS.cozyCabin,
  animation: GameAnimations.Snow,
  gameColorDark: "#2c1d26",
  gameColorMid: "#b0506e",
  gameColorPale: "#fbe3ea",
  cardDescription:
    "Unpick a quilt of upright and sideways cards, one free end at a time.",
  quickStart: [
    "A quilt card is free when one of its short ends is uncovered.",
    "Aces build up and Kings build down, by suit.",
    "A free card with no foundation packs onto the waste, up or down in suit.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 104 cards onto the eight foundations.",

    "## Foundations",
    "- One **Ace** and one **King** of each suit start the foundations.",
    "- Aces build **up** by suit to Kings; Kings build **down** by suit to Aces.",

    "## Rules",
    "- 64 cards form the **quilt**, alternating upright and sideways like a chessboard.",
    "- A quilt card is **free** when at least one of its **short ends** is not touching another card.",
    "- Tap a free card to play it to a foundation or, failing that, onto the **waste** if it is one rank above or below the top waste card in the same suit.",
    "- Gaps in the quilt are never refilled.",
    "- Tap the **stock** to turn one card onto the waste. Once it runs out, tap it to turn the waste over **once**, without shuffling.",
  ],
};
