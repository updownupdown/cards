import { GameDefinition, GameTag } from "../games-data";

export const theSandwichGuy: GameDefinition = {
  path: "/the-sandwich-guy",
  tip: {
    default: {
      text: "Pick 3 equally spaced ranks; same suit/color gives more refill.",
    },
  },
  title: "The Sandwich Guy",
  thumbnail: "SandwichGuy.jpg",
  cardBack: "SandwichGuy.png",
  background: "concrete.jpg",
  cardColorBg: "#102524",
  cardColorText: "#b0eee9",
  cardDescription:
    "Serve sandwiches by selecting evenly spaced cards; don't let your ingredients run out!",
  stats: {
    complexity: 20,
    difficulty: 80,
    luck: 40,
  },
  tags: [
    GameTag.IsaludoCollection,
    GameTag.ModernMechanics,
    GameTag.EasyToLearn,
  ],
  byLine: "Game design by Wil Su",
  briefRules: [
    "Select three cards with equally-spaced rank values to create a sandwich.",
    "A/J/Q/K are worth 1/11/12/13, and wrapping around A/K is allowed",
    "Use same suits, or same colors, for better hand refills.",
  ],
  about: [
    "Make sandwiches with ingredients available in your food truck. The quality of each sandwich determines how many ingredients will refill your prep area. Sell out your entire inventory to win!",
    "This game is adapted from Wil Su's Isaludo collection.",
  ],
  howToPlay: [
    "Select three cards with equally-spaced rank values to create a sandwich.",
    "Aces, Jacks, Queens, Kings are worth 1, 11, 12, and 13, respectively.",
    'Card ranks can "wrap around" the Ace and King (e.g. 9, Q, and 2 is a valid selection).',
    "Your hand will be refilled with: 4 cards if the sandwich cards were of the same suit, 3 cards if the sandwich cards were the same color (but a different suit), or 2 cards if the sandwich cards had mixed colors.",
  ],
  // howToPlay: ["Lorem ipsum"],
};
