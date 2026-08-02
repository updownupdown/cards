import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const clearTheDungeon: GameDefinition = {
  path: "/clear-the-dungeon",
  title: "Clear the Dungeon",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 75,
    difficulty: 75,
    luck: 45,
  },
  thumbnail: "ClearTheDungeon.jpg",
  background: GAME_BACKGROUNDS.stoneTunnel,
  animation: GameAnimations.ManaDust,
  gameColorDark: "#352820",
  gameColorPale: "#fff6dc",
  cardDescription:
    "Exterminate twelve dungeon monsters with powerful attacks before your damage bar fills.",
  quickStart: ["Beat each monster with sum pair, then matching-suit trigger."],
  howToPlay: [
    "## Objective",
    "Defeat all **12 monsters** (the Jacks, Queens and Kings) before your power deck runs out, and before your damage bar fills up.",
    "## Setup",
    "- The face cards form the **dungeon**; the rest (A-10 plus two Jokers) are your **power deck**.",
    "- Only **uncovered** monsters can be attacked; clearing them reveals those behind.",
    "## Each turn",
    "- **Draw** three power cards into your hand.",
    "- **Attack:** it takes **three cards** to defeat a monster",
    "-- Two **attackers** that sum to **or above** its power (Jacks 11, Queens 12, Kings 13), and",
    "-- One **trigger** whose **suit matches** the monster (rank doesn't matter).",
    "- **Jokers** are wild: they count as **10** when used as an attacker, and count as any suit when used as a trigger.",
    "- Cards placed on a monster stay until it falls, so you can build an attack across turns.",
    "- **Discard** any card you can't or won't play; discards form your **damage bar**.",
    "## Losing & winning",
    "- If the damage bar reaches **7**, you lose immediately.",
    "- Clear every monster to win. Your **score** is the number of cards left in the power deck.",
    "## Variations (Settings)",
    "- **Dungeon Layout:** choose Levels 1-5, from the beginner grid to the extreme stack.",
    "- **Boomer-Ace:** Aces are worth 11 and bounce back to your hand when used as a trigger.",
    "- **Power Reserve:** draw five on turn one and keep two face-up cards to use anytime (each left over adds a point).",
    "- **Special Abilities:** defeated Kings grant one-time powers:",
    "-- K♥: place one card from your hand at the bottom of your power deck",
    "-- K♦: look at the bottom card of your power deck and move it to the top if you wish",
    "-- K♠: double the value of an attack card",
    "-- K♣: immediately draw a card from the power deck",
  ],
  about: [
    "Clear the Dungeon by Mark S. Ball casts you as the King's monster exterminator.",
    "Every attack needs raw power and the right weakness — spend your cards wisely and keep the damage bar low.",
  ],
  credits: {
    creators: [GameCreators.MarkSBall],
    creationDate: "2019",
  },
};
