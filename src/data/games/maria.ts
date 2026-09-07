import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const maria: GameDefinition = {
  path: "/maria",
  title: "Maria",
  aliases: ["Thirty-Six Card Tableau"],
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 30, difficulty: 35, luck: 45 },
  thumbnail: "Maria.jpg",
  background: GAME_BACKGROUNDS.cherryBlossoms,
  animation: GameAnimations.CherryBlossom,
  gameColorDark: "#3c2d36",
  gameColorMid: "#852749",
  gameColorPale: "#efd9dd",
  cardDescription:
    "A nine-column Forty Thieves relative packed by alternating color.",
  quickStart: [
    "Build tableau down by alternating color.",
    "Move one card at a time.",
    "Any card fills an empty column; the stock has one pass.",
  ],
  howToPlay: [
    "## Objective",
    "Build eight foundations from Ace to King by suit.",
    "## Rules",
    "- Nine columns of four are dealt face up.",
    "- Build down by alternating color and move one card at a time.",
    "- Empty columns accept any card.",
    "- Deal the stock once, one card at a time.",
  ],
};
