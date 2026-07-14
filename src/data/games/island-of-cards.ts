import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const islandOfCards: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/island-of-cards",
  tutorial: {
    default: {
      text: "Place touching +/-1 rank (A<->K wraps), never equal next to equal.",
    },
  },
  title: "Island of Cards",
  byLine: "by Frank",
  thumbnail: DEFAULT_GAME_THUMBNAIL,
  cardColorBg: "#14504f",
  cardColorText: "#ffe6a3",
  background: "wood-table.jpg",
  cardDescription:
    "Grow an island across a 7x7 grid, one rank-linked card at a time.",
  stats: {
    complexity: 40,
    difficulty: 60,
    luck: 55,
  },
  tags: [GameTag.EasyToLearn],
  briefRules: [
    "Draw a card and place it next to a card one rank higher or lower (Ace and King wrap).",
    "A card may never be placed next to an equal rank, orthogonally or diagonally.",
    "Cards that can't be placed are discarded for the rest of the game.",
    "Fill the 7x7 island; score 49, minus discards, plus any cards left to draw.",
  ],
  about: [
    "Island of Cards asks you to grow a connected 7x7 island from an opening X of thirteen cards.",
    "Suit and colour never matter — only how ranks chain together and avoid their equals.",
  ],
  howToPlay: [
    "## Objective",
    "Fill the whole **7x7 island**, or score as high as you can.",
    "## Setup",
    "- Shuffle the 52 cards. Lay the first **13** in a large **X** across the grid (its four points sit in the grid corners). Setup ignores the placement rules.",
    "- The rest becomes your **draw deck**.",
    "## Playing",
    "- **Draw one card** at a time.",
    "- Place it so it is **orthogonally adjacent** to a card **one rank higher or lower**. Example: a **6** goes beside a **5** or a **7**.",
    "- The sequence **wraps**: the **King and Ace** are adjacent, so an Ace may go beside a **2** or a **King**.",
    "- You may **not** place a card next to an equal rank in any of the eight surrounding spaces.",
    "- **Suit and colour are ignored.**",
    "- If the drawn card can't be legally placed, it is **discarded** for the rest of the game.",
    "## Game end & scoring",
    "- The game ends when the island is **complete** or the **draw deck is exhausted**.",
    "- Score = **49**, **minus 1** per discarded card, **plus 1** per card still in the draw deck.",
    "## Easier game",
    "- Turn on **Jokers** in settings to add two wildcards you can place on any connected space (Jokers don't count toward scoring).",
  ],
};
