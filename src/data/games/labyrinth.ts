import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const labyrinth: GameDefinition = {
  path: "/labyrinth",
  title: "Labyrinth",
  tags: [
    GameTag.FoundationBuilders,
    GameTag.SpatialControl,
    GameTag.StockAndWaste,
  ],
  rating: {
    complexity: 20,
    difficulty: 65,
    luck: 75,
  },
  thumbnail: "Labyrinth.webp",
  thumbnailCredit: {
    title: "The Cretan Labyrinth",
    artistName: "Hieronymus Cock",
    date: "1558",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/268119",
  },
  background: GAME_BACKGROUNDS.stoneTunnel,
  animation: GameAnimations.ManaDust,
  gameColorDark: "#1c1f26",
  gameColorPale: "#dde4f2",
  gameColorAccent: "#97b4d8",
  cardBack: CardBackColors.Slate,
  quickStart: [
    "A card is free when the space above or below it is empty.",
    "Free cards go to the foundations.",
    "Deal a new row when stuck.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Playable | Cards with an empty space above or below |",
    "| Build | None |",
    "| Empty space | Only the first row refills, from the stock |",
    "| Stock | Deals a new row of 8 |",
    "| Redeals | None |",
    "| Cards | 52 |",
  ],
};
