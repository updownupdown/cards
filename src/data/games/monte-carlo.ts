import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";

export const monteCarlo: GameDefinition = {
  path: "/monte-carlo",
  title: "Monte Carlo",
  tags: [GameTag.EasyToLearn, GameTag.PairMatching],
  rating: {
    complexity: 10,
    difficulty: 20,
    luck: 35,
  },
  thumbnail: "MonteCarlo.jpg",
  background: GAME_BACKGROUNDS.monteCarlo,
  cardBack: "MonteCarlo.jpg",
  gameColorDark: "#152635",
  gameColorPale: "#fffce5",
  cardDescription: "Match adjacent pairs of equal rank to clear the grid.",
  quickStart: [
    "Tap adjacent cards of equal ranks to flip them.",
    "Consolidate the grid to unlock new pairs.",
  ],
  howToPlay: [
    "## Objective",
    "Remove all 52 cards by pairing equal ranks until the grid is empty.",

    "## Playing",
    "- Remove two cards of the **same rank** when they are **adjacent** horizontally, vertically, or diagonally.",
    "- When you run out of pairs, **consolidate** the grid. The remaining cards shift to close the gaps, and new cards are dealt from the stock to fill the gaps.",
    "- Consolidation reorders cards, so new matching pairs may be unlocked.",
  ],
};
