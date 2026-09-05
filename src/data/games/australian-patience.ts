import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";
export const australianPatience: GameDefinition = {
  path: "/australian-patience",
  title: "Australian Patience",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 35, difficulty: 70, luck: 45 },
  thumbnail: "AustralianPatience.jpg",
  background: GAME_BACKGROUNDS.savanah,
  gameColorDark: "#29382a",
  gameColorMid: "#a35a38",
  gameColorPale: "#f4d88d",
  cardDescription:
    "Yukon-style freedom meets strict suit building and a one-pass stock.",
  quickStart: [
    "Build foundations up by suit.",
    "Build tableau down by suit; only Kings fill spaces.",
    "Move any exposed tail and play the stock once.",
  ],
  howToPlay: [
    "## Objective",
    "Build all four foundations up by suit from Ace to King.",
    "## Rules",
    "- Seven columns begin with four face-up cards.",
    "- Build down by suit; only Kings fill empty columns.",
    "- Move any face-up card together with every card below it.",
    "- Turn the stock one card at a time with no redeal.",
  ],
};
