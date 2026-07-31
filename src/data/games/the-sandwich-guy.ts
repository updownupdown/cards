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
  cardBack: "SandwichGuy.png",
  cardColorBg: "#102524",
  cardColorText: "#b0eee9",
  cardDescription:
    "Serve sandwiches by selecting evenly spaced cards; don't let your ingredients run out!",
  quickStart: [
    "Pick 3 equally spaced ranks; same suit/color gives more refill.",
  ],
  howToPlay: [
    "Select three cards with equally-spaced rank values to create a sandwich.",
    "Aces, Jacks, Queens, Kings are worth 1, 11, 12, and 13, respectively.",
    'Card ranks can "wrap around" the Ace and King (e.g. 9, Q, and 2 is a valid selection).',
    "Your hand will be refilled with: 4 cards if the sandwich cards were of the same suit, 3 cards if the sandwich cards were the same color (but a different suit), or 2 cards if the sandwich cards had mixed colors.",
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
