import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const numberTen: GameDefinition = {
  path: "/number-ten",
  title: "Number Ten",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 40, difficulty: 35, luck: 40 },
  thumbnail: "NumberTen.webp",
  background: GAME_BACKGROUNDS.modernMetal1,
  animation: GameAnimations.ManaDust,
  gameColorDark: "#25343b",
  gameColorMid: "#45898f",
  gameColorPale: "#dde4df",
  cardDescription:
    "Uncover ten columns and move alternating-color sequences as complete units.",
  quickStart: [
    "Move all cards to the foundations, built by suit, from A to K.",
    "Build tableau down by alternating color.",
    "Move ordered sequences together; any card fills a gap.",
    "There is no stock redeal.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to the eight suit foundations, building up by suit, from Ace to King.",

    "## Rules",
    "- Ten columns of four are dealt with two face-down and two face-up cards each.",
    "- Build tableau down by alternating color.",
    "- Move complete correctly packed sequences together.",
    "- Any card or sequence fills a space; the stock has one pass.",
    "- There is no stock redeal.",
  ],
};
