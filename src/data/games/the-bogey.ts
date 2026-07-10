import {
  GameDefinition,
  GameTag,
} from "../games-data";

export const theBogey: GameDefinition = {
  path: "/the-bogey",
  title: "The Bogey",
  thumbnail: "TheBogey.jpg",
  cardBack: "TheBogey.png",
  cardColorBg: "#0a1e1f",
  cardColorText: "#ddf0ce",
  cardDescription:
    "Build columns of cards in decreasing suit-matched sequences while playing against the mysterious Bogey.",
  stats: {
    complexity: 60,
    difficulty: 65,
    luck: 35,
  },
  tags: [GameTag.ModernMechanics],
  briefRules: [
    "Build columns with same-suit cards in decreasing value (K to A).",
    "Start with 5 cards in hand; draw to maintain 5 cards each turn.",
    "Alternate turns between you and the Bogey; the Bogey plays from the deck.",
    "Win by building columns efficiently: novice=12, normal=11, advanced=10, legendary=9, epic=8.",
  ],
  byLine: "Designer: Katharine Turner, 2016",
  about: [
    "Play against the Bogey in a tactical card game of columns and choices.",
    "Each decision to play, discard, or hold cards directly impacts your path to victory.",
    "The challenge lies in building enough columns to win while managing the Bogey's plays.",
  ],
  howToPlay: [
    "Start with an empty board and a hand of 5 cards dealt from a standard deck (no jokers).",
    "On your turn, draw cards to bring your hand back to 5. Then, for each card decide whether to play it, discard it, or hold it.",
    "Play a card by adding it to the bottom of an existing column (if same suit and lower value) or starting a new column (limited to 12 total).",
    "Cards in a column must be the same suit and decrease in value (K,Q,J,10,9,8,7,6,5,4,3,2,A), but may skip values.",
    "After your turn, the Bogey plays the next card from the deck. You choose which column it goes to.",
    "If the Bogey's card cannot be played legally, you lose immediately.",
    "When the deck runs out, shuffle the discards to create a new deck.",
    "You win by building columns efficiently. Fewer columns is better: aim for 12 (novice), 11 (normal), 10 (advanced), 9 (legendary), or 8 (epic).",
    "For a harder variant, start with a hand of 4 instead of 5, letting the Bogey play more often.",
  ],
};
