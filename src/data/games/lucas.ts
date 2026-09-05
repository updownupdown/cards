import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const lucas: GameDefinition = {
  path: "/lucas",
  title: "Lucas",
  tags: [GameTag.StockAndWaste, GameTag.TableauBuilding],
  rating: { complexity: 35, difficulty: 40, luck: 45 },
  thumbnail: "Lucas.jpg",
  background: GAME_BACKGROUNDS.oldRoom,
  animation: GameAnimations.Dust,
  gameColorDark: "#372f2a",
  gameColorMid: "#1f4e74",
  gameColorPale: "#e4d7bf",
  cardDescription:
    "Thirteen compact columns begin beneath eight pre-seeded Aces.",
  quickStart: [
    "The eight Aces begin on the foundations.",
    "Build tableau down by suit, one card at a time.",
    "Empty columns accept any card; the stock has one pass.",
  ],
  howToPlay: [
    "## Objective",
    "Build all eight foundations from Ace to King by suit.",
    "## Rules",
    "- The Aces are removed before thirteen columns of three are dealt.",
    "- Build tableau down by suit.",
    "- Move only one exposed card at a time.",
    "- Fill empty columns with any card and deal the stock once.",
  ],
};
