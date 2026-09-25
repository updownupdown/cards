import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const monteCarlo: GameDefinition = {
  path: "/monte-carlo",
  title: "Monte Carlo",
  tags: [GameTag.PairMatching],
  rating: {
    complexity: 10,
    difficulty: 20,
    luck: 55,
  },
  thumbnail: "MonteCarlo.webp",
  background: GAME_BACKGROUNDS.monteCarlo,
  animation: GameAnimations.Birds,
  gameColorDark: "#152635",
  gameColorPale: "#fffce5",
  cardBack: CardBackColors.Burgundy,
  cardDescription: "Match adjacent pairs of equal rank to clear the grid.",
  quickStart: [
    "Tap adjacent cards of equal rank to remove them.",
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
