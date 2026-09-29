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
    "Build foundations up by suit.",
    "Build tableau columns down by alternating color.",
    "Empties use reserve.",
  ],
  howToPlay: [
    "## Objective",
    "Send all 52 cards to their foundations, building up by suit from the base rank and wrapping from King to Ace.",

    "## Foundations",
    "- Build foundations **up by suit** from the base rank.",
    "- Foundations wrap past the King back to the Ace, for example: 10, J, Q, K, A, 2, 3, etc.",

    "## Tableau",
    "- Build tableau columns down in **alternating colors** (wrapping from Ace to King).",
    "- Move single cards or an ordered group of cards between columns.",
    "- When a tableau column empties, it is refilled from the **reserve** (or, once the reserve is gone, by any card).",

    "## Stock",
    "Turn cards from the stock (one or three at a time, depending on your settings) to the waste. You may redeal as often as you like.",
  ],
};
