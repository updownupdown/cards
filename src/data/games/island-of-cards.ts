import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const islandOfCards: GameDefinition = {
  path: "/island-of-cards",
  title: "Island of Cards",
  tags: [GameTag.EasyToLearn],
  rating: {
    complexity: 25,
    difficulty: 50,
    luck: 45,
  },
  thumbnail: "IslandOfCards.jpg",
  background: GAME_BACKGROUNDS.island,
  animation: GameAnimations.FlyingBirds,
  gameColorDark: "#153846",
  gameColorPale: "#ffe6a3",
  cardDescription:
    "Grow an island across a 7x7 grid, one rank-linked card at a time.",
  quickStart: [
    "Place touching +/-1 rank (A<->K wraps), never equal next to equal.",
  ],
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
  about: [
    "Island of Cards asks you to grow a connected 7x7 island from an opening X of thirteen cards.",
    "Suit and colour never matter — only how ranks chain together and avoid their equals.",
  ],
  credits: {
    creators: [GameCreators.Frank],
    creationDate: "2021",
  },
};
