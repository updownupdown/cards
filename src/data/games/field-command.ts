import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const fieldCommand: GameDefinition = {
  path: "/field-command",
  title: "Field Command",
  source: {
    title: "Card Capture",
    designer: "Lucas Gentry",
    year: "2018",
    link: "https://boardgamegeek.com/boardgamedesigner/109557/lucas-gentry",
  },
  tags: [GameTag.CardCombat],
  rating: {
    complexity: 60,
    difficulty: 50,
    luck: 40,
  },
  thumbnail: "FieldCommand.webp",
  thumbnailCredit: {
    title: "Battle Scene",
    artistName: "Hippolyte Bellangé",
    date: "c. 1825",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/93394",
  },
  background: GAME_BACKGROUNDS.field,
  animation: GameAnimations.Clouds,
  gameColorDark: "#2b2d42",
  gameColorPale: "#d4cdc3",
  gameColorAccent: "#e3c77e",
  cardBack: CardBackColors.Violet,
  quickStart: ["Enemy line shifts right, then refills from enemy deck."],
  howToPlay: [
    "## Objective",
    "**Win** by emptying the Enemy Draw Deck and all enemy positions.",
    "**Lose** if any Jack, Queen, King, or Ace enters the Enemy Capture Pile.",

    "## Gameplay",
    "At the beginning of a turn, you may optionally discard any number of cards from your hand.",

    "Then choose exactly one capture option:",
    "- **Capture an enemy card**: select any enemy card and any number of hand cards of the same suit with equal or greater total value.",
    "- **Let the enemy capture**: select a hand card to be captured by the right-most enemy card.",
    "- **Sacrifice**: select two hand cards and an enemy card (you may not select J/Q/K/A, since that would immediately lose the game).",

    "## Aces and Jokers",
    "- Aces are worth 14",
    "- Jokers are wild and can be used as any suit or value.",
  ],
};
