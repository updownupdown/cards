import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const ebbAndFlow: GameDefinition = {
  path: "/ebb-and-flow",
  title: "Ebb & Flow",
  tags: [GameTag.ModernMechanics, GameTag.SequenceBuilding],
  rating: {
    complexity: 30,
    difficulty: 50,
    luck: 40,
  },
  thumbnail: "EbbAndFlow.webp",
  thumbnailCredit: {
    title: "Beach at Low Tide (Mouth of the River)",
    artistName: "Hilaire Germain Edgar Degas",
    date: "1869",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/218848",
  },
  background: GAME_BACKGROUNDS.stonyBeach,
  animation: GameAnimations.Mist,
  gameColorDark: "#1a2430",
  gameColorPale: "#dfe9f0",
  gameColorAccent: "#e28da9",
  cardBack: CardBackColors.Navy,
  quickStart: [
    "Play cards from your hand: rising piles go up, falling piles go down.",
    "You may refill your hand from the stock when your hand is 2 cards short.",
    "A card one rank back in the same suit turns a pile back.",
  ],
  howToPlay: [
    "## Objective",
    "Play all **52 cards** onto the four piles.",

    "## Gameplay",
    "Any card can start an empty pile. Aces are low and Kings are high.",
    "- **Rising piles:** play a card of the same rank as the top card, or higher.",
    "- **Falling piles:** play a card of the same rank as the top card, or lower.",

    "A card **one rank back in the same suit** can always be played:",
    "- a {7H} on a rising {8H},",
    "- a {9S} on a falling {8S}, etc.",

    "You may refill your hand from the stock whenever your hand is 2 cards short.",
  ],
};
