import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";
export const australianPatience: GameDefinition = {
  path: "/australian-patience",
  title: "Australian Patience",
  tags: [GameTag.YukonFamily, GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 35, difficulty: 70, luck: 45 },
  thumbnail: "AustralianPatience.webp",
  thumbnailCredit: {
    title: "Down on His Luck",
    artistName: "Frederick McCubbin",
    date: "1889",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Down_on_his_luck_Frederick_McCubbin.jpg",
  },
  background: GAME_BACKGROUNDS.savanah,
  animation: GameAnimations.Birds,
  gameColorDark: "#29382a",
  gameColorPale: "#f4d88d",
  cardBack: CardBackColors.Copper,
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
