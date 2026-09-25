import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const raglan: GameDefinition = {
  path: "/raglan",
  title: "Raglan",
  tags: [
    GameTag.KlondikeFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 35, difficulty: 55, luck: 25 },
  thumbnail: "Raglan.webp",
  background: GAME_BACKGROUNDS.aridHill,
  animation: GameAnimations.Leaves,
  gameColorDark: "#2f3d35",
  gameColorPale: "#e9e7d3",
  cardBack: CardBackColors.Pine,
  cardDescription:
    "A classic one-deck tableau built on alternating colors with simple, careful pacing.",
  quickStart: [
    "Move every card to the four foundations by suit, from A to K.",
    "Build descending runs in alternating colors.",
    "Move valid tableau groups, and use empty columns only for Ks.",
  ],
  howToPlay: [
    "## Objective",
    "Move every card to the four foundations by suit, from Ace to King.",
    "## Rules",
    "- Build tableau cards down by alternating colors.",
    "- Only Kings may fill empty tableau spaces.",
    "- Deal the stock into waste one card at a time. There is no stock redeal.",
  ],
};
