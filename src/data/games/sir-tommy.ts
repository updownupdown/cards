import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const sirTommy: GameDefinition = {
  path: "/sir-tommy",
  title: "Sir Tommy",
  aliases: ["Old Patience", "Puss in the Corner"],
  tags: [GameTag.FoundationBuilders, GameTag.StockAndWaste],
  rating: {
    complexity: 20,
    difficulty: 60,
    luck: 60,
  },
  thumbnail: "SirTommy.webp",
  thumbnailCredit: {
    title: "Sir Thomas More",
    artistName: "Hans Holbein the Younger",
    date: "1527",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Hans_Holbein,_the_Younger_-_Sir_Thomas_More_-_Google_Art_Project.jpg",
  },
  background: GAME_BACKGROUNDS.london,
  animation: GameAnimations.Rain,
  gameColorDark: "#1a2c33",
  gameColorPale: "#fdf7d9",
  gameColorAccent: "#e28d94",
  cardBack: CardBackColors.Teal,
  quickStart: [
    "Foundations ignore suit.",
    "Place each stock card on a waste pile.",
    "Waste cards only go to the foundations.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, regardless of suit |",
    "| Waste piles (4) | Any card; only the top card plays, to a foundation |",
    "| Stock | Draw 1, onto a waste pile or a foundation |",
    "| Redeals | None |",
    "| Cards | 52 |",
    "## Special rules",
    "- Tap a waste pile to place the stock card there, or double-tap a card to play it to a foundation.",
    "## Variants",
    "- **Puss in the Corner**: the Aces start on the foundations, which build up by color, and the waste piles can be gathered for one redeal.",
  ],
};
