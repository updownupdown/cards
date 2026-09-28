import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const towerOfHanoi: GameDefinition = {
  path: "/tower-of-hanoi",
  title: "Tower of Hanoi",
  tags: [GameTag.Puzzles, GameTag.SpatialControl, GameTag.SequenceBuilding],
  rating: {
    complexity: 15,
    difficulty: 40,
    luck: 0,
  },
  // Scored in moves: fewer is better.
  lowerScoreIsBetter: true,
  background: GAME_BACKGROUNDS.indianLandscape,
  animation: GameAnimations.Birds,
  thumbnail: "TowerOfHanoi.webp",
  thumbnailCredit: {
    title: "The Tower of Babel",
    artistName: "Pieter Bruegel the Elder",
    date: "1563",
    sourceName: "Artvee",
    sourceLink: "https://artvee.com/dl/the-tower-of-babel-vienna/",
  },
  gameColorDark: "#304f63",
  gameColorPale: "#d8efe8",
  cardBack: CardBackColors.Teal,
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
