import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const fortyThieves: GameDefinition = {
  path: "/forty-thieves",
  tip: {
    default: "Foundations up suit; tableau down suit, one card at a time.",
  },
  title: "Forty Thieves",
  enabledOnLocalOnly: true,
  background: "concrete.jpg",
  cardColorBg: "#2E2D34",
  cardColorText: "#EFE8FF",
  cardDescription:
    "A demanding two-deck patience where every card moves one at a time.",
  rating: {
    complexity: 0,
    difficulty: 0,
    luck: 0,
  },
  tags: [GameTag.ClassicSolitaire, GameTag.TapAndDrag],
  about: [
    "Forty Thieves, also called Napoleon at St Helena, is a patient two-deck game.",
    "Strict single-card moves and suit-matched building make it a low-luck test of planning.",
  ],
  byLine:
    'Game designer unknown, first recorded around 1870 under the name "Napoleon at St. Helena"',
  howToPlay: [
    "## Objective",
    "Move all 104 cards to the **eight foundations**, each built up by suit from Ace to King.",
    "## Setup",
    "- Two decks are used.",
    "- Deal **10 tableau columns of 4 cards**, all face up.",
    "- The remaining 64 cards form the **stock**.",
    "## Playing",
    "- Build tableau columns **down in rank and same suit** (for example {8C} on {9C}).",
    "- Move only **one card at a time** between columns.",
    "- Any single card may be placed onto an empty column.",
    "- Send cards to the foundations up by suit from the Aces.",
    "## Stock",
    "Turn cards from the stock one at a time to the waste pile. The top waste card is playable, and there is no redeal.",
    "## Winning",
    "You win when all eight foundations run from Ace to King.",
  ],
};
