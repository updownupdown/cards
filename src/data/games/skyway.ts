import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const skyway: GameDefinition = {
  path: "/skyway",
  title: "Skyway",
  tags: [
    GameTag.IsaludoCollection,
    GameTag.ModernMechanics,
    GameTag.GridPlacement,
    GameTag.SpatialControl,
  ],
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
    "Draft one market pile, then place its cards in the grid.",
    "Build rising same-suit paths across orthogonally adjacent cells.",
  ],
  howToPlay: [
    "## Objective",
    "Create an increasing same-suit path of five or more cards **for each suit**.",

    "## Drafting",
    "- Choose one pile from the market and place all of its cards in a single grid cell.",
    "- Discard the other market piles. You play through the deck three times, followed by one final placement.",
    "- You may place cards in any cell, but each cell keeps only its top three cards.",

    "## Paths",
    "- A path is formed using cards of one suit in increasing rank order across orthogonally adjacent cells.",
    "- Each suit needs a path of at least five cards to win.",
  ],
  about: [
    "You are a city planner in charge of designing a new traffic interchange. To be successful, you must create paths of sufficient length for each suit.",
    "This game is adapted from Wil Su's Isaludo collection.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },
};
