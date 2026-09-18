import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const chapterAndVerse: GameDefinition = {
  path: "/chapter-and-verse",
  title: "Chapter & Verse",
  tags: [GameTag.ScoringPuzzles, GameTag.ModernMechanics],
  rating: { complexity: 45, difficulty: 55, luck: 50 },
  thumbnail: "ChapterAndVerse.webp",
  background: GAME_BACKGROUNDS.bookstore,
  animation: GameAnimations.Dust,
  gameColorDark: "#2e2d27",
  gameColorMid: "#796d49",
  gameColorPale: "#f0e9d7",
  cardDescription:
    "Match customer offers with available books and offers to maximize your score.",
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
