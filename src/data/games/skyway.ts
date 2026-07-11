import { GameDefinition, GameTag } from "../games-data";

export const skyway: GameDefinition = {
  path: "/skyway",
  title: "Skyway",
  thumbnail: "Skyway.jpg",
  cardBack: "Skyway.png",
  cardColorBg: "#1d2a35",
  cardColorText: "#b3d5ec",
  cardDescription:
    "Draft from a shifting market to engineer long suit-based routes across a growing grid.",
  stats: {
    complexity: 90,
    difficulty: 75,
    luck: 50,
  },
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  byLine: "Game design by Wil Su",
  briefRules: [
    "Win by creating paths of length 5 or more for each suit.",
    "Create paths by placing cards of increasing value, within the same suit, in adjacent grid cells.",
    "Build grid cells of at most 3 cards tall by drawing cards from the market over 3 full passes of the deck.",
  ],
  about: [
    "You are a city planner in charge of designing a new traffic interchange. To be successful, you must create paths of sufficient length for each suit.",
  ],
  howToPlay: [
    "Each turn, you may draw one set of cards from the market. The other cards are moved to the discard pile. You will go through the full deck three times.",
    "You can place cards on any grid cell, but only the top 3 cards will be kept.",
    "Create paths by placing cards of increasing value, within the same suit, in adjacent grid cells.",
    "To win, you must create paths of length 5 or more for each suit.",
  ],
};
