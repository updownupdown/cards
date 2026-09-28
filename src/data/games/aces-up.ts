import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

export const acesUp: GameDefinition = {
  path: "/aces-up",
  title: "Aces Up",
  tags: [GameTag.ClearTheBoard, GameTag.TableauBuilding],
  rating: {
    complexity: 15,
    difficulty: 75,
    luck: 70,
  },
  thumbnail: "AcesUp.webp",
  thumbnailCredit: {
    title: "Playing Card: Ace of Spades",
    artistName: "Unknown artist",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/82930",
  },
  gameColorDark: "#1d0f0a",
  gameColorPale: "#eee0ca",
  cardBack: CardBackColors.Terracotta,
  quickStart: [
    "Discard an exposed card if a card of the same suit, but higher rank, is also exposed.",
    "Win by discarding all cards except the four Aces.",
    "Move cards to empty piles, and deal when stuck.",
  ],
  howToPlay: [
    "## Objective",
    "Discard the entire deck except the four Aces, leaving one Ace on each pile.",

    "## Discard Rules",
    "- Compare the top card of each pile. If two or more piles show the **same suit**, discard the **lower-ranked card(s)**.",
    "- **Aces are high** and can never be discarded.",
    "- Any top card may be moved into an **empty pile**.",
    "- When no more discards or moves are possible, deal another 4 cards, one onto each pile.",
  ],
};
