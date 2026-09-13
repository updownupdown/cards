import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const rankAndFile: GameDefinition = {
  path: "/rank-and-file",
  title: "Rank and File",
  aliases: ["Dress Parade"],
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 40, difficulty: 30, luck: 35 },
  thumbnail: "RankAndFile.webp",
  background: GAME_BACKGROUNDS.city,
  animation: GameAnimations.Clouds,
  gameColorDark: "#26343b",
  gameColorMid: "#5aaf8f",
  gameColorPale: "#dfe2d4",
  cardDescription:
    "Reveal ten disciplined columns and maneuver alternating-color formations.",
  quickStart: [
    "Only each column's exposed card begins face up.",
    "Build down by alternating color.",
    "Move complete or partial ordered sequences.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to eight suit foundations.",
    "## Rules",
    "- Ten columns of four are dealt with only their top cards exposed.",
    "- Build down by alternating color.",
    "- Move any complete or partial correctly packed sequence.",
    "- Any card or sequence may fill an empty column; the stock has one pass.",
  ],
};
