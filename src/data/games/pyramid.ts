import { GameAnimations } from "@/animations";
import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";

export const pyramid: GameDefinition = {
  path: "/pyramid",
  title: "Pyramid",
  tags: [GameTag.PairMatching, GameTag.StockAndWaste],
  rating: {
    complexity: 15,
    difficulty: 70,
    luck: 65,
  },
  thumbnail: "Pyramid.webp",
  thumbnailCredit: {
    title: "The Great Sphinx, Pyramids of Gizeh, July 17th, 1839",
    artistName: "David Roberts",
    date: "1846-1849",
    sourceName: "Artvee",
    sourceLink:
      "https://artvee.com/dl/the-great-sphinx-pyramids-of-gizeh-giza-july-17th-1839/",
  },
  background: GAME_BACKGROUNDS.sahara,
  animation: GameAnimations.Sand,
  gameColorDark: "#251703",
  gameColorPale: "#FFEACC",
  gameColorAccent: "#e9c27a",
  cardBack: CardBackColors.Walnut,
  quickStart: [
    "Remove pairs that total 13.",
    "Kings go out alone.",
    "Draw when stuck.",
  ],
  howToPlay: [
    "## Goal",
    "Clear all 28 cards of the pyramid.",
    "## Rules",
    "| Playable | Uncovered cards, and the top waste card |",
    "| Remove | Pairs that total 13, or a King alone |",
    "| Values | Ace 1, Jack 11, Queen 12 |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "## Variants",
    "- **Easy**: you may select a second card if only the first selected card covers it.",
  ],
};
