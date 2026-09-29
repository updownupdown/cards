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
    difficulty: 70,
    luck: 60,
  },
  thumbnail: "MonteCarlo.webp",
  thumbnailCredit: {
    title: "Study for The Terrace, Monte Carlo",
    artistName: "Theodore Roussel",
    date: "1905–06",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/210962",
  },
  background: GAME_BACKGROUNDS.monteCarlo,
  animation: GameAnimations.Birds,
  gameColorDark: "#152635",
  gameColorPale: "#fffce5",
  gameColorAccent: "#df90a2",
  cardBack: CardBackColors.Burgundy,
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
