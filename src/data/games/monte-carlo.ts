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
    "Remove two touching cards of the same rank.",
    "Consolidate to close the gaps and deal more.",
  ],
  howToPlay: [
    "## Goal",
    "Remove all 52 cards.",
    "## Rules",
    "| Playable | Every card in the grid |",
    "| Remove | Two cards of the same rank that touch, diagonally too |",
    "| Stock | Consolidate: the cards shift to close the gaps, then the stock refills them |",
  ],
};
