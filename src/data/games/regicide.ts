import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const regicide: GameDefinition = {
  path: "/regicide",
  title: "Regicide",
  tags: [GameTag.ModernMechanics, GameTag.CardCombat],
  rating: {
    complexity: 70,
    difficulty: 80,
    luck: 30,
  },
  thumbnail: "Regicide.jpg",
  background: GAME_BACKGROUNDS.monteCarlo,
  animation: GameAnimations.Clouds,
  cardBack: "Regicide.png",
  gameColorDark: "#16162b",
  gameColorPale: "#e2efff",
  cardDescription: "Topple the 12 royals using suit-powered combos.",
  quickStart: [
    "Play card/combo to damage royal; suit powers trigger on play. Discard cards totaling enemy attack after shield reduction.",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by defeating all 12 royal enemies (Jacks, Queens, and Kings).",
    "- Fewer Jesters earns a better result: Gold (0), Silver (1), Bronze (2).",
    "**Lose** if you cannot cover an enemy's attack.",

    "## The Enemies",
    "- **Jacks**: 20 health, 10 attack.",
    "- **Queens**: 30 health, 15 attack.",
    "- **Kings**: 40 health, 20 attack.",

    "## Card values",
    "- Number cards are worth their face value.",
    "- **Aces** (animal companions) are worth 1.",
    "- A defeated royal can be drawn and played; J = 10, Q = 15, K = 20.",

    "## Your turn",
    "1. **Play a card** (or a legal combo) against the enemy.",
    "2. **Activate its suit power**, equal to the value played.",
    "3. **Deal damage** equal to the total value played.",
    "4. If the enemy survives, it **attacks**: discard cards from your hand totalling at least its (reduced) attack value.",

    "## Suit powers",
    "- **Hearts** (heal): shuffle that many cards from the discard back beneath the deck.",
    "- **Diamonds:** draw that many cards.",
    "- **Clubs:** double the damage dealt.",
    "- **Spades** (shield): permanently reduce this enemy's attack by that value.",

    "## Immunity",
    "An enemy is **immune to the power of its own suit**.",

    "## Combos",
    "- Play an **Ace** alongside one other card to add their values and trigger both powers.",
    "- Play **two to four cards of the same rank** whose values total 10 or less as a single combo.",

    "## Defeating an enemy",
    "- Deal **more** damage than its health, and it goes to the discard pile.",
    "- Bring its health to **exactly 0** and it is placed on top of the Tavern deck, which allows you to drawn it later.",
  ],
  about: [
    "Regicide is a cooperative card game, played here solo, against a castle of corrupted royalty.",
    "Chain combos and suit powers to fell Jacks, Queens, and Kings before their counterattacks overwhelm you.",
    "Enemies grow tougher as you go, so manage your hand and discard pile with care.",
  ],
  credits: {
    creators: [
      GameCreators.PaulAbrahams,
      GameCreators.LukeBadger,
      GameCreators.AndyRichdale,
    ],
    creationDate: "2020",
  },
};
