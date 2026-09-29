import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const pocketPoker: GameDefinition = {
  path: "/pocket-poker",
  title: "Pocket Poker",
  tags: [GameTag.PokerAndCribbage, GameTag.ScoringPuzzles],
  rating: {
    complexity: 30,
    difficulty: 40,
    luck: 60,
  },
  thumbnail: "PocketPoker.webp",
  thumbnailCredit: {
    title: "Poker",
    artistName: "Félix Vallotton",
    date: "1896",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1959.303",
  },
  background: GAME_BACKGROUNDS.casino,
  animation: GameAnimations.Glitter,
  gameColorDark: "#142e1f",
  gameColorPale: "#fff5bd",
  cardBack: CardBackColors.Moss,
  quickStart: [
    "Build a poker hand, then bet.",
    "Bigger bets make your rival draw more cards.",
    "Reach 10 points to win, or drop to 0 to lose.",
  ],
  howToPlay: [
    "## Objective",
    "Reach **10 points** to win. You lose if a bet drops your score to 0.",

    "## Turn Order",
    "1. **Draw 5 cards**",
    "2. **Play or fold:** folding costs **1 point**. After **two folds in a row**, or at 1 point, you must play. Playing resets the fold count.",
    "3. **Discard & redraw** up to **2 times** to improve your hand.",
    "4. **Bet:** your minimum bet equals the number of times you drew:",
    "- 1 draw \u2192 bet 1, 2, or 3",
    "- 2 draws \u2192 bet 2 or 3",
    "\n5. **Opponent draws** cards based on the selected difficulty and keeps its **best five**.",
    "6. **Compare hands** by standard poker ranking. Ties are broken by the highest card.",
    "7. **Undo** is unavailable after a redraw, showdown, or new deal reveals hidden cards.",

    "## Difficulty",
    "- **Normal:** start at 5 points; ties push; the opponent draws 5 cards plus your bet.",
    "- **Hard:** start at 3 points; the house wins ties; the opponent draws 5 cards plus your bet.",
    "- **Expert:** Hard rules, but the opponent draws 6 cards plus your bet.",

    "## Jokers",
    "Turn on **Wild Jokers** in the settings to add two jokers that count as any card not already in the hand.",
  ],
};
