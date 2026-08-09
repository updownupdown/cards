import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const theBogey: GameDefinition = {
  path: "/the-bogey",
  title: "The Bogey",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 40,
    difficulty: 75,
    luck: 35,
  },
  thumbnail: "TheBogey.jpg",
  background: GAME_BACKGROUNDS.treeRain,
  animation: GameAnimations.Firefly,
  cardBack: "TheBogey.jpg",
  gameColorDark: "#1c423f",
  gameColorPale: "#e7f5ce",
  cardDescription:
    "Build columns of cards in decreasing suit-matched sequences while playing against the Bogey.",
  quickStart: ["Draw to 5, then play/discard/hold; unplayable bogey loses."],
  howToPlay: [
    "## Objective",
    "Build columns of cards in decreasing, suit-matched sequences while managing the Bogey's plays.",
    "You win by building columns efficiently; the fewer columns used is better.",

    "## Your Turn",
    "At the beginning of your turn, your hand is refilled. For each card, you may:",
    "- hold on to it,",
    "- discard it, or",
    "- play it to a column, if it is of the same suit and its top card is higher in value.",

    "## The Bogey's Turn",
    "After your turn, the Bogey plays the next card from the deck. You choose which column it goes to.",
    "If the Bogey's card cannot be played legally, you lose immediately.",

    "## Scoring",
    "Your score is the number of columns you have built when the deck runs out:",
    "- 12: Novice",
    "- 11: Normal",
    "- 10: Advanced",
    "- 9: Legendary",
    "- 8: Epic",

    "## Difficulty",
    "You can choose between a hand size of 5 (Easy) or 4 (Hard) in the settings. A smaller hand lets the Bogey play more often.",
  ],
  about: [
    "Play against the Bogey in a tactical card game of columns and choices.",
    "Each decision to play, discard, or hold cards directly impacts your path to victory.",
    "The challenge lies in building enough columns to win while managing the Bogey's plays.",
  ],
  credits: {
    creators: [GameCreators.KatharineTurner],
    creationDate: "2016",
  },
};
