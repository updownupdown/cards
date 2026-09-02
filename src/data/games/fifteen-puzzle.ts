import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const fifteenPuzzle: GameDefinition = {
  path: "/fifteen-puzzle",
  title: "Fifteen Puzzle",
  tags: [GameTag.EasyToLearn, GameTag.SpatialControl],
  rating: { complexity: 20, difficulty: 30, luck: 0 },
  background: GAME_BACKGROUNDS.bookstore,
  animation: GameAnimations.Dust,
  gameColorDark: "#293b32",
  gameColorPale: "#f6edcf",
  cardDescription:
    "Re-order the cards in a 4x4 grid by sliding cards one at a time.",
  quickStart: [
    "Reorder the cards from Ace to 4 in each row: Hearts, Clubs, Diamonds, then Spades.",
    "Tap a card beside the empty space to slide it.",
  ],
  howToPlay: [
    "## Objective",
    "Arrange the rows so that each row is Ace, 2, 3, 4, by suit:",
    "- **Hearts**",
    "- **Clubs**",
    "- **Diamonds**",
    "- **Spades** (does not have a 4 card)",

    "## Gameplay",
    "- Tap a card above, below, left, or right of the empty space to slide it into the empty space.",
    "- Cards will turn green when they are in their correct position.",
    "- Every shuffled puzzle is produced using legal moves and is solvable.",
  ],
};
