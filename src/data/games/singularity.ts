import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const singularity: GameDefinition = {
  path: "/singularity",
  title: "Singularity",
  tags: [GameTag.EasyToLearn, GameTag.SequenceBuilding],
  rating: {
    complexity: 25,
    difficulty: 55,
    luck: 30,
  },
  thumbnail: "Singularity.jpg",
  background: GAME_BACKGROUNDS.nightSky,
  animation: GameAnimations.Stars,
  gameColorDark: "#150e25",
  gameColorPale: "#d4cbff",
  cardDescription:
    "Pull all 52 cards into a central singularity, one rank at a time.",
  quickStart: [
    "Cards of adjacent value to the hole card can be cleared. Clear all to win. A<->K wraps.",
  ],
  howToPlay: [
    "## Objective",
    "- **Win** by pulling every card into the singularity.",
    "- **Lose** if no exposed card can be played.",

    "## Rules",
    "- Move an exposed card into the singularity if it is **one rank above or below** its current card.",
    "- Only the **exposed** (top) card of each pile is available.",
    "- Ranks **wrap around**: after a King you may play an Ace, and vice-versa.",

    "## Tips",
    "- There is no stock and no reshuffle, so plan your moves in order and as far in advance as possible.",
    "- Avoid dead ends, or getting to the end game with cards that are not adjacent in rank.",
  ],
};
