import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const clearTheDungeon: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/clear-the-dungeon",
  tip: {
    default: {
      text: "Beat each monster with sum pair, then matching-suit trigger.",
    },
  },
  title: "Clear the Dungeon",

  thumbnail: DEFAULT_GAME_THUMBNAIL,
  cardColorBg: "#221c2e",
  cardColorText: "#e6dcff",
  background: "medieval-blocks.jpg",
  cardDescription:
    "Exterminate twelve dungeon monsters with powerful attacks before your damage bar fills.",
  rating: {
    complexity: 75,
    difficulty: 75,
    luck: 45,
  },
  // tags: [GameTag.ModernMechanics, GameTag.AIGenerated],
  tags: [GameTag.Beta],
  about: [
    "Clear the Dungeon by Mark S. Ball casts you as the King's monster exterminator.",
    "Every attack needs raw power and the right weakness — spend your cards wisely and keep the damage bar low.",
  ],
  byLine: "Game design by Mark S. Ball, 2019",
  howToPlay: [
    "## Objective",
    "Defeat all **12 monsters** (the Jacks, Queens and Kings) before your power deck runs out.",
    "## Setup",
    "- The face cards form the **dungeon**; the rest (A-10 plus two Jokers) are your **power deck**.",
    "- Only **uncovered** monsters can be attacked; clearing them reveals those behind.",
    "## Each turn",
    "- **Draw** three power cards into your hand.",
    "- **Attack:** it takes **three cards** to defeat a monster — two **attackers** that sum to **or above** its power (Jacks 11, Queens 12, Kings 13), then a **trigger** whose **suit matches** the monster (rank doesn't matter).",
    "- **Jokers** are wild: power **10** and any suit as a trigger.",
    "- Cards placed on a monster stay until it falls, so you can build an attack across turns.",
    "- **Discard** any card you can't or won't play — discards form your **damage bar**.",
    "## Losing & winning",
    "- If the damage bar reaches **7 cards**, you lose immediately.",
    "- Clear every monster to win. Your **score** is the number of cards left in the power deck.",
    "## Variations (Settings)",
    "- **Dungeon Layout:** choose Levels 1-5, from the beginner grid to the extreme stack.",
    "- **Boomer-Ace:** Aces are worth 11 and bounce back to your hand when used as a trigger.",
    "- **Power Reserve:** draw five on turn one and keep two face-up cards to use anytime (each left over adds a point).",
    "- **Special Abilities:** defeated Kings grant one-time powers — bury a card (K\u2665), bottom-to-top (K\u2666), double an attacker (K\u2660), or draw (K\u2663).",
  ],
};
