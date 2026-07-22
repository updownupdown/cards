import { GameDefinition, GameTag } from "../games-data";

export const nestor: GameDefinition = {
  path: "/nestor",
  tip: {
    default: "Discard exposed equal ranks (column bottoms and reserve top).",
  },
  title: "Nestor",
  thumbnail: "DefaultThumbnail.jpg",
  cardBack: "DefaultCardBack.png",
  background: "felt-dark-blue.jpg",
  cardColorBg: "#16283f",
  cardColorText: "#dbe9ff",
  cardDescription: "Pair off matching ranks to empty every column.",
  rating: {
    complexity: 15,
    difficulty: 60,
    luck: 65,
  },
  tags: [GameTag.ClassicSolitaire, GameTag.Beta],
  about: [
    "Nestor is a quick matching game where planning the order you break pairs is everything.",
    "Because matching cards can hide beneath one another, greedy removals often strand a pair.",
  ],
  byLine: "Game designer unknown, first documented in 1877",
  howToPlay: [
    "## Objective",
    "Discard all 52 cards by removing matching pairs.",
    "## Setup",
    "- Deal **8 columns of 6** cards face up; no column receives two cards of the same rank.",
    "- The last **4 cards** form a **reserve**.",
    "## Playing",
    "- Only the **bottom (exposed)** card of each column is available, plus the **top of the reserve**.",
    "- Tap two available cards of the **same rank** to discard them both.",
    "- Removing a card exposes the one above it in that column.",
    "## Winning",
    "Clear the entire board to win. If no two available cards match, the game is over.",
  ],
};
