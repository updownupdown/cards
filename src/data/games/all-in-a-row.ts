import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const allInARow: GameDefinition = {
  path: "/all-in-a-row",
  title: "All in a Row",
  tags: [GameTag.ClearTheBoard, GameTag.SequenceBuilding],
  rating: { complexity: 10, difficulty: 90, luck: 25 },
  thumbnail: "AllInARow.webp",
  background: GAME_BACKGROUNDS.waterLogs,
  animation: GameAnimations.ManaDust,
  gameColorDark: "#182532",
  gameColorPale: "#e4f7ff",
  cardBack: CardBackColors.Violet,
  cardDescription: "Clear thirteen columns by selecting adjacent ranks.",
  quickStart: [
    "Clear all thirteen columns to win.",
    "Choose any exposed card to begin.",
    "Play one rank higher or lower, regardless of suit.",
    "A and K are adjacent.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards from the thirteen columns onto one foundation.",

    "## Rules",
    "- Select any exposed card as the starting rank.",
    "- Afterwards, play one rank higher or lower than the foundation's top card, regardless of suit.",
    "- Ace and King are consecutive, so Q, K, A, 2, A, K, etc. is a valid sequence.",
  ],
};
