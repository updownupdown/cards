import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const yukon: GameDefinition = {
  path: "/yukon",
  tip: {
    default: {
      text: "Move any face-up stack; build down alt color; kings fill empty.",
    },
  },
  title: "Yukon",
  thumbnail: DEFAULT_GAME_THUMBNAIL,
  cardColorBg: "#20303a",
  cardColorText: "#e6f1f7",
  background: "wood-table.jpg",
  cardDescription:
    "Klondike unleashed: move whole groups of cards, in any order, across the tableau.",
  stats: {
    complexity: 35,
    difficulty: 55,
    luck: 35,
  },
  tags: [GameTag.ClassicSolitaire, GameTag.DragAndDrop, GameTag.Beta],
  about: [
    "Yukon takes Klondike's layout but lets you haul entire piles of mixed cards in a single move.",
    "With no stock and almost everything face up, wins reward untangling the columns in the right order.",
  ],
  howToPlay: [
    "## Objective",
    "Build the four **foundations** up by suit from Ace to King.",
    "## Setup",
    "- Cards are dealt into **7 columns**; column 1 has a single card and each later column adds more.",
    "- Every column has some face-down cards beneath its face-up cards (except the first).",
    "## Playing",
    "- Pick up **any face-up card** and it brings **all cards on top of it** along.",
    "- The card you grab must land on a card **one rank higher of the opposite colour** (for example a {6H} onto a {7S}).",
    "- The carried cards do **not** need to be in sequence.",
    "- A face-down card flips up when it becomes the bottom of a column.",
    "- Only a **King** (and its group) may move to an **empty column**.",
    "- Send single cards to the foundations up by suit; double-tap the bottom card for a quick play.",
    "## Winning",
    "You win when all four foundations are complete.",
  ],
};
