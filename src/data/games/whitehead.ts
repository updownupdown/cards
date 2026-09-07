import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";
export const whitehead: GameDefinition = {
  path: "/whitehead",
  title: "Whitehead",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 35, difficulty: 50, luck: 40 },
  background: GAME_BACKGROUNDS.london,
  gameColorDark: "#30383a",
  gameColorMid: "#5a94af",
  gameColorPale: "#edf0e6",
  thumbnail: "Whitehead.jpg",
  cardDescription:
    "An open Klondike relative built by color, with suited runs moving together.",
  quickStart: [
    "Build foundations up by suit.",
    "Build down in the same color.",
    "Move suited runs; any card fills a space.",
  ],
  howToPlay: [
    "## Objective",
    "Build four foundations up by suit from Ace to King.",
    "## Rules",
    "- All tableau cards are face-up.",
    "- Build down in the same color.",
    "- Properly ordered same-suit runs move together.",
    "- Any card may fill an empty column.",
  ],
};
