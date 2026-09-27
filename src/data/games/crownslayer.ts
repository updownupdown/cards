import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const crownslayer: GameDefinition = {
  path: "/crownslayer",
  title: "Crownslayer",
  tags: [GameTag.CardCombat],
  rating: {
    complexity: 70,
    difficulty: 80,
    luck: 40,
  },
  thumbnail: "Crownslayer.webp",
  thumbnailCredit: {
    title: "The King, from The Dance of Death",
    artistName: "Hans Holbein the Younger",
    date: "ca. 1526",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:The_King,_from_The_Dance_of_Death_MET_DP-19849-001.jpg",
  },
  background: GAME_BACKGROUNDS.monteCarlo,
  animation: GameAnimations.Clouds,
  gameColorDark: "#1b1727",
  gameColorPale: "#e2e9ff",
  cardBack: CardBackColors.Indigo,
  cardDescription: "Topple the 12 royals using suit-powered combos.",
  quickStart: [
    "Defeat 12 royals, one at a time.",
    "Suits have powers; enemies are immune to their own suit; Aces allow combos.",
    "Attack phase: play any card(s) to deal damage.",
    "Defend phase: discarded cards must total at least the enemy attack.",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by defeating all 12 royal enemies (Jacks, Queens, and Kings).",
    "**Lose** if you cannot cover an enemy's attack.",

    "## Turn Order",

    "**Attack**",
    "- Dealing an enemy **more** damage than its health will send it to the discard pile.",
    "- Bringing its health to **exactly 0** sends it to the Tavern deck, which allows you to draw it later.",
    "-- Drawn enemy attack values:\nJacks = 10, Queens = 15, Kings = 20",

    "\n**Defend**",
    "- If the enemy survives your last attack, it counter-attacks.",
    "- Discard cards from your hand totalling at least its attack value.",
    "- The **♠ Spades** suit power can be used to reduce the attack value.",

    "## Suit Powers",
    "The power strength depends on the card's rank. Enemies are **immune to the power of their own suit**.",
    "- **♥ Hearts** (heal): shuffles that many cards from the discard back beneath the deck.",
    "- **♦ Diamonds:** draw that many cards.",
    "- **♣ Clubs:** double the damage dealt.",
    "- **♠ Spades** (shield): permanently reduce this enemy's attack by that value.",

    "## Combos",
    "- Play an **Ace** (animal companion) with another card to add their values and trigger both powers.",
    "- Play **two to four cards of the same rank**, whose values total 10 or less, as a single combo.",

    "## The Enemies",
    "- **Jacks**: 20 health, 10 attack.",
    "- **Queens**: 30 health, 15 attack.",
    "- **Kings**: 40 health, 20 attack.",

    "## Jesters",
    "- Jesters can be activated to **discard your hand and refill** it to 8 cards.",
    "- Use fewer Jesters for better scores:",
    "-- Gold: 0 Jesters used",
    "-- Silver: 1 Jester used",
    "-- Bronze: 2 Jesters used",
  ],
};
