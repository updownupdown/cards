import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const devilsGrip: GameDefinition = {
  path: "/devils-grip",
  title: "Devil's Grip",
  tags: [
    GameTag.ScoringPuzzles,
    GameTag.SequenceBuilding,
    GameTag.StockAndWaste,
  ],
  rating: {
    complexity: 55,
    difficulty: 85,
    luck: 45,
  },
  thumbnail: "DevilsGrip.webp",
  background: GAME_BACKGROUNDS.abandonedSand,
  animation: GameAnimations.Embers,
  gameColorDark: "#4e211e",
  gameColorMid: "#801b14",
  gameColorPale: "#ffecd6",
  cardDescription:
    "Build 24 same-suit piles upward by threes in a three-row grid.",
  quickStart: [
    "Build same-suit sequences: 2-5-8-J (top row), 3-6-9-Q (middle row), and 4-7-10-K (bottom row).",
    "Move cards or stacks to create sequences or to swap their position.",
    "Tap the draw deck to deal three cards to the waste.",
    "The top waste card can be moved on a valid stack.",
  ],
  howToPlay: [
    "## Objective",
    "Move all **96 cards** into as many piles of same-suit sequences as possible. Minimize the number of cards left outside the grid.",

    "## Grid",
    "Build sequences by placing cards or stacks on the next lower card of the same suit.",
    "- The top row builds by suit: **2, 5, 8, J**.",
    "- The middle row builds by suit: **3, 6, 9, Q**.",
    "- The bottom row builds by suit: **4, 7, 10, K**.",
    "Swap two occupied grid piles to rearrange them.",
    "You can create stacks without the base number (e.g. 5-8), and complete the sequence later.",
    "When building leaves an empty grid space, it is immediately filled from Draw while cards remain.",

    "## Draw and waste",
    "Tap the Draw deck to turn up three cards onto the waste.",
    "- Only the top waste card can be played.",
    "- Redeals are unlimited.",

    "## Scoring",
    "The game ends when no more cards can be played.",
    "The number of cards left outside the grid is your score:",
    "- **10 or fewer**: good",
    "- **5 or fewer**: excellent",
    "- **2 or fewer**: brilliant",
  ],
};
