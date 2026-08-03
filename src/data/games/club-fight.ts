import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";

export const clubFight: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/club-fight",
  title: "Club Fight",
  tags: [GameTag.GridPlacement, GameTag.ScoringPuzzles],
  rating: {
    complexity: 70,
    difficulty: 70,
    luck: 35,
  },
  background: GAME_BACKGROUNDS.casino2,
  gameColorDark: "#172b26",
  gameColorPale: "#e4f1c8",
  cardDescription:
    "Spend the thirteen Clubs wisely to clear a shifting 3x3 grid before time runs out.",
  quickStart: [
    "Use one Club per turn. Three matching suits block Line, Up/Down, or Run.",
  ],
  howToPlay: [
    "## Objective",
    "Clear the grid and its draw deck before all 13 Club cards are spent.",
    "## Actions",
    "**Match** clears matching ranks. **Sum** clears selected cards totaling the Club value. **Any** clears one card. **Line** clears a matching row or column. **Up/Down** clears lower or higher ranks. **Run** clears selected cards that form a consecutive run with your Club.",
    "## Blocks",
    "Three Diamonds block Line, three Spades block Up/Down, and three Hearts block Run. Jokers have no value and can only be cleared by Any or Line.",
    "## Difficulty",
    "Easy uses one Joker; Hard adds a second Joker to the grid deck.",
  ],
};
