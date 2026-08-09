import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const theSandwichGuy: GameDefinition = {
  path: "/the-sandwich-guy",
  title: "The Sandwich Guy",
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  rating: {
    complexity: 20,
    difficulty: 70,
    luck: 40,
  },
  thumbnail: "SandwichGuy.jpg",
  background: GAME_BACKGROUNDS.london,
  cardBack: "SandwichGuy.jpg",
  gameColorDark: "#102524",
  gameColorPale: "#b0eee9",
  cardDescription:
    "Serve sandwiches by selecting evenly spaced cards; don't let your ingredients run out!",
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
  about: [
    "Make sandwiches with ingredients available in your food truck. The quality of each sandwich determines how many ingredients will refill your prep area. Sell out your entire inventory to win!",
    "This game is adapted from Wil Su's Isaludo collection.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },

  // howToPlay: ["Lorem ipsum"],
};
