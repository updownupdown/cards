import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const inHandPoker: GameDefinition = {
  path: "/in-hand-poker",
  title: "In-Hand Poker",
  tags: [GameTag.PokerAndCribbage, GameTag.ScoringPuzzles],
  rating: {
    complexity: 30,
    difficulty: 30,
    luck: 50,
  },
  thumbnail: "InHandPoker.jpg",
  background: GAME_BACKGROUNDS.casino,
  animation: GameAnimations.Dust,
  gameColorDark: "#142e1f",
  gameColorPale: "#fff5bd",
  cardDescription:
    "A pocket poker duel: draw, bet, and out-rank an opponent dealt from the same deck.",
  quickStart: [
    "Build a poker hand, then bet.",
    "Bigger bets make your rival draw more cards.",
    "Reach 10 points to win, or 0 to lose.",
  ],
  howToPlay: [
    "## Objective",
    "You start with 5 points. **Win** by reaching 10, or **lose** by dropping to 0.",

    "## Turn Order",
    "1. **Draw 5 cards**",
    "2. **Play or fold:** folding costs nothing, but folding **three times in a row** loses the game.",
    "3. **Discard & redraw** up to **3 times** to improve your hand.",
    "4. **Bet:** your minimum bet equals the number of times you drew:",
    "- 1 draw \u2192 bet 1, 2, or 3",
    "- 2 draws \u2192 bet 2 or 3",
    "- 3 draws \u2192 bet 3",
    "\n5. **Opponent draws** 5 cards plus one extra per point you bet (6, 7, or 8), and keeps its **best five**.",
    "6. **Compare hands** by standard poker ranking. Ties are broken by the highest card.",

    "## Jokers",
    "Turn on **Wild Jokers** in the settings to add two jokers that count as any card not already in the hand.",
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
