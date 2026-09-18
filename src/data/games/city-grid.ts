import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";

export const cityGrid: GameDefinition = {
  path: "/city-grid",
  title: "City Grid",
  tags: [GameTag.GridPlacement, GameTag.SpatialControl],
  rating: {
    complexity: 30,
    difficulty: 50,
    luck: 40,
  },
  thumbnail: "CityGrid.webp",
  background: GAME_BACKGROUNDS.city,
  gameColorDark: "#383d4e",
  gameColorMid: "#5a83af",
  gameColorPale: "#e3f6ff",
  cardDescription:
    "A tile-laying game where each move can disrupt the precarious grid.",
  quickStart: [
    "Fill up the grid with all top cards facing up.",
    "Add to or beside existing piles, up to 4 cards tall.",
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
    "- The value of face down cards is not used to determine which cards must be flipped.",
    "- Aces are worth 1.",
  ],
};
