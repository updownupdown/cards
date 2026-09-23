import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";

export const calculation: GameDefinition = {
  path: "/calculation",
  title: "Calculation",
  tags: [GameTag.SequenceBuilding, GameTag.StockAndWaste],
  rating: {
    complexity: 60,
    difficulty: 80,
    luck: 40,
  },
  thumbnail: "Calculation.webp",
  background: GAME_BACKGROUNDS.geometricCeiling,
  gameColorDark: "#12122b",
  gameColorPale: "#eccfff",
  cardBack: CardBackColors.Violet,
  cardDescription:
    "Build four foundations in steps of 1, 2, 3, and 4, up to K.",
  quickStart: [
    "Build four foundations in steps of 1, 2, 3, and 4, up to K.",
    "Waste piles can be used to store cards in any order.",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by building all four **foundations** up to Kings.",

    "## Foundations",
    "Each foundation builds **upward by a fixed increment** (+1, +2, +3, or +4), wrapping past the King (to Ace, then 2, etc.).",
    "- **Foundation 1**: A, 2, 3, 4 … K",
    "- **Foundation 2**: 2, 4, 6, 8, 10, Q, A, 3 … K",
    "- **Foundation 3**: 3, 6, 9, Q, 2, 5 … K",
    "- **Foundation 4**: 4, 8, Q, 3, 7 … K",

    "## Gameplay",
    "- Play the top card of the stock pile or any of the waste piles onto any foundation if it follows the foundation's increment.",
    "- You can play a Draw card to one of the 4 waste piles.",
    "- You cannot move cards between waste piles.",
  ],
};
