import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const pokerSquares: GameDefinition = {
  path: "/poker-squares",
  title: "Poker Squares",
  tags: [GameTag.EasyToLearn, GameTag.ModernMechanics],
  rating: {
    complexity: 35,
    difficulty: 65,
    luck: 75,
  },
  thumbnail: "PokerSquares.jpg",
  background: GAME_BACKGROUNDS.casino,
  cardBack: "DefaultCardBack.png",
  cardColorBg: "#263b32",
  cardColorText: "#f0ead6",
  cardDescription:
    "Build ten poker hands from one deck and chase a score of 200.",
  quickStart: [
    "Place each dealt card carefully; rows and columns score poker hands.",
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
  about: [
    "Poker Squares rewards planning and probability: every card is committed to the grid forever.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
  },
};
