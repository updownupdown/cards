import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const frog: GameDefinition = {
  path: "/frog",
  title: "Frog",
  aliases: ["Toad in the Hole"],
  tags: [GameTag.DoubleDeckers, GameTag.StockAndWaste],
  rating: {
    complexity: 25,
    difficulty: 50,
    luck: 50,
  },
  thumbnail: "Frog.webp",
  thumbnailCredit: {
    title:
      "Morning Glories and Tree-frog, from an untitled series of Large Flowers",
    artistName: "Katsushika Hokusai",
    date: "c. 1833/34",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/25099",
  },
  background: GAME_BACKGROUNDS.marsh,
  animation: GameAnimations.Firefly,
  gameColorDark: "#15261b",
  gameColorPale: "#e2f5c6",
  gameColorAccent: "#e8d56f",
  cardBack: CardBackColors.Moss,
  quickStart: [
    "Foundations ignore suit.",
    "Place each stock card on a waste pile.",
    "Waste cards only go to the foundations.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Ace to King, regardless of suit |",
    "| Reserve (13) | Top card is playable |",
    "| Waste piles (5) | Any card; only the top card plays, to a foundation |",
    "| Stock | Draw 1, onto a waste pile or a foundation |",
    "| Redeals | None |",
    "| Cards | 104 (two decks) |",
    "## Special rules",
    "- Tap a waste pile to place the stock card there, or double-tap a card to play it to a foundation.",
    "- One Ace starts on a foundation, and any Ace met while dealing the reserve goes up too.",
  ],
};
