import { GameAnimations } from "@/animations";
import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";

export const elevens: GameDefinition = {
  path: "/elevens",
  title: "Elevens",
  tags: [GameTag.PairMatching, GameTag.StockAndWaste],
  rating: {
    complexity: 10,
    difficulty: 55,
    luck: 80,
  },
  thumbnail: "Elevens.webp",
  thumbnailCredit: {
    title: "Allegory of Arithmetic",
    artistName: "Laurent de La Hyre",
    date: "1650",
    sourceName: "The Walters Art Museum",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Laurent_de_La_Hyre_-_Allegory_of_Arithmetic_-_Walters_371917.jpg",
  },
  background: GAME_BACKGROUNDS.sahara,
  animation: GameAnimations.Sand,
  gameColorDark: "#251703",
  gameColorPale: "#FFEACC",
  gameColorAccent: "#e9c27a",
  cardBack: CardBackColors.Walnut,
  quickStart: [
    "Remove pairs that total 11.",
    "Jack, Queen and King go out together.",
  ],
  howToPlay: [
    "## Goal",
    "Clear the grid and the stock.",
    "## Rules",
    "| Playable | Every card in the grid |",
    "| Remove | Pairs that total 11, or a Jack, Queen and King |",
    "| Values | Ace 1 |",
    "| Stock | Refills each gap at once |",
    "| Redeals | None |",
    "## Special rules",
    "- You lose when no pair or royal trio can be made.",
    "## Variants",
    "- **Grid size**: 5 × 3 on Easy, 4 × 3 on Medium and 3 × 3 on Hard (the default).",
  ],
};
