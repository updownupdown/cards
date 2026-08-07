import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameDefinition, GameTag } from "../games-data";

export const solatro: GameDefinition = {
  path: "/solatro",
  title: "Solatro",
  tags: [GameTag.PokerAndCribbage, GameTag.ModernMechanics],
  rating: {
    complexity: 62,
    difficulty: 72,
    luck: 55,
  },
  background: GAME_BACKGROUNDS.painting,
  animation: GameAnimations.Firefly,
  thumbnail: "Solatro.jpg",
  gameColorDark: "#111e35",
  gameColorPale: "#d8ffeb",
  cardDescription:
    "Build poker hands, bank wild Jokers, and spend excess points to survive escalating rounds.",
  quickStart: [
    "Select up to five cards and play three poker hands. Meet the round target, then spend excess points on bonuses for future rounds.",
  ],
  howToPlay: [
    "## Objective",
    "Survive as many rounds as possible by meeting each round's score target. The target starts at **25** and rises by **25** every round.",
    "## Each Round",
    "Draw to eight cards. You have **3 plays** and **3 discards**. A discard may contain 1–5 cards. After either action, draw back to your current hand limit.",
    "On a play, select up to five cards. Played cards are set aside. After all plays, compare your total with the target. At the end of the round, your hand, discards, and played cards are shuffled back into the deck.",
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
    "## Jokers",
    "Jokers are wild. When one is drawn, it is banked and a replacement is drawn. Add a banked Joker to a future play; it is discarded after use. If another Joker appears while one is banked, both are lost to the discard.",
    "## Bonus Shoppe",
    "Excess points above the target become shop points for that round. Your full excess is also added to your final score. Unspent shop points expire when the next round starts, and you may own only one of each bonus.",
    "- Extra Card (**10**): increase your hand limit by one this round.",
    "- Extra Discard (**25**): gain one discard this round.",
    "- Pocket Points (**50**): add 25 points this round.",
    "- Extra Hand (**75**): gain one play this round.",
    "- Double Score (**100**): double your next play.",
    "- Shield (**150**): automatically survive one failed round.",
    "## Ending and Rating",
    "Without a Shield, missing a target ends the game. Your final score is the sum of all excess points earned. Ratings are **Cat Food** at 3 rounds, **Little Dweeb** at 5, **Official Dweeb** at 7, and **Ultra Mega Uber Giga-Dweeb** at 10 or more.",
  ],
  about: [
    "Solatro is an escalating poker solitaire game about turning strong hands into just enough momentum for one more round.",
  ],
  credits: {
    creators: [GameCreators.TechDweeb],
  },
};
