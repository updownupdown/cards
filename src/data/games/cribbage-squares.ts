import { GameDefinition, GameTag } from "../games-data";

export const cribbageSquares: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/cribbage-squares",
  tip: {
    default:
      "Place each card beside the connected grid; rows and columns score cribbage hands.",
  },
  title: "Cribbage Squares",
  thumbnail: "CribbageSquares.jpg",
  cardBack: "DefaultCardBack.png",
  background: "felt-grey.jpg",
  cardColorBg: "#263b32",
  cardColorText: "#f0ead6",
  cardDescription:
    "Build sixteen connected cards, then score every row and column with a starter card.",
  rating: {
    complexity: 40,
    difficulty: 60,
    luck: 75,
  },
  tags: [GameTag.EasyToLearn, GameTag.ModernMechanics],
  about: [
    "Cribbage Squares combines a spatial placement puzzle with the many scoring combinations of cribbage.",
  ],
  byLine: "Author unknown; appeared in the 1950s",
  howToPlay: [
    "## Objective",
    "Score at least 61 points from the four rows and four columns.",
    "## Setup",
    "- Cards are dealt one at a time from a shuffled deck.",
    "- The first card may go anywhere in the 4 x 4 grid.",
    "## Playing",
    "- Each later card must touch a card already in the grid horizontally, vertically, or diagonally.",
    "- Cards cannot be moved after placement.",
    "- After sixteen cards are placed, a seventeenth card becomes the starter.",
    "## Scoring",
    "- Each row and column is scored as a cribbage hand with the starter: fifteens, pairs, runs, flushes, and his nobs.",
    "- If the starter is a Jack, his heels adds two points to the total.",
    "## Winning",
    "Reach 61 points or more.",
  ],
};
