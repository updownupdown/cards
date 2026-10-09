import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";
export const australianPatience: GameDefinition = {
  path: "/australian-patience",
  title: "Australian Patience",
  tags: [GameTag.YukonFamily, GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 30, difficulty: 70, luck: 45 },
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
  gameColorAccent: "#eb9a6a",
  cardBack: CardBackColors.Copper,
  quickStart: [
    "Build down by suit.",
    "Move any face-up card with every card on it.",
    "Only a King fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, same suit |",
    "| Move | Any face-up card, with every card on it |",
    "| Empty column | King only |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "| Cards | 52 |",
  ],
};
