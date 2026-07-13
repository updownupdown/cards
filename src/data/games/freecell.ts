import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const freecell: GameDefinition = {
  path: "/freecell",
  tutorial: {
    default: {
      text: "Drag cards to build the foundations and tableau.",
      tip: "Tableau builds down in alternating colours; use the four free cells to park single cards.",
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
  briefRules: [
    "Build the four foundations up by suit, from Ace to King.",
    "Build tableau columns down in rank with alternating colors.",
    "Park a single card in each of the four free cells.",
    "Every card is dealt face up, so plan ahead.",
  ],
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
