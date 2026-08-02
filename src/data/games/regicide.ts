import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const regicide: GameDefinition = {
  path: "/regicide",
  title: "Regicide",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 70,
    difficulty: 80,
    luck: 30,
  },
  thumbnail: "Regicide.jpg",
  background: GAME_BACKGROUNDS.castle,
  cardBack: "Regicide.png",
  gameColorDark: "#16162b",
  gameColorPale: "#f7e1ff",
  cardDescription:
    "Team up with the deck to topple 12 royals using suit-power combos.",
  quickStart: [
    "Play card/combo to damage royal; suit powers trigger on play. Discard cards totaling enemy attack after shield reduction.",
  ],
  howToPlay: [
    "## Objective",
    "Defeat all **12 royal enemies** — the Jacks, Queens, and Kings — one after another.",
    "## The enemies",
    "- **Jack**: 20 health, 10 attack.",
    "- **Queen**: 30 health, 15 attack.",
    "- **King**: 40 health, 20 attack.",
    "## Card values",
    "- Number cards are worth their face value.",
    "- An **Ace** (Animal Companion) is worth 1.",
    "- A defeated royal can be drawn and played, worth J = 10, Q = 15, K = 20.",
    "## Your turn",
    "1. **Play a card** (or a legal combo) against the enemy.",
    "2. **Activate its suit power**, equal to the value played.",
    "3. **Deal damage** equal to the total value played.",
    "4. If the enemy survives, it **attacks**: discard cards from your hand totalling at least its (reduced) attack value.",
    "## Suit powers",
    "- **Hearts** — heal: shuffle that many cards from the discard back beneath the deck.",
    "- **Diamonds** — draw that many cards.",
    "- **Clubs** — double the damage dealt.",
    "- **Spades** — shield: permanently reduce this enemy's attack by that value.",
    "## Immunity",
    "An enemy is **immune to the power of its own suit** — for example a {KH} ignores the Hearts heal.",
    "## Combos",
    "- Play an **Ace** alongside one other card to add their values and trigger both powers.",
    "- Play **two to four cards of the same rank** whose values total 10 or less as a single combo.",
    "## Defeating an enemy",
    "- Bring its health to **exactly 0** and it is placed on top of the deck to be drawn later.",
    "- Deal **more** than its health and it goes to the discard pile.",
    "## Winning",
    "Defeat all 12 enemies to win. Fewer **Jesters** earns a better result: Gold (0), Silver (1), Bronze (2). If you ever cannot cover an enemy's attack, you lose.",
  ],
  about: [
    "Regicide is a cooperative card game, played here solo, against a castle of corrupted royalty.",
    "Chain combos and suit powers to fell Jacks, Queens, and Kings before their counterattacks overwhelm you.",
    "Enemies grow tougher as you climb, so manage your hand and discard pile with care.",
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
