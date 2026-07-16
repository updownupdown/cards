import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const freecell: GameDefinition = {
  path: "/freecell",
  tip: {
    default: {
      text: "Foundations up suit; tableau down alt color; use 4 free cells.",
    },
  },
  title: "FreeCell",
  // enabledOnLocalOnly: true,
  thumbnail: DEFAULT_GAME_THUMBNAIL,
  cardColorBg: "#151f2b",
  cardColorText: "#DDEBFF",
  background: "felt-dark-blue.jpg",
  cardDescription:
    "An open-information classic where nearly every deal can be won with care.",
  stats: {
    complexity: 20,
    difficulty: 40,
    luck: 30,
  },
  tags: [GameTag.ClassicSolitaire, GameTag.DragAndDrop],
  about: [
    "FreeCell is a skill-heavy solitaire where the whole deck is visible from the start.",
    "With four free cells and no hidden cards, nearly every deal is winnable through careful planning.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four **foundations**, each built up by suit from Ace to King.",
    "## Setup",
    "- All 52 cards are dealt face up into **8 tableau columns**.",
    "- Four columns hold 7 cards and four hold 6.",
    "- There are **4 free cells** and 4 empty foundations.",
    "## Playing",
    "- Build tableau columns **down in rank, alternating color** (for example a black {9S} on a red {10D}).",
    "- Move one card at a time; each **free cell** holds a single card.",
    "- Moving a sequence is a shortcut: you can shift as many cards as you have free cells and empty columns to support.",
    "- Any card may be placed onto an empty column.",
    "- Send cards to the foundations up by suit from the Aces.",
    "## Winning",
    "You win when all four foundations are built from Ace to King.",
  ],
};
