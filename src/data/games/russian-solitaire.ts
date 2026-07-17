import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const russianSolitaire: GameDefinition = {
  path: "/russian-solitaire",
  tip: {
    default: {
      text: "Move any face-up stack; build down in suit; only kings fill.",
    },
  },
  title: "Russian Solitaire",
  thumbnail: DEFAULT_GAME_THUMBNAIL,
  cardColorBg: "#2c1c30",
  cardColorText: "#f0dcf0",
  background: "wood-vertical.jpg",
  cardDescription:
    "Yukon at its most brutal: haul mixed groups, but build the tableau down in suit.",
  stats: {
    complexity: 35,
    difficulty: 80,
    luck: 30,
  },
  tags: [GameTag.ClassicSolitaire, GameTag.DragAndDrop, GameTag.Beta],
  about: [
    "Russian Solitaire is Yukon with same-suit building, making it one of the toughest games around.",
    "Freeing buried cards in exactly the right order is the whole puzzle.",
  ],
  byLine: "Game designer unknown",
  howToPlay: [
    "## Objective",
    "Build the four **foundations** up by suit from Ace to King.",
    "## Setup",
    "- Cards are dealt into **7 columns**; column 1 has a single card and each later column adds more.",
    "- Every column has some face-down cards beneath its face-up cards (except the first).",
    "## Playing",
    "- Pick up **any face-up card** and it brings **all cards on top of it** along.",
    "- The card you grab must land on a card **one rank higher of the same suit** (for example a {6S} onto a {7S}).",
    "- The carried cards do **not** need to be in sequence.",
    "- A face-down card flips up when it becomes the bottom of a column.",
    "- Only a **King** (and its group) may move to an **empty column**.",
    "- Send single cards to the foundations up by suit.",
    "## Winning",
    "You win when all four foundations are complete.",
  ],
};
