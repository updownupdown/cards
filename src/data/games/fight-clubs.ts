import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const fightClubs: GameDefinition = {
  path: "/fight-clubs",
  title: "Fight Clubs",
  tags: [GameTag.CardCombat, GameTag.ScoringPuzzles],
  rating: {
    complexity: 70,
    difficulty: 70,
    luck: 35,
  },
  thumbnail: "FightClubs.webp",
  thumbnailCredit: {
    title: "Stag at Sharkey's",
    artistName: "George Bellows",
    date: "1909",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1922.1133",
  },
  background: GAME_BACKGROUNDS.club,
  animation: GameAnimations.Dust,
  gameColorDark: "#221b20",
  gameColorPale: "#d6fbff",
  gameColorAccent: "#9d97d8",
  cardBack: CardBackColors.Indigo,
  quickStart: [
    "Use one Club per turn to clear one or more cards from the grid.",
    "Some actions are always available.",
    "Other actions are blocked if 3 cards of a certain suit are in the grid.",
  ],
  howToPlay: [
    "## Objective",
    "Clear the grid and its draw deck before all 13 Club cards are spent.",

    "## Actions",
    "Some actions are always available:",
    "- **Match**: clears all matching ranks:",
    "-- {6C} clears {6D} {6H}",
    "-- {JC} clears {JS} {JD} {6H}",
    "- **Sum**: clears selected cards totaling the Club value:",
    "-- {8C} clears {3D} {4H} {AD}",
    "-- {QC} clears {9H} {5H}",
    "- **Any**: clears any one selected card:",
    "-- {5C} clears {7D}",
    "-- {AC} clears Joker",

    "\nSome actions are blocked by 3 cards of the same suit being present in the grid:",
    "- **Row/Column**: clears three selected cards in a row or column that contain the same rank as the selected Club.",
    "-- {7C} clears a row of {KD} {7H} {JS}",
    "-- {AC} clears a column of {AH} Joker {3H}",
    "-- Blocked by 3 Diamonds in the grid.",
    "- **Up/Down**: clears all grid cards whose ranks are higher or lower than a selected Club. 2-7 clears lower, and 7-Q clears higher.",
    "-- {4C} clears {3D} {3H} {AS}",
    "-- {9C} clears {10H} {10S} {JS} {QD}",
    "-- Blocked by 3 Spades in the grid.",
    "- **Run**: clears selected cards that form a consecutive run with your Club.",
    "-- {5C} clears {4D} {6H} {7S}",
    "-- {KC} clears {8S} {9D} {JD} {QH}",
    "-- Blocked by 3 Hearts in the grid.",

    "## Aces and Jokers",
    "- Aces are worth 1 point.",
    "- Jokers have no value and can only be cleared by the **Any** or **Row/Column** actions.",

    "## Difficulty",
    "**Easy** uses one Joker; **Hard** adds a second Joker to the grid deck.",
  ],
};
