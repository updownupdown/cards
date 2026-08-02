import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const skyway: GameDefinition = {
  path: "/skyway",
  title: "Skyway",
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  rating: {
    complexity: 90,
    difficulty: 75,
    luck: 50,
  },
  thumbnail: "Skyway.jpg",
  background: GAME_BACKGROUNDS.interchange,
  cardBack: "Skyway.png",
  gameColorDark: "#1d2a35",
  gameColorPale: "#b3d5ec",
  cardDescription:
    "Draft from a shifting market to engineer long suit-based routes across a growing grid.",
  quickStart: [
    "Draft market sets; build rising same-suit paths on adjacent cells.",
  ],
  howToPlay: [
    "Each turn, you may draw one set of cards from the market. The other cards are moved to the discard pile. You will go through the full deck three times.",
    "You can place cards on any grid cell, but only the top 3 cards will be kept.",
    "Create paths by placing cards of increasing value, within the same suit, in adjacent grid cells.",
    "To win, you must create paths of length 5 or more for each suit.",
  ],
  about: [
    "You are a city planner in charge of designing a new traffic interchange. To be successful, you must create paths of sufficient length for each suit.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },
};
