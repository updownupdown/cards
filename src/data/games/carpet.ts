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
  gameColorAccent: "#e7937a",
  cardBack: CardBackColors.Terracotta,
  quickStart: [
    "Every carpet card is playable.",
    "Nothing builds in the carpet.",
    "Gaps refill from the waste.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit; the Aces start there |",
    "| Playable | Every carpet card, and the top waste card |",
    "| Build | None |",
    "| Empty space | Refills from the waste, then the stock |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "| Cards | 52 |",
  ],
};
