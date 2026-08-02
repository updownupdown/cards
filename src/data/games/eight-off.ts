import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const eightOff: GameDefinition = {
  path: "/eight-off",
  title: "Eight Off",
  tags: [GameTag.TapAndDrag, GameTag.ClassicSolitaire],
  rating: {
    complexity: 25,
    difficulty: 40,
    luck: 25,
  },
  thumbnail: DEFAULT_GAME_THUMBNAIL,
  background: GAME_BACKGROUNDS.treeRain,
  animation: GameAnimations.Rain,
  gameColorDark: "#101b2b",
  gameColorPale: "#d9e6ff",
  cardDescription:
    "A roomy, same-suit FreeCell relative with eight cells and Kings-only columns.",
  quickStart: ["Use 8 cells; tableau down in suit; only kings fill empty."],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four **foundations**, each built up by suit from Ace to King.",
    "## Setup",
    "- 48 cards are dealt into **8 columns of 6**, all face up.",
    "- The remaining **4 cards** each start in one of the **8 free cells**.",
    "## Playing",
    "- Build tableau columns **down in rank in the same suit** (for example a {9S} on a {10S}).",
    "- Each **free cell** holds a single card; move one card at a time.",
    "- Moving a sequence is a shortcut, limited by your free cells and empty columns.",
    "- Only a **King** (with any cards it carries) may move into an **empty column**.",
    "- Send cards to the foundations up by suit from the Aces.",
    "## Winning",
    "You win when all four foundations are built from Ace to King.",
  ],
  about: [
    "Eight Off gives you eight free cells instead of four, but demands same-suit tableau building.",
    "The extra cells make most deals winnable — the challenge is not clogging them all at once.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
    creationDate: "Popularized by C. L. Baker in the 1920s",
  },
};
