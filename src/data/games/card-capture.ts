import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const cardCapture: GameDefinition = {
  path: "/card-capture",
  title: "Card Capture",
  tags: [GameTag.ModernMechanics, GameTag.CardCombat],
  rating: {
    complexity: 60,
    difficulty: 50,
    luck: 40,
  },
  thumbnail: "CardCapture.jpg",
  background: GAME_BACKGROUNDS.field,
  animation: GameAnimations.Clouds,
  cardBack: "CardCapture.png",
  gameColorDark: "#2b2d42",
  gameColorPale: "#d4cdc3",
  cardDescription:
    "Use low cards and jokers to dismantle enemy forces, while protecting every Ace and face card from capture.",
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
    "- **Sacrifice**: select two hand cards and an enemy card (you may not select J/Q/K/A, since would immediately lose the game).",

    "## Aces and Jokers",
    "- Aces are worth 14",
    "- Jokers are wild and can be used as any suit or value.",
  ],
  credits: {
    creators: [GameCreators.LucasGentry],
    creationDate: "2018",
  },
};
