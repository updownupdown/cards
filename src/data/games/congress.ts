import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";
export const congress: GameDefinition = {
  path: "/congress",
  title: "Congress",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 35, difficulty: 60, luck: 50 },
  thumbnail: "Congress.webp",
  background: GAME_BACKGROUNDS.city,
  gameColorDark: "#292f38",
  gameColorMid: "#776940",
  gameColorPale: "#e9dfca",
  cardDescription:
    "Guide two decks through eight columns with one-card moves and a single stock pass.",
  quickStart: [
    "Build eight foundations up by suit.",
    "Build tableau down regardless of suit.",
    "Move one card at a time; any card fills a space.",
  ],
  howToPlay: [
    "## Objective",
    "Build eight foundations up by suit from Ace to King.",
    "## Rules",
    "- Build tableau down by rank, regardless of suit.",
    "- Move one exposed card at a time.",
    "- Any card may fill an empty column.",
    "- Turn the stock one card at a time with no redeal.",
  ],
};
