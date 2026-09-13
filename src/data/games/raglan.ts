import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const raglan: GameDefinition = {
  path: "/raglan",
  title: "Raglan",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 55, difficulty: 55, luck: 25 },
  thumbnail: "Raglan.webp",
  background: GAME_BACKGROUNDS.field,
  animation: GameAnimations.Leaves,
  gameColorDark: "#2f3d35",
  gameColorMid: "#516a4f",
  gameColorPale: "#e9e7d3",
  cardDescription:
    "A classic one-deck tableau built on alternating colors with simple, careful pacing.",
  quickStart: [
    "Build descending runs in alternating colors.",
    "Move tableau groups when they are valid, and use empty columns carefully.",
    "Clear all cards to the foundations to win.",
  ],
  howToPlay: [
    "## Objective",
    "Move every card to the four foundations by suit, from Ace to King.",
    "## Rules",
    "- Use a seven-column tableau with cards dealt in ascending stack sizes.",
    "- Build tableau cards down by alternating colors.",
    "- Only Kings may fill empty tableau spaces.",
    "- The stock is dealt into waste one card at a time, with no re-deal in this version.",
  ],
};
