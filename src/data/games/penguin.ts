import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const penguin: GameDefinition = {
  path: "/penguin",
  tip: {
    default: {
      text: "From beak rank: foundations up suit; tableau down in suit.",
    },
  },
  title: "Penguin",
  // enabledOnLocalOnly: true,
  thumbnail: DEFAULT_GAME_THUMBNAIL,
  background: "felt-dark-blue.jpg",
  cardColorBg: "#0e2335",
  cardColorText: "#ff944d",
  cardDescription:
    "A FreeCell-like game building suit runs from a random beak rank.",
  stats: {
    complexity: 0,
    difficulty: 0,
    luck: 0,
  },
  tags: [GameTag.ClassicSolitaire, GameTag.DragAndDrop],
  about: [
    "Penguin, by David Parlett, is an open, FreeCell-style patience with everything on show.",
    "With seven free cells and full information, most deals reward patient, planned play.",
  ],
  byLine: "Game design by David Parlett, 1979",
  howToPlay: [
    "## Objective",
    "Build all four **foundations** up by suit from the beak rank until each holds 13 cards.",
    "## Setup",
    "- The first card dealt is the **beak**, and it sets the base rank for every foundation.",
    "- Deal **7 columns of 7 cards**, all face up. As the other three cards matching the beak appear, they start the foundations.",
    "- There are **7 free cells** for temporary storage.",
    "## Foundations",
    "- Build up **by suit** from the beak rank, wrapping past the King back to the Ace (for example beak {7D}: 7, 8 … K, A, 2 … 6).",
    "## Tableau",
    "- Build down **by suit**, wrapping from Ace to King (for example a {2S} accepts an {AS}, then a {KS}).",
    "- Each **free cell** holds one card; you can move a group as large as your free cells and empty columns allow.",
    "- An **empty column** may only be filled by a card ranked **one below the beak** (or a sequence headed by it).",
    "## Winning",
    "You win when all four foundations are complete.",
  ],
};
