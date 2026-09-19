import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const diplomat: GameDefinition = {
  path: "/diplomat",
  title: "Diplomat",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 30, difficulty: 25, luck: 35 },
  thumbnail: "Diplomat.webp",
  background: GAME_BACKGROUNDS.oldCityAlley,
  animation: GameAnimations.Rain,
  gameColorDark: "#25343a",
  gameColorMid: "#436581",
  gameColorPale: "#dfe0d5",
  cardDescription:
    "Negotiate eight open columns with rank-only packing and single-card moves.",
  quickStart: [
    "Build tableau down by rank regardless of suit.",
    "Move one card at a time; any card fills a space.",
    "Build eight suit foundations during one stock pass.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to eight foundations, Ace through King by suit.",
    "## Rules",
    "- Eight columns of four cards are dealt face up.",
    "- Build tableau down regardless of suit.",
    "- Move one card at a time and fill empty columns with any card.",
    "- Deal the stock once, one card at a time.",
  ],
};
