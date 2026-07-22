import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const bakersGame: GameDefinition = {
  path: "/bakers-game",
  tip: {
    default: "Foundations up by suit; tableau down in suit; use 4 cells.",
  },
  title: "Baker's Game",
  thumbnail: DEFAULT_GAME_THUMBNAIL,
  cardColorBg: "#1b2a24",
  cardColorText: "#dcefe4",
  background: "felt-dark-green.jpg",
  cardDescription:
    "FreeCell's tougher ancestor: build the tableau down in suit, not colour.",
  rating: {
    complexity: 25,
    difficulty: 55,
    luck: 30,
  },
  tags: [GameTag.TapAndDrag, GameTag.ClassicSolitaire, GameTag.Beta],
  about: [
    "Baker's Game is the same-suit forerunner of FreeCell, popularised by Martin Gardner.",
    "Building by suit makes long sequences far harder to assemble, so free cells are precious.",
  ],
  byLine: "Game design by C. L. Baker, 1968",
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four **foundations**, each built up by suit from Ace to King.",
    "## Setup",
    "- All 52 cards are dealt face up into **8 tableau columns** (four of 7, four of 6).",
    "- There are **4 free cells** and 4 empty foundations.",
    "## Playing",
    "- Build tableau columns **down in rank in the same suit** (for example a {9S} on a {10S}).",
    "- Move one card at a time; each **free cell** holds a single card.",
    "- Moving a sequence is a shortcut: you can shift as many cards as you have free cells and empty columns to support.",
    "- Any card may be placed onto an empty column.",
    "- Send cards to the foundations up by suit from the Aces.",
    "## Winning",
    "You win when all four foundations are built from Ace to King.",
  ],
};
