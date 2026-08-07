import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const clubFight: GameDefinition = {
  path: "/club-fight",
  title: "Club Fight",
  tags: [GameTag.GridPlacement, GameTag.ScoringPuzzles],
  rating: {
    complexity: 70,
    difficulty: 70,
    luck: 35,
  },
  thumbnail: "ClubFight.jpg",
  background: GAME_BACKGROUNDS.club,
  cardBack: "ClubFight.jpg",
  gameColorDark: "#221b20",
  gameColorPale: "#d6fbff",
  cardDescription:
    "Spend the thirteen Clubs wisely to clear a shifting 3x3 grid before time runs out.",
  quickStart: [
    "Use one Club per turn. Three matching suits block Row/Column, Up/Down, or Run.",
  ],
  howToPlay: [
    "## Objective",
    "Clear the grid and its draw deck before all 13 Club cards are spent.",
    "## Actions",
    "**Match** clears matching ranks. **Sum** clears selected cards totaling the Club value. **Any** clears one selected card. **Row/Column** clears the matching selected card's row or column. **Up/Down** clears lower or higher ranks. **Run** clears selected cards that form a consecutive run with your Club.",
    "## Blocks",
    "Three Diamonds block Row/Column, three Spades block Up/Down, and three Hearts block Run. Jokers have no value and can only be cleared by Any or Row/Column.",
    "## Difficulty",
    "Easy uses one Joker; Hard adds a second Joker to the grid deck.",
  ],
  about: [
    "Club Fight is played with a traditional deck of cards, including one or two Jokers. Using only the 13 cards of the club deck",
  ],
  credits: {
    creators: [GameCreators.DTeuber],
    creationDate: "2023",
  },
};
