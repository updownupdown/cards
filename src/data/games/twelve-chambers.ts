import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const twelveChambers: GameDefinition = {
  path: "/twelve-chambers",
  title: "Twelve Chambers",
  tags: [GameTag.ModernMechanics, GameTag.DungeonCrawler, GameTag.CardCombat],
  rating: {
    complexity: 75,
    difficulty: 75,
    luck: 45,
  },
  thumbnail: "TwelveChambers.jpg",
  background: GAME_BACKGROUNDS.stoneTunnel,
  animation: GameAnimations.ManaDust,
  gameColorDark: "#352820",
  gameColorPale: "#fff6dc",
  cardDescription:
    "Defeat twelve dungeon monsters by strategically planning your attacks.",
  quickStart: [
    "Defeat each monster with three cards (cards can be played across turns).",
    "The first two cards must add to (or exceed) the monster's rank.",
    "The last card must match the monster's suit.",
  ],
  howToPlay: [
    "## Objective",
    "- **Win** by defeating all **12 monsters** (the Jacks, Queens and Kings)",
    "- **Lose** if your stock deck or health run out.",
    "- Your score is the number of cards left in the power (stock) deck.",

    "## Attacks",
    "- Only **uncovered** monsters can be attacked; clearing them reveals those behind.",
    "- It takes **three cards** to defeat a monster:",
    "-- two **attackers** that sum to or above its power (J = 11, Q = 12, K = 13), and",
    "-- one **trigger** whose suit matches the monster (rank doesn't matter).",
    "- **Jokers** are wild:",
    "-- they count as **10** when used as an attacker",
    "-- they count as any suit when used as a trigger",
    "- Cards placed on a monster stay until it is defeated, so you can build an attack across turns.",
    "- **Discard** any card you can't or won't play; discards make you lose health.",

    "## Variations",
    "You can choose to play with any combination of the following variations (enabled in the settings):",
    "- **Dungeon Layout:** there are 5 layouts to choose from, in increasing levels of difficulty.",
    "- **Boomer-Ace:** Aces are worth 11 and return to your hand when used as a trigger.",
    "- **Power Reserve:** draw five on turn one and keep two face-up cards to use anytime (each left over adds a point).",
    "- **Special Abilities:** defeated Kings grant one-time powers:",
    "-- {KH}: place one card from your hand to the bottom of the stock deck",
    "-- {KD}: look at the bottom card of the stock deck and move it to the top if you wish",
    "-- {KS}: double the value of an attack card",
    "-- {KC}: immediately draw a card from the stock deck",
  ],
};
