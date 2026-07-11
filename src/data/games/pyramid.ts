import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const pyramid: GameDefinition = {
  path: "/pyramid",
  title: "Pyramid",
  thumbnail: DEFAULT_GAME_THUMBNAIL,
  cardColorBg: "#1d170f",
  cardColorText: "#FFEACC",
  background: "medieval-blocks.jpg",
  cardDescription:
    "Clear the pyramid by removing pairs of cards that add up to 13.",
  stats: {
    complexity: 15,
    difficulty: 30,
    luck: 65,
  },
  tags: [GameTag.ClassicSolitaire],
  briefRules: [
    "Remove pairs of exposed cards that total 13.",
    "Kings are worth 13 and are removed on their own.",
    "A card is only playable once nothing covers it.",
    "Draw from the stock to find the matches you need.",
  ],
  about: [
    "Pyramid is a quick adding-up patience built on a 28-card pyramid.",
    "The challenge is timing: uncover the cards you need before the stock runs dry.",
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
};
