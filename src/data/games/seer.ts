import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const seer: GameDefinition = {
  path: "/seer",
  title: "Seer",
  tags: [GameTag.EasyToLearn],
  rating: {
    complexity: 35,
    difficulty: 55,
    luck: 65,
  },
  background: GAME_BACKGROUNDS.nightSky,
  animation: GameAnimations.Stars,
  thumbnail: "Seer.webp",
  gameColorDark: "#1b2135",
  gameColorMid: "#4f8ea3",
  gameColorPale: "#d2d3c0",
  cardDescription:
    "Read a short deck, complete eight predictions, and keep stones from blocking the board.",
  quickStart: [
    "Choose a prediction space to reveal the top card.",
    "Matches complete spaces and free neighboring stones; misses add stones.",
  ],
  howToPlay: [
    "## Objective",
    "Complete all eight predictions before the 24-card deck runs out or every space is blocked.",
    "## Setup",
    "- Use A through 6 in all four suits.",
    "- The shuffled cards form a face-down deck. Tap it to view or hide its bottom card.",
    "## Predictions",
    "- Choose Red, Red odd / Black even, Even, Diamonds / Hearts, Spades / Clubs, Odd, Black odd / Red even, or Black.",
    "- On a match, place the revealed card on that space.",
    "- On a miss, place the revealed card face up on the table, then place the next card face down on the prediction as a stone.",
    "- A prediction with three stones is blocked.",
    "## Freeing Stones",
    "- A success frees one exposed stone from each neighboring space: diagonally too on Easy, orthogonally on Normal, or one chosen orthogonal neighbor on Hard.",
    "- Choose whether all stones freed by that success are revealed to the table or returned face down under the deck.",
    "- Stones covered by a successful card are trapped.",
    "## Replaying",
    "- Completed predictions may be chosen again to free more stones.",
    "- A failed replay stops counting as complete until its exposed stones are removed or it succeeds again.",
  ],
};
