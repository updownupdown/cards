import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const osmosis: GameDefinition = {
  path: "/osmosis",
  title: "Osmosis",
  aliases: ["Treasure Trove", "Peek"],
  thumbnailCredit: {
    title: "An Alchemist in his Laboratory",
    artistName: "Thomas Wijck",
    date: "1631–77",
    sourceName: "SMK – National Gallery of Denmark",
    sourceLink: "https://open.smk.dk/artwork/image/KMSst14",
  },
  tags: [GameTag.FoundationBuilders, GameTag.StockAndWaste],
  rating: {
    complexity: 25,
    difficulty: 45,
    luck: 55,
  },
  thumbnail: "Osmosis.webp",
  background: GAME_BACKGROUNDS.waterLogs,
  animation: GameAnimations.Mist,
  gameColorDark: "#1f3b3a",
  gameColorPale: "#d6f1ea",
  gameColorAccent: "#6fd9c0",
  cardBack: CardBackColors.Teal,
  quickStart: [
    "Each foundation row takes its suit in any order, but a card can only join a row once its rank is in the row above.",
    "The first card dealt sets the rank every other row must start with.",
    "Play from the four reserves and the waste. Turn the stock one card at a time, as often as you like.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards onto the four foundation rows.",

    "## The Rows",
    "- The first card dealt starts the first row. Each row holds one suit and takes its cards in any order, except that a card can only join a row once the same rank already lies in the row above it, as if it had seeped through.",
    "- A new row below the others starts only with the same rank as the first row's first card.",

    "## Playing",
    "- The four reserves are face up; play their top cards. Tap the stock to turn a card onto the waste, and play its top card.",
    "- When the stock runs out, tap it to turn the waste over and go through it again, as often as you like.",
    "- The game is lost when a whole pass through the stock turns up nothing to play.",
  ],
};
