import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations/types";

export const canfield: GameDefinition = {
  path: "/canfield",
  title: "Canfield",
  tags: [GameTag.FoundationBuilders, GameTag.StockAndWaste],
  rating: {
    complexity: 35,
    difficulty: 45,
    luck: 40,
  },
  thumbnail: "Canfield.webp",
  thumbnailCredit: {
    title: "The Cardsharps",
    artistName: "Caravaggio",
    date: "circa 1595",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Caravaggio_(Michelangelo_Merisi)_-_The_Cardsharps_-_Google_Art_Project.jpg",
  },
  background: GAME_BACKGROUNDS.cozyRoom3,
  animation: GameAnimations.Dust,
  gameColorDark: "#311a1e",
  gameColorPale: "#E4F6FF",
  gameColorAccent: "#e2bf8d",
  cardBack: CardBackColors.Burgundy,
  quickStart: [
    "Foundations start at the first foundation card's rank.",
    "Build down in alternating colors.",
    "Empty columns fill from the reserve.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Up by suit from the first foundation card's rank, wrapping from King to Ace |",
    "| Build | Down, alternating colors, wrapping from Ace to King |",
    "| Move | One card, or an ordered run |",
    "| Empty column | From the reserve, then any card |",
    "| Reserve (13) | Top card is playable |",
    "| Stock | Draw 1 or 3, chosen in the settings |",
    "| Redeals | Unlimited |",
    "| Cards | 52 |",
  ],
};
