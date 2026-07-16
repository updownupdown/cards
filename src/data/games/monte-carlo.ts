import { GameDefinition, GameTag } from "../games-data";

export const monteCarlo: GameDefinition = {
  path: "/monte-carlo",
  tip: {
    default: {
      text: "Tap adjacent equal ranks to clear; consolidate for new pairs.",
    },
  },
  title: "Monte Carlo",
  thumbnail: "MonteCarlo.jpg",
  cardBack: "MonteCarlo.png",
  background: "felt-dark-blue.jpg",
  cardColorBg: "#152635",
  cardColorText: "#b1dada",
  cardDescription: "Match adjacent pairs of equal rank to clear a 5×5 grid.",
  stats: {
    complexity: 10,
    difficulty: 20,
    luck: 35,
  },
  tags: [GameTag.ClassicSolitaire, GameTag.EasyToLearn],
  about: [
    "Monte Carlo is a gentle matching patience played on a 5×5 grid.",
    "Regular consolidation brings distant cards together, opening up fresh pairs.",
  ],
  howToPlay: [
    "## Objective",
    "Remove all 52 cards by pairing equal ranks until the grid is empty.",
    "## Setup",
    "- Deal 25 cards into a **5×5 grid**.",
    "- The remaining 27 cards stay in the **stock**.",
    "## Playing",
    "- Remove two cards of the **same rank** when they are **adjacent** horizontally, vertically, or diagonally (for example a {7H} next to a {7S}).",
    "- When you run out of pairs, **consolidate**: the remaining cards shift to close the gaps, then new cards are dealt from the stock to refill the grid to 25.",
    "- Consolidation reorders cards, so new neighbours (and new pairs) appear.",
    "## Winning",
    "You win when every card has been removed.",
  ],
};
