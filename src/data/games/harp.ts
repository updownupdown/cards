import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const harp: GameDefinition = {
  path: "/harp",
  title: "Harp",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 35, difficulty: 35, luck: 40 },
  thumbnail: "Harp.webp",
  background: GAME_BACKGROUNDS.cliffFields,
  animation: GameAnimations.Leaves,
  gameColorDark: "#293a31",
  gameColorMid: "#404928",
  gameColorPale: "#e7dfc4",
  cardDescription:
    "A more forgiving Double Klondike with four passes through the stock.",
  quickStart: [
    "Move all cards to the foundations, built by suit, from A to K.",
    "Build tableau columns down by alternating color.",
    "Only Ks fill empty columns.",
    "Use up to four stock passes.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to eight suit foundations, building up by suit, from Ace to King.",
    "## Rules",
    "- Build tableau columns down by alternating color and move ordered runs.",
    "- Only Kings may fill empty columns.",
    "- Turn one stock card at a time, with four total passes.",
  ],
};
