import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const doors: GameDefinition = {
  path: "/doors",
  title: "Doors",
  source: {
    title: "Onirim",
    designer: "Shadi Torbey",
    year: "2010",
    link: "https://boardgamegeek.com/boardgame/156546/onirim-second-edition",
  },
  enabledOnLocalOnly: true,
  tags: [GameTag.ModernMechanics, GameTag.SequenceBuilding],
  rating: { complexity: 60, difficulty: 65, luck: 50 },
  background: GAME_BACKGROUNDS.castleIndoors,
  animation: GameAnimations.CandleMotes,
  gameColorDark: "#2a2235",
  gameColorPale: "#e9dcf3",
  gameColorAccent: "#c9a6e6",
  cardBack: CardBackColors.Plum,
  quickStart: [
    "Play rooms into a path, never repeating the last symbol: 3, 6, 9 are suns; 4, 7, 10 moons; 2, 5, 8 keys.",
    "Three rooms of one suit in a row open one of its doors.",
    "Open all eight doors before the stock runs out.",
  ],
  howToPlay: [
    "## Objective",
    "Open all eight doors (the Kings and Queens) before the stock runs out. The dream fades if the stock is empty when your hand needs refilling.",

    "## The cards",
    "- Ranks 2 to 10 are **rooms**. A room's suit is its colour and its rank gives its symbol: {3H} {6H} {9H} are **suns**, {4H} {7H} {10H} are **moons** and {2H} {5H} {8H} are **keys**.",
    "- Kings and Queens are the eight **doors**, two of each suit.",
    "- Aces and the two Jokers are **nightmares**.",

    "## Your turn",
    "- You hold five rooms. Tap one, then press **Play** or **Discard**.",
    "- **Play** adds the room to the end of the path. Its symbol must differ from the symbol of the room before it; the first room may be any.",
    "- When the last three rooms of the path share a suit, a door of that suit is taken from the stock and opened. The count starts over after each door.",
    "- **Discard** throws the room out. Discarding a **key** brings a prophecy: the top five cards of the stock are shown, you tap one to throw it out, and the rest go back in the same order.",

    "## Refilling",
    "- After your action the hand is refilled to five from the stock, one card at a time.",
    "- A **door** drawn while you hold a key of its suit may be opened at once with **Claim**, spending the key, or set aside with **Let go**. Without such a key it is set aside.",
    "- A **nightmare** drawn demands a price: **Lose a key** (the first key in your hand is discarded), **Return a door** (the last door opened is set aside), **Burn five** (the top five cards of the stock are thrown out) or **Drop hand** (your whole hand is discarded and refilled with rooms only).",
    "- Cards set aside are shuffled back into the stock once the hand is full again.",

    "## Scoring",
    "- Your score is the number of doors open.",
  ],
};
