import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";
export const josephine: GameDefinition = {
  path: "/josephine",
  title: "Josephine",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 40, difficulty: 65, luck: 40 },
  thumbnail: "Josephine.webp",
  background: GAME_BACKGROUNDS.greece,
  gameColorDark: "#332e40",
  gameColorMid: "#812e4a",
  gameColorPale: "#efe3d2",
  cardDescription:
    "A two-deck Forty Thieves relative where suited sequences move as a unit.",
  quickStart: [
    "Build eight foundations up by suit.",
    "Build tableau down by suit.",
    "Move suited runs and use the stock once.",
  ],
  howToPlay: [
    "## Objective",
    "Build eight foundations up by suit from Ace to King.",
    "## Rules",
    "- Build tableau down by suit.",
    "- Move complete descending suited runs together.",
    "- Any card may fill an empty column.",
    "- Turn the stock one card at a time with no redeal.",
  ],
};
