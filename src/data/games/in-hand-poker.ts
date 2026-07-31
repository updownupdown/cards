import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const inHandPoker: GameDefinition = {
  path: "/in-hand-poker",
  title: "In-Hand Poker",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 30,
    difficulty: 30,
    luck: 50,
  },
  thumbnail: "InHandPoker.jpg",
  background: GAME_BACKGROUNDS.casino,
  cardColorBg: "#123a2a",
  cardColorText: "#f0d98a",
  cardDescription:
    "A pocket poker duel: draw, bet, and out-rank an opponent dealt from the same deck.",
  quickStart: [
    "Build hand, then bet; bigger bets make rival draw more; reach 10.",
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
  about: [
    "In-Hand Poker is a solitaire poker game you can play with a single deck.",
    "The bigger your bet, the more cards your unseen opponent draws — so a strong hand isn't always worth the risk.",
  ],
  credits: {
    creators: [GameCreators.JohnBurton],
    creationDate: "2021",
  },
};
