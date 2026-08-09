import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const memory: GameDefinition = {
  path: "/memory",
  title: "Memory",
  tags: [GameTag.EasyToLearn, GameTag.PairMatching],
  rating: {
    complexity: 15,
    difficulty: 35,
    luck: 5,
  },
  thumbnail: "Memory.jpg",
  background: GAME_BACKGROUNDS.savanah,
  cardBack: "Memory.jpg",
  gameColorDark: "#243b35",
  gameColorPale: "#e8f1df",
  cardDescription: "Reveal hidden pairs and clear the board using your memory.",
  quickStart: [
    "Clear the board by finding all matching pairs.",
    "You must match both rank and suit.",
  ],
  howToPlay: [
    "## Objective",
    "Clear the board by finding all matching pairs.",

    "## Matching",
    "- Tap one card to select it, then tap a second card to reveal both.",
    "- Matching cards move to the discard pile. Mismatched cards are turned face down again.",
    "- You can tap cards while two of them are face up to set them face down again faster.",
  ],
  about: ["A playing card based adaptation of the classic memory game."],
  credits: {
    creators: [GameCreators.Unknown],
  },
};
