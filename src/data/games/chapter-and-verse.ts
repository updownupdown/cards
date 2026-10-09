import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const chapterAndVerse: GameDefinition = {
  path: "/chapter-and-verse",
  title: "Chapter & Verse",
  source: {
    title: "Bards & Nobles",
    designer: "Gregg Jewell",
    year: "2024",
    link: "https://boardgamegeek.com/boardgamedesigner/71138/gregg-jewell",
  },
  tags: [GameTag.ModernMechanics, GameTag.ScoringPuzzles],
  rating: { complexity: 45, difficulty: 55, luck: 50 },
  thumbnail: "ChapterAndVerse.webp",
  thumbnailCredit: {
    title: "The Bookworm",
    artistName: "Carl Spitzweg",
    date: "ca. 1850",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Carl_Spitzweg_-_%22The_Bookworm%22.jpg",
  },
  background: GAME_BACKGROUNDS.bookstore,
  animation: GameAnimations.CandleMotes,
  gameColorDark: "#2e2d27",
  gameColorPale: "#f0e9d7",
  gameColorAccent: "#ddc692",
  cardBack: CardBackColors.Bronze,
  quickStart: [
    "Match the customer offers exactly by selecting from available books.",
    "Customer preferences and used books affect book pricing.",
  ],
  howToPlay: [
    "## Objective",
    "- **Win** by completing 12 customer trades, trying to maximize your score.",
    "- **Lose** by being fired when your score reaches 0.",

    "## Customer Offers",
    "For each of the 12 customers, a used book is revealed and a customer offer is made.",
    "- The value of the offer is the sum of the customer value (J = 11, Q = 12, K = 13) and the revealed used book's value.",
    "- Choose shelf books whose total exactly matches that offer.",
    "- **Exclusive offers**: shelf books matching the used book's suit **cost $0**.",
    "- **Limited-time offers:** Aces normally cost $11, but can be offered for $1 (tap to toggle their value).",

    "## Increasing Guild Standing",
    "- After a trade, **selected books matching the customer's suit** are added to your score; the others are discarded.",

    "## Passing",
    "- If you cannot match the offer, you may **pass** and lose score based on the customer's rank: J = 1, Q = 2, K = 3.",

    "## Scoring",
    "Your score determines your end-of-game rating:",
    "- Below 10: No books for you! You are fired!",
    "- 10-11: 🕮",
    "- 12-13: 🕮🕮",
    "- 14-15: 🕮🕮🕮",
    "- 16-17: 🕮🕮🕮🕮",
    "- 18+: 🕮🕮🕮🕮🕮",
  ],
};
