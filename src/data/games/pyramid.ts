import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
// import { GameAnimations } from "@/animations";

export const pyramid: GameDefinition = {
  path: "/pyramid",
  title: "Pyramid",
  tags: [GameTag.ClassicSolitaire, GameTag.EasyToLearn],
  rating: {
    complexity: 15,
    difficulty: 65,
    luck: 65,
  },
  thumbnail: "Pyramid.jpg",
  background: GAME_BACKGROUNDS.sahara,
  // animation: GameAnimations.Sand,
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
    "## Setup",
    "- Deal 28 cards into a pyramid of 7 rows, each card overlapping the two below it.",
    "- The remaining 24 cards form the **stock**.",
    "## Card values",
    "- Ace = 1, and number cards are worth their face value.",
    "- Jack = 11, Queen = 12, King = 13.",
    "## Playing",
    "- A card is available only when it is **fully uncovered**, with nothing overlapping it.",
    "- Remove two available cards whose values total 13 (for example {9H} + {4S}, or {AD} + {QC}).",
    "- A **King** totals 13 by itself, so it is removed alone.",
    "- Turn cards from the stock to the waste; the top waste card can be paired with any available card.",
    "## Winning",
    "You win when the whole pyramid has been cleared.",
  ],
  about: [
    "Pyramid is a quick adding-up patience built on a 28-card pyramid.",
    "The challenge is timing: uncover the cards you need before the stock runs dry.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
    creationDate: "First documented in 1949",
  },
};
