import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

export const tripleStack: GameDefinition = {
  path: "/triple-stack",
  title: "Triple Stack",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 20,
    difficulty: 70,
    luck: 40,
  },
  thumbnail: "TripleStack.webp",
  thumbnailCredit: {
    title: "A Country Grocer",
    artistName: "Hans Smidth",
    date: "1908 - 1909",
    sourceName: "Artvee",
    sourceLink: "https://artvee.com/dl/a-country-grocer/",
  },
  gameColorDark: "#102524",
  gameColorPale: "#b0eee9",
  cardBack: CardBackColors.Teal,
  quickStart: [
    "Select 3 cards with equally spaced ranks (ranks wrap from A to K).",
    "Better sandwiches (same suit/color) refill more cards.",
    "Empty the deck to win.",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by emptying your stock of ingredients (deck) by using them to serve sandwiches.",
    "**Lose** when no valid sandwich remains while cards are still in the deck.",

    "## Serving",
    "- Select three cards with equally spaced rank values. Aces, Jacks, Queens, and Kings are worth 1, 11, 12, and 13.",
    "- Ranks wrap between King and Ace, so for example, 9, Queen, and 2 makes a valid sandwich.",

    "## Refill",
    "Your hand is refilled after serving a sandwich. The number of cards refilled depends on the quality of the sandwich:",
    "- Four cards for same-suit sandwiches",
    "- Three cards for same-color sandwiches (across two suits)",
    "- Two cards for other sandwiches",
  ],

  // howToPlay: ["Lorem ipsum"],
};
