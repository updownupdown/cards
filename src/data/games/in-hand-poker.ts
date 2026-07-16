import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const inHandPoker: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/in-hand-poker",
  tip: {
    default: {
      text: "Build hand, then bet; bigger bets make rival draw more; reach 10.",
    },
  },
  title: "In-Hand Poker",
  thumbnail: DEFAULT_GAME_THUMBNAIL,
  cardColorBg: "#123a2a",
  cardColorText: "#f0d98a",
  background: "felt-green.jpg",
  cardDescription:
    "A pocket poker duel: draw, bet, and out-rank an opponent dealt from the same deck.",
  stats: {
    complexity: 45,
    difficulty: 45,
    luck: 55,
  },
  // tags: [GameTag.ModernMechanics, GameTag.EasyToLearn, GameTag.AIGenerated],
  tags: [GameTag.Beta],
  briefRules: [
    "Draw 5 cards, then play or fold (three folds in a row loses).",
    "Discard and redraw up to 3 times; your draw count sets your minimum bet.",
    "Bet 1-3 points; the opponent draws 5 cards plus one per point you bet.",
    "Beat the opponent's best five to gain your bet; reach 10 to win, hit 0 to bust.",
  ],
  about: [
    "In-Hand Poker is a solitaire poker game you can play with a single deck.",
    "The bigger your bet, the more cards your unseen opponent draws — so a strong hand isn't always worth the risk.",
  ],
  howToPlay: [
    "## Objective",
    "Start at **5 points** and reach **10** without dropping to **0**.",
    "## Each round",
    "1. **Draw 5 cards.**",
    "2. **Play or fold.** Folding costs nothing, but folding **three times in a row** loses the game.",
    "3. **Discard & redraw** up to **3 times** to improve your hand.",
    "4. **Bet.** Your minimum bet equals the number of times you drew:",
    "- Drew once \u2192 bet 1 (raise to 2 or 3)",
    "- Drew twice \u2192 bet 2 (raise to 3)",
    "- Drew thrice \u2192 bet 3",
    "5. **Opponent draws** 5 cards plus one extra per point you bet (6, 7, or 8), and keeps its **best five**.",
    "6. **Compare hands** by standard poker ranking; ties break on the highest cards.",
    "## Scoring",
    "- Win the round: **add** your bet. Lose: **subtract** it.",
    "- Reach **10** to win; fall to **0** and you bust.",
    "## Jokers (Settings)",
    "- Turn on **Wild Jokers** to add two jokers that count as any card not already in the hand.",
  ],
};
