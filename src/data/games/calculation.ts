import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const calculation: GameDefinition = {
  path: "/calculation",
  title: "Calculation",
  tags: [GameTag.SequenceBuilding, GameTag.StockAndWaste],
  rating: {
    complexity: 60,
    difficulty: 80,
    luck: 50,
  },
  thumbnail: "Calculation.jpg",
  background: GAME_BACKGROUNDS.oldRoom,
  cardBack: "Calculation.png",
  gameColorDark: "#12122b",
  gameColorPale: "#eccfff",
  cardDescription:
    "Build four foundations in steps of 1, 2, 3, and 4 up to the Kings.",
  quickStart: ["Play to +1/+2/+3/+4 foundations; park blocks on waste piles."],
  howToPlay: [
    "## Objective",
    "Build all four **foundations** up to the King, each following its own step interval.",
    "## Setup",
    "- Place an Ace, a 2, a 3, and a 4 as the four foundation base cards (suit does not matter).",
    "- The rest of the deck is the **stock**, alongside **4 waste piles**.",
    "## Foundations",
    "Each foundation builds **upward by a fixed step**, wrapping past the King (Jack = 11, Queen = 12, King = 13):",
    "- Base **A**: step 1 → A, 2, 3, 4 … K",
    "- Base **2**: step 2 → 2, 4, 6, 8, 10, Q, A, 3 … K",
    "- Base **3**: step 3 → 3, 6, 9, Q, 2, 5 … K",
    "- Base **4**: step 4 → 4, 8, Q, 3, 7 … K",
    "## Playing",
    "- Turn the top card of the stock. Play it onto any foundation where it is the next card, or set it aside on one of the **4 waste piles**.",
    "- Only the **top card** of a waste pile can be played, and only onto a foundation.",
    "- Choose waste piles carefully: burying a card you need soon can lock the game.",
    "## Winning",
    "You win when all four foundations are completed up to the Kings.",
  ],
  about: [
    "Calculation is a brain-bending patience where arithmetic replaces suits.",
    "Skilful use of the four waste piles is the difference between a win and a jam.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
  },
};
