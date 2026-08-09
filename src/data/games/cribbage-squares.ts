import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const cribbageSquares: GameDefinition = {
  path: "/cribbage-squares",
  title: "Cribbage Squares",
  tags: [
    GameTag.GridPlacement,
    GameTag.PokerAndCribbage,
    GameTag.ScoringPuzzles,
  ],
  rating: {
    complexity: 40,
    difficulty: 60,
    luck: 75,
  },
  thumbnail: "CribbageSquares.jpg",
  background: GAME_BACKGROUNDS.cozyCabin,
  animation: GameAnimations.Snow,
  gameColorDark: "#15221c",
  gameColorPale: "#d6f0ec",
  cardDescription:
    "Build sixteen connected cards, then score every row and column with a starter card.",
  quickStart: [
    "Place each card beside each other in the grid.",
    'A "starter" card is revealed after all sixteen are placed.',
    "Rows and columns score as cribbage hands.",
  ],
  howToPlay: [
    "## Objective",
    "Score at least 61 points from the four rows and four columns, each of which is scored as a cribbage hand, using the starter card.",

    "## Gameplay",
    "- Each later card must touch a card already in the grid (horizontally, vertically, or diagonally).",
    "- Cards cannot be moved after placement.",
    "- After the sixteen cards are placed, a seventeenth card becomes the starter.",

    "## Scoring",
    "Each row and column is scored as a cribbage hand (with the starter):",
    "- **Fifteens (2 pts):**",
    "-- Two or more cards that total 15. Face cards are worth 10, and Aces are 1.",
    "- **Pairs (2, 6, or 12 pts):**",
    "-- Pair (2 cards of same rank) = 2 pts",
    "-- Pair royal / 3 of a kind (3 cards) = 6 pts",
    "-- Double pair royal / 4 of a kind (4 cards) = 12 pts.",
    "- **Runs (1 pt per card):**",
    "-- A sequence of three or more consecutive cards (regardless of suit) scores 1 point per card in the run.",
    "- **Flush (4 or 5 pts):**",
    "-- Four cards of the same suit = 4 pts.",
    "-- If the starter card matches that same suit = 5 pts.",
    "- **His Nobs (1 pt):**",
    "-- If a row or column contains a Jack that matches the suit of the starter card, it scores 1 extra point.",
    "- **His Heels (2 pts):**",
    "-- If the starter is a Jack, his heels adds two points to the total score.",
  ],
};
