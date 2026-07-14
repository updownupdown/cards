import { GameDefinition, GameTag } from "../games-data";

export const calculation: GameDefinition = {
  path: "/calculation",
  tutorial: {
    default: {
      text: "Play to +1/+2/+3/+4 foundations; park blocks on waste piles.",
    },
  },
  title: "Calculation",
  thumbnail: "Calculation.jpg",
  cardBack: "Calculation.png",
  background: "felt-dark-purple.jpg",
  cardColorBg: "#12122b",
  cardColorText: "#eccfff",
  cardDescription:
    "Build four foundations in steps of 1, 2, 3, and 4 up to the Kings.",
  stats: {
    complexity: 80,
    difficulty: 90,
    luck: 60,
  },
  tags: [GameTag.ClassicSolitaire],
  briefRules: [
    "The four foundations start on an Ace, 2, 3, and 4.",
    "Each builds up in steps of 1, 2, 3, or 4, wrapping past the King.",
    "Suit is ignored; only the rank sequence matters.",
    "Park cards on four waste piles until they fit.",
  ],
  about: [
    "Calculation is a brain-bending patience where arithmetic replaces suits.",
    "Skilful use of the four waste piles is the difference between a win and a jam.",
  ],
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
};
