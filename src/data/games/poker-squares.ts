import { GameDefinition, GameTag } from "../games-data";

export const pokerSquares: GameDefinition = {
  path: "/poker-squares",
  tip: {
    default:
      "Place each dealt card carefully; rows and columns score poker hands.",
  },
  title: "Poker Squares",
  thumbnail: "PokerSquares.jpg",
  cardBack: "DefaultCardBack.png",
  background: "felt-grey.jpg",
  cardColorBg: "#263b32",
  cardColorText: "#f0ead6",
  cardDescription:
    "Build ten poker hands from one deck and chase a score of 200.",
  rating: {
    complexity: 35,
    difficulty: 65,
    luck: 75,
  },
  tags: [GameTag.EasyToLearn, GameTag.ModernMechanics],
  about: [
    "Poker Squares rewards planning and probability: every card is committed to the grid forever.",
  ],
  howToPlay: [
    "## Objective",
    "Score at least 200 points by building poker hands in the rows and columns.",
    "## Setup",
    "- A single 52-card deck is shuffled.",
    "- The top card is dealt face up one at a time.",
    "## Playing",
    "- Tap any empty square to place the dealt card there.",
    "- Cards cannot be moved after placement.",
    "- Continue until all 25 squares are filled.",
    "## Scoring",
    "- The five rows and five columns are scored as poker hands.",
    "- American scoring awards 100 for a royal flush, 75 straight flush, 50 four of a kind, 25 full house, 20 flush, 15 straight, 10 three of a kind, 5 two pair, and 2 one pair.",
    "## Winning",
    "Reach 200 points or more.",
  ],
};
