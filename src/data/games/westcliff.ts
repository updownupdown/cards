import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const westcliff: GameDefinition = {
  path: "/westcliff",
  title: "Westcliff",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 25, difficulty: 35, luck: 55 },
  background: GAME_BACKGROUNDS.interchange,
  animation: GameAnimations.Clouds,
  gameColorDark: "#27363b",
  gameColorMid: "#5aa8af",
  gameColorPale: "#e4ece9",
  thumbnail: "Westcliff.webp",
  cardDescription:
    "A broad ten-column Klondike relative with generous open-column play.",
  quickStart: [
    "Build foundations up by suit from Ace to King.",
    "Build tableau down by alternating color.",
    "Move ordered runs; any card may fill an empty column.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to four foundations, building up by suit from Ace to King.",
    "## Rules",
    "- Ten columns begin with three cards each; only the bottom card is face-up.",
    "- Build down by alternating color.",
    "- Properly ordered runs may move together.",
    "- Any card or run may fill an empty column.",
    "- Turn the stock one card at a time with no redeal.",
  ],
};
