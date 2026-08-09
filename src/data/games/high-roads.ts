import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";

export const highRoads: GameDefinition = {
  path: "/high-roads",
  title: "High Roads",
  tags: [
    GameTag.ModernMechanics,
    GameTag.GridPlacement,
    GameTag.SpatialControl,
  ],
  rating: {
    complexity: 90,
    difficulty: 75,
    luck: 50,
  },
  thumbnail: "HighRoads.jpg",
  background: GAME_BACKGROUNDS.interchange,
  // cardBack: "HighRoads.jpg",
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
};
