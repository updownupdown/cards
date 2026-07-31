import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const acesUp: GameDefinition = {
  path: "/aces-up",
  title: "Aces Up",
  tags: [GameTag.ClassicSolitaire, GameTag.EasyToLearn],
  rating: {
    complexity: 15,
    difficulty: 80,
    luck: 80,
  },
  thumbnail: "AcesUp.jpg",
  background: GAME_BACKGROUNDS.castle,
  cardBack: "AcesUp.png",
  cardColorBg: "#1d0f0a",
  cardColorText: "#eee0ca",
  cardDescription: "Discard low cards until only the four Aces remain.",
  quickStart: ["Discard lower same-suit exposes; deal four when stuck."],
  howToPlay: [
    "## Objective",
    "Discard the entire deck except the four Aces, leaving one Ace on each pile.",
    "## Setup",
    "- Deal one card face up to each of **4 piles**.",
    "- The remaining 48 cards stay in the **stock**.",
    "## Card values",
    "- **Aces are high** (above Kings) and can never be discarded.",
    "## Playing",
    "- Compare the top card of each pile. If two or more piles show the **same suit**, discard the lower-ranked card(s).",
    "- For example, with {KS} and {8S} showing, the {8S} is discarded.",
    "- Any top card may be moved into an **empty pile**.",
    "- When no more discards or moves are possible, deal another 4 cards, one onto each pile.",
    "## Winning",
    "You win when the stock is empty and only the **four Aces** remain, one per pile.",
  ],
  about: [
    "Aces Up, also known as Idiot's Delight, is a compact, luck-heavy discard game.",
    "It looks simple, but wins are rare and every empty-pile move matters.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
    creationDate: "First documented in 1900",
  },
};
