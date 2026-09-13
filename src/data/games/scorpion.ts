import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";

export const scorpion: GameDefinition = {
  path: "/scorpion",
  title: "Scorpion",
  tags: [GameTag.SequenceBuilding],
  rating: {
    complexity: 40,
    difficulty: 75,
    luck: 50,
  },
  thumbnail: "Scorpion.webp",
  background: GAME_BACKGROUNDS.sahara,
  gameColorDark: "#352b21",
  gameColorMid: "#aa5743",
  gameColorPale: "#fff3e4",
  cardDescription:
    "Untangle face-up columns into four same-suit runs from King to Ace.",
  quickStart: [
    "Build the four foundations, by suit, from K to A.",
    "Move any face-up stack, even if out of sequence.",
    "Only Kings may fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Build **four complete same-suit sequences**, each running from King down to Ace.",

    "## Rules",
    "- Build columns **down in rank and in the same suit**.",
    "- You may pick up **any face-up card** and move it together with **every card on top of it**, even if those cards are not in sequence.",
    "- Only a **King** (with any cards on it) may move to an **empty column**.",
    "- Assembled sequences are removed from the tableau and placed in the foundations.",

    "## Stock",
    "When no useful move remains, deal the three stock cards, one onto each of the first three columns.",
  ],
};
