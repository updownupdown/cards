import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const ebbAndFlow: GameDefinition = {
  path: "/ebb-and-flow",
  title: "Ebb & Flow",
  enabledOnLocalOnly: true,
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
    "Play at least two cards, then tap the deck to draw back up.",
    "A card one rank back in the same suit turns a pile back.",
  ],
  howToPlay: [
    "## Objective",
    "Play all **52 cards** onto the four piles.",

    "## Piles",
    "- **Rising piles:** play a card of the same rank as the top card, or higher.",
    "- **Falling piles:** play a card of the same rank as the top card, or lower.",
    "- Any card can start an empty pile. Aces are low and Kings are high.",

    "## Turning back",
    "- A card **one rank back in the same suit** can always be played: a 7♥ on a rising 8♥, or a 9♠ on a falling 8♠.",
    "- Save these cards: they win back room on a pile.",

    "## Turns",
    "- Play at least **two cards** each turn. You may play more.",
    "- Then tap the deck to draw back up to a full hand.",
    "- Once the deck is empty, play every card you can.",
    "- The game is lost when you can't play the cards you must.",

    "## Hand size",
    "- Easy: **8** cards",
    "- Normal: **7** cards",
    "- Hard: **6** cards",

    "## Tips",
    "- Every jump wastes ranks. Play cards that fit closely, even if it means playing more than two.",
    "- Hold on to cards that can turn a pile back until the pile needs them.",
  ],
};
