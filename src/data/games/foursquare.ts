import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const foursquare: GameDefinition = {
  path: "/foursquare",
  title: "Foursquare",
  tags: [
    GameTag.IsaludoCollection,
    GameTag.ModernMechanics,
    GameTag.GridPlacement,
    GameTag.SpatialControl,
  ],
  rating: {
    complexity: 30,
    difficulty: 50,
    luck: 40,
  },
  thumbnail: "Foursquare.jpg",
  background: GAME_BACKGROUNDS.city,
  cardBack: "Foursquare.jpg",
  gameColorDark: "#383d4e",
  gameColorPale: "#e3f6ff",
  cardDescription:
    "A tile-laying game where each move can disrupt the precarious grid.",
  quickStart: [
    "Fill up the grid with all top cards facing up.",
    "All near existing pile, up to 4 cards tall.",
    "If placed card is highest/lowest in its line, all line cards are flipped.",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by having all 16 piles' top cards facing up.",
    "**Lose** by having more than 4 piles with face down top cards at any time.",

    "## Gameplay",
    "The game is played with Ace through 10 for all four suits.",
    "Each turn, place the top card from the stock on a pile within a grid:",
    "- you can start a new pile if it's adjacent to an existing pile, or",
    "- you can add to a pile if it has less than 4 cards.",

    "\nAfter a card is placed, if that card is the highest or lowest of its row or column, the cards in that row or column are flipped (face up or down).",
    "- The value of face down cards are not used to determined which cards must be flipped.",
    "- Aces are worth 1.",
  ],
  about: [
    "As the major of Flavortown, you are responsible for the placement of new restaurants across the grid. New restaurants (cards) that are the lowest or highest quality (rank) within their row or column will cause other restaurants to go out of business, or open up to challenge the newcomer.",
    "This game is adapted from Wil Su's Isaludo collection.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },
};
