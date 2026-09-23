import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const eightOff: GameDefinition = {
  path: "/eight-off",
  title: "Eight Off",
  tags: [GameTag.SequenceBuilding],
  rating: {
    complexity: 25,
    difficulty: 40,
    luck: 25,
  },
  thumbnail: "EightOff.webp",
  background: GAME_BACKGROUNDS.cherryBlossoms,
  animation: GameAnimations.CherryBlossom,
  gameColorDark: "#0e2741",
  gameColorPale: "#d9ffff",
  cardBack: CardBackColors.Ocean,
  cardDescription:
    "A roomy, same-suit FreeCell relative, with eight cells and Kings-only columns.",
  quickStart: [
    "Move cards to foundations by suit, from A to K.",
    "Build tableau columns down by suit.",
    "Use 8 free cells; only Kings fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four foundations, each built up by suit, from Ace to King.",

    "## Rules",
    "- Build tableau columns **down in rank and in the same suit**.",
    "- Each **free cell** holds a single card.",
    "- You can move one card at a time. You may move groups of cards together, but only if you have enough free cells and empty columns to have been able to make the equivalent move one card at a time.",
    "- Only a **King** (with any cards it carries) may move into an **empty column**.",
    "- Send cards to the foundations up by suit from the Aces.",
  ],
};
