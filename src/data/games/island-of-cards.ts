import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const islandOfCards: GameDefinition = {
  path: "/island-of-cards",
  title: "Island of Cards",
  tags: [GameTag.EasyToLearn, GameTag.GridPlacement],
  rating: {
    complexity: 25,
    difficulty: 50,
    luck: 45,
  },
  thumbnail: "IslandOfCards.jpg",
  background: GAME_BACKGROUNDS.island,
  animation: GameAnimations.Birds,
  gameColorDark: "#153846",
  gameColorPale: "#ffe6a3",
  cardDescription:
    "Grow an island across a 7x7 grid, one rank-linked card at a time.",
  quickStart: [
    "Place each card next to one that is +/-1 in rank (A<->K wraps).",
    "Cards may never be placed next to an equal rank.",
    "Fill up the island grid to win.",
  ],
  howToPlay: [
    "## Objective",
    "Fill the whole island grid, scoring as high as you can.",
    "Your score is 49, minus 1 per discarded card, plus 1 for each card in the draw deck.",

    "## Gameplay",
    "- Place one card at a time so it is orthogonally adjacent to a card **one rank higher or lower**.",
    "- The sequence **wraps**: **Kings and Aces** are adjacent, so an Ace may go beside a **2** or a **King**.",
    "- You may **not** place a card next to an equal rank in any of the eight surrounding spaces.",
    "- **Suit and colour are ignored.**",
    "- If the drawn card can't be legally placed, it is **discarded**.",

    "## Easy Mode",
    "- Turn on **Jokers** in the settings to add two wildcards, which you can place on any connected space (Jokers don't count toward scoring).",
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
