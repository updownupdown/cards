import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const risingStakes: GameDefinition = {
  path: "/rising-stakes",
  title: "Rising Stakes",
  tags: [GameTag.PokerAndCribbage, GameTag.ModernMechanics],
  rating: {
    complexity: 62,
    difficulty: 72,
    luck: 55,
  },
  background: GAME_BACKGROUNDS.painting,
  animation: GameAnimations.Firefly,
  thumbnail: "RisingStakes.jpg",
  // cardBack: "RisingStakes.jpg",
  gameColorDark: "#111e35",
  gameColorPale: "#d8ffeb",
  cardDescription:
    "Build poker hands, bank wild Jokers, and spend excess points to survive escalating rounds.",
  quickStart: [
    "Select up to five cards to play poker hands (or discard).",
    "Meet the round target to survive to the next round.",
  ],
  howToPlay: [
    "## Objective",
    "Survive as many rounds as possible by meeting each round's score target. The target starts at **25** and rises by **25** every round.",
    "- Win by scoring 500 total bonus points across all rounds.",
    "- The game ends when you fail to meet a round's target (and a Shield bonus is not available).",

    "## Turn Order",
    "- Each round starts by drawing your hand to **8 cards**, with **3 plays** and **3 discards**.",
    "- You may **discard** up to **5 cards** to the discard pile, then draw back to your hand limit.",
    "- You may **play** up to **5 cards** to form a poker hand.",
    "- Each play will add to your score for that round. Surplus points above the target can be spent in the Bonus Shoppe between rounds.",

    "## Jokers",
    "Jokers are wild and may be used in your hand at any time. When one is drawn, it is banked, and a replacement card is drawn to your hand. If another Joker appears while one is banked, both are lost.",

    "## Hand Scores",
    "- High Card: **5**",
    "- Pair: **10**",
    "- Two Pair: **20**",
    "- Three of a Kind: **30**",
    "- Straight: **40**",
    "- Flush: **50**",
    "- Full House: **60**",
    "- Four of a Kind: **100**",
    "- Straight Flush: **125**",
    "- Royal Flush: **150**",

    "## Bonus Shoppe",
    "Surplus points above the target become shop points after that round. Unspent shop points expire when the next round starts. You may own only one of each bonus at any time.",
    "- **+ Card** (10): increase your hand limit by one this round",
    "- **+ Discard** (25): gain one discard this round",
    "- **+ 25 pts** (50): add 25 points this round",
    "- **+ Hand** (75): gain one play this round.",
    "- **x2 Score** (100): double your next play",
    "- **Shield** (150): automatically survive one failed round",

    "## Score Rating",
    "Your final score is the sum of all surplus points earned. Ratings are:",
    "- **♠**: 3 rounds",
    "- **♠♠**: 5 rounds",
    "- **♠♠♠**: 7 rounds",
    "- **♠♠♠♠**: 10+ rounds",
  ],
};
