import { GameDefinition, GameTag } from "../games-data";

export const islandOfCards: GameDefinition = {
  path: "/island-of-cards",
  tip: {
    default:
      "Place touching +/-1 rank (A<->K wraps), never equal next to equal.",
  },
  title: "Island of Cards",
  thumbnail: "IslandOfCards.jpg",
  cardColorBg: "#153846",
  cardColorText: "#ffe6a3",
  background: "water.jpg",
  cardDescription:
    "Grow an island across a 7x7 grid, one rank-linked card at a time.",
  rating: {
    complexity: 25,
    difficulty: 50,
    luck: 45,
  },
  tags: [GameTag.EasyToLearn],
  about: [
    "Island of Cards asks you to grow a connected 7x7 island from an opening X of thirteen cards.",
    "Suit and colour never matter — only how ranks chain together and avoid their equals.",
  ],
  byLine: "Game design by Frank, 2021",
  howToPlay: [
    "## Objective",
    "Fill the whole **7x7 island**, or score as high as you can.",
    "## Gameplay",
    "- Draw one card at a time.",
    "- Place it so it is **orthogonally adjacent** to a card **one rank higher or lower**. Example: a **6** goes beside a **5** or a **7**.",
    "- The sequence **wraps**: **Kings and Aces** are adjacent, so an Ace may go beside a **2** or a **King**.",
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
