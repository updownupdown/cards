import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";

export const pyramid: GameDefinition = {
  path: "/pyramid",
  title: "Pyramid",
  tags: [GameTag.EasyToLearn, GameTag.PairMatching, GameTag.StockAndWaste],
  rating: {
    complexity: 15,
    difficulty: 65,
    luck: 65,
  },
  thumbnail: "Pyramid.jpg",
  background: GAME_BACKGROUNDS.sahara,
  gameColorDark: "#251703",
  gameColorPale: "#FFEACC",
  cardDescription:
    "Clear the pyramid by removing pairs of cards that add up to 13.",
  quickStart: [
    "Remove Kings, or exposed pairs totaling 13. Draw for more matches.",
  ],
  howToPlay: [
    "## Objective",
    "Dismantle the entire **pyramid** of 28 cards by removing them in pairs that sum to **13**.",

    "## Playing",
    "- A card is available only when it is **fully uncovered**, with nothing overlapping it.",
    "- Remove two available cards whose values total 13 (Aces are worth 1).",
    "- A King totals 13 by itself, so it is removed alone.",
    "- When stuck, turn cards from the stock to the waste; the top waste card can be paired with any available card.",
  ],
};
