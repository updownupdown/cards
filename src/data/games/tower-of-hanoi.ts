import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const towerOfHanoi: GameDefinition = {
  path: "/tower-of-hanoi",
  title: "Tower of Hanoi",
  tags: [GameTag.EasyToLearn, GameTag.SpatialControl, GameTag.SequenceBuilding],
  rating: {
    complexity: 35,
    difficulty: 45,
    luck: 0,
  },
  background: GAME_BACKGROUNDS.indianLandscape,
  thumbnail: "TowerOfHanoi.webp",
  gameColorDark: "#304f63",
  gameColorMid: "#266170",
  gameColorPale: "#d8efe8",
  cardDescription:
    "Rebuild all nine cards into one descending tower using only legal top-card moves.",
  quickStart: [
    "Move only the top card from a pile.",
    "Place a card only on a higher rank or an empty pile.",
    "Build a single pile from 9 at the bottom to Ace at the top.",
  ],
  howToPlay: [
    "## Objective",
    "Build one pile ordered from **9** at the bottom through **Ace** at the top.",

    "## Gameplay",
    "- Drag only the top card from a pile.",
    "- Move one card at a time.",
    "- A card may be placed on an empty pile or on a card with a **higher rank**.",
    "- There is no losing state. Keep moving until the tower is complete.",
  ],
};
