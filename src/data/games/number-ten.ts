import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const numberTen: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/number-ten",
  title: "Number Ten",
  tags: [GameTag.StockAndWaste, GameTag.TableauBuilding],
  rating: { complexity: 40, difficulty: 35, luck: 40 },
  background: GAME_BACKGROUNDS.interchange,
  animation: GameAnimations.Clouds,
  gameColorDark: "#25343b",
  gameColorPale: "#dde4df",
  cardDescription:
    "Uncover ten columns and move alternating-color sequences as complete units.",
  quickStart: [
    "The lower two cards of each column begin hidden.",
    "Build down by alternating color.",
    "Move ordered sequences; any card fills a gap.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to eight suit foundations.",
    "## Rules",
    "- Ten columns of four are dealt with two face-down and two face-up cards each.",
    "- Build down by alternating color.",
    "- Move complete correctly packed sequences together.",
    "- Any card or sequence fills a space; the stock has one pass.",
  ],
};
