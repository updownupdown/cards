import { GameDefinition, GameTag } from "../games-data";

export const cardCapture: GameDefinition = {
  path: "/card-capture",
  tip: {
    enemyPhase: {
      text: "Enemy line shifts right, then refills from enemy deck.",
    },
    discardPhase: {
      text: "Discard any cards; next phase draws back up to 4.",
    },
    drawPhase: {
      text: "Draw to 4 from your deck (2s, 3s, 4s, jokers).",
    },
    capturePhase: {
      text: "Capture by same-suit total >= enemy, or let capture, or sacrifice.",
    },
    gameOver: {
      text: "Battle over.",
    },
  },
  title: "Card Capture",
  enabledOnLocalOnly: true,
  thumbnail: "CardCapture.jpg",
  cardBack: "CardCapture.png",
  background: "rock-wall.jpg",
  cardColorBg: "#2b2d42",
  cardColorText: "#d4cdc3",
  cardDescription:
    "Use low cards and jokers to dismantle enemy forces, while protecting every Ace and face card from capture.",
  rating: {
    complexity: 40,
    difficulty: 50,
    luck: 40,
  },
  tags: [GameTag.ModernMechanics],
  about: [
    "Card Capture is a tactical, phase-based solitaire game where weak cards become precision tools.",
    "You fight stronger enemies by converting value efficiently, controlling suits, and timing discards between rounds.",
    "Every capture choice has risk: take an enemy now, allow Position 1 to take one of yours, or sacrifice two cards to delay a threat.",
    "The central tension is protection: Aces and face cards must never end up in the Enemy Capture Pile.",
  ],
  byLine: "Game design by Lucas Gentry, 2018",
  howToPlay: [
    "Setup decks: take all 2s, 3s, 4s, plus both jokers as your Personal Draw Deck. Shuffle all remaining cards as the Enemy Draw Deck.",
    "Layout: top row is Enemy Draw Deck, then enemy Positions 1-4, then Enemy Capture Pile. Bottom row is Personal Draw Deck, your hand area (up to 4 cards), then your discard pile.",
    "Initial enemy row: deal 4 cards face up into Positions 1-4. After all 4 are placed, move any Jack, Queen, King, or Ace among them to the bottom of the Enemy Draw Deck. Empty positions stay empty until Enemy Phase refill.",
    "1) Enemy Phase: if positions are empty, shift existing enemy cards to the right to fill gaps, then draw from Enemy Draw Deck to refill open positions. If the enemy deck is empty, skip refills.",
    "2) Discard Phase: discard any number of cards from your hand to your discard pile.",
    "3) Draw Phase: draw from your Personal Draw Deck until you have 4 cards in hand. If needed, shuffle your discard pile to form a new Personal Draw Deck, then keep drawing.",
    "4) Capture Phase - choose exactly one option:",
    "4A Capture an enemy card: choose an enemy card and spend hand cards of the same suit with equal or greater total value. Spent cards and captured enemy card go to your discard pile.",
    "4B Let the enemy capture: take the enemy card in Position 1 and one card from your hand; place both into the Enemy Capture Pile.",
    "4C Sacrifice: place any two non-combatant cards from your hand into the Enemy Capture Pile, then choose one enemy row card to place at the bottom of the Enemy Draw Deck.",
    "Values: number cards use face value, J=11, Q=12, K=13, A=14, jokers are wild.",
    "Loss condition: if any Jack, Queen, King, or Ace enters the Enemy Capture Pile at any time, you lose immediately.",
    "Win condition: at the end of a Capture Phase, if Enemy Draw Deck is empty and all enemy positions are empty, and no combatant was captured by the enemy, you win. Otherwise begin the next round at Enemy Phase.",
  ],
};
