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
    "Build all four foundations by suit, from Ace to King.",
    "Only cards with an open space above or below are free.",
    "Tap the stock to deal a new row when you're stuck.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards onto the four foundations, built up by suit from Ace to King.",

    "## Rules",
    "- A card is **free** when the space directly above it or below it is empty, so the top and bottom rows are always free.",
    "- Tap a free card to play it to its foundation.",
    "- A gap in the **first row** is refilled automatically from the stock. Gaps further down stay empty.",
    "- Tap the **stock** to deal a new row of eight across the bottom. There is no redeal.",
  ],
};
