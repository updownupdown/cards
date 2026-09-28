import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const carpet: GameDefinition = {
  path: "/carpet",
  title: "Carpet",
  tags: [GameTag.FoundationBuilders, GameTag.StockAndWaste],
  rating: {
    complexity: 10,
    difficulty: 65,
    luck: 90,
  },
  thumbnail: "Carpet.webp",
  thumbnailCredit: {
    title: "Royal Carpet with Silk and Metal Thread",
    artistName: "Unknown Safavid artist",
    date: "1600–1625",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1926.533",
  },
  background: GAME_BACKGROUNDS.castleIndoors,
  animation: GameAnimations.Dust,
  gameColorDark: "#2b1a14",
  gameColorPale: "#f6dcc0",
  cardBack: CardBackColors.Terracotta,
  quickStart: [
    "Build foundations up by suit from the Aces.",
    "Tap a carpet or waste card to send it up.",
    "Gaps in the carpet refill from the waste, then the stock.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards onto the four foundations, built up by suit from Ace to King.",

    "## Rules",
    "- Any carpet card, and the top waste card, can be played to a foundation.",
    "- A gap in the carpet is automatically filled with the top **waste** card, or from the **stock** if the waste is empty.",
    "- Tap the **stock** to turn one card onto the waste.",
    "- **There is no redeal**.",
  ],
};
