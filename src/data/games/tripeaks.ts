import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const tripeaks: GameDefinition = {
  path: "/tripeaks",
  title: "TriPeaks",
  background: "medieval-blocks.jpg",
  cardColorBg: "#24343a",
  cardColorText: "#e3fcdd",
  cardDescription:
    "Clear three peaks by playing cards one rank above or below the waste.",
  stats: {
    complexity: 15,
    difficulty: 30,
    luck: 70,
  },
  tags: [GameTag.ClassicSolitaire],
  briefRules: [
    "Play an exposed card one rank higher or lower than the waste top.",
    "Rank wraps around, so Aces and Kings connect.",
    "Draw from the stock when no card is playable.",
    "Clear all three peaks to win.",
  ],
  about: [
    "TriPeaks is a fast, chaining patience played over three overlapping peaks.",
    "Long unbroken runs feel great, and the whole board can sometimes fall in a single chain.",
  ],
  howToPlay: [
    "## Objective",
    "Remove every card from the **three peaks** by building a continuous run on the waste pile.",
    "## Setup",
    "- 28 cards are dealt into three overlapping peaks; only the bottom row starts face up.",
    "- The remaining 24 cards form the **stock**, with one card turned to the **waste** to begin.",
    "## Playing",
    "- An exposed peak card may be moved to the waste if it is **one rank higher or lower** than the current waste card.",
    "- Rank wraps around: a King plays on an Ace and an Ace plays on a King (for example {2C}, then {AD}, then {KH}).",
    "- Removing a card that covered others flips the newly exposed cards face up.",
    "- When no legal move remains, turn a card from the stock to the waste.",
    "## Winning",
    "You win when all three peaks are cleared. If the stock is empty with no move available, the game is lost.",
  ],
};
