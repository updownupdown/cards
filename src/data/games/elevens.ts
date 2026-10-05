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
  thumbnail: "Pyramid.webp",
  background: GAME_BACKGROUNDS.sahara,
  animation: GameAnimations.Sand,
  gameColorDark: "#251703",
  gameColorPale: "#FFEACC",
  gameColorAccent: "#e9c27a",
  cardBack: CardBackColors.Walnut,
  quickStart: [
    "Remove pairs that total 11, or a Jack, Queen and King together.",
  ],
  howToPlay: [
    "## Objective",
    "Clear the whole deck by removing pairs of cards that total **11**, or a royal **Jack-Queen-King** triplet.",

    "## Deal",
    "- Nine cards are dealt face up in a 3x3 grid.",
    "- The rest of the deck forms the stock.",

    "## Card values",
    "- Ace is 1 and number cards are worth their face value.",
    "- Jacks, Queens and Kings have no value and only go out together.",

    "## Playing",
    "- Select two cards that total 11: Ace and 10, 2 and 9, 3 and 8, 4 and 7, or 5 and 6.",
    "- Or select one Jack, one Queen and one King, in any order.",
    "- Removed cards are replaced at once from the stock.",

    "## Winning and losing",
    "- You win when the grid and the stock are both empty.",
    "- You lose when no pair or royal triplet can be made and cards remain.",
  ],
};
