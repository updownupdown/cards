import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const klondike: GameDefinition = {
  path: "/klondike",
  title: "Klondike",
  tags: [GameTag.KlondikeFamily, GameTag.StockAndWaste],
  rating: {
    complexity: 20,
    difficulty: 60,
    luck: 50,
  },
  thumbnail: "Klondike.webp",
  thumbnailCredit: {
    title: "September Evening, Mount McKinley",
    artistName: "Sydney Laurence",
    date: "1925",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:September_Evening,_Mount_McKinley,_Alaska,_by_Sydney_Laurence.jpg",
  },
  background: GAME_BACKGROUNDS.yukon,
  animation: GameAnimations.Clouds,
  gameColorDark: "#2c3a36",
  gameColorPale: "#EEF0FF",
  gameColorAccent: "#ebc86f",
  cardBack: CardBackColors.Bicycle,
  quickStart: [
    "Build columns down in alternating colors.",
    "Move ordered runs together.",
    "Only a King fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, alternating colors |",
    "| Move | One card, or an ordered run |",
    "| Empty column | King only |",
    "| Stock | Draw 1 or 3, chosen in the settings |",
    "| Redeals | Unlimited |",
    "| Cards | 52 |",
  ],
};
