import { GameDefinition, GameTag } from "../games-data";

export const accordion: GameDefinition = {
  path: "/accordion",
  title: "Accordion",
  thumbnail: "Accordion.jpg",
  cardBack: "Accordion.png",
  background: "felt-dark-red.jpg",
  cardColorBg: "#351219",
  cardColorText: "#fffccf",
  cardDescription:
    "Squeeze the whole deck into a single pile, one matching jump at a time.",
  stats: {
    complexity: 10,
    difficulty: 35,
    luck: 65,
  },
  tags: [GameTag.ClassicSolitaire, GameTag.EasyToLearn],
  briefRules: [
    "Cards match if they share a suit or a rank.",
    "Move a card onto the one 1 or 3 places to its left.",
    "Moved piles carry their whole stack along.",
    "Compress the layout down to a single pile to win.",
  ],
  about: [
    "Accordion is a solitaire about squeezing a long line of cards together.",
    "It rarely comes out, and one greedy move can leave the line stuck.",
  ],
  howToPlay: [
    "## Objective",
    "Compress all 52 cards into a **single pile** by stacking matching cards together.",
    "## Setup",
    "- Deal the entire deck out in order, laid left to right (wrapping onto new rows to fit the screen).",
    "## Playing",
    "- A card (and everything stacked on it) may move onto the card **immediately to its left** or the card **three places to its left**.",
    "- The move is legal only if the two cards **match in suit or in rank** (for example {9H} onto {9S}, or {9H} onto {4H}).",
    "- Only the top card of each pile matters for matching.",
    "- After a move, the gap closes and the cards to the right shift left.",
    "- Prefer jumps of three when you can; they collapse the layout faster.",
    "## Winning",
    "You win if you reduce the entire spread down to one pile.",
  ],
};
