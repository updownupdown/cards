import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const blackHole: GameDefinition = {
  path: "/black-hole",
  title: "Black Hole",
  tags: [GameTag.EasyToLearn, GameTag.SequenceBuilding],
  rating: {
    complexity: 25,
    difficulty: 55,
    luck: 30,
  },
  thumbnail: "BlackHole.jpg",
  background: GAME_BACKGROUNDS.nightSky,
  animation: GameAnimations.Stars,
  gameColorDark: "#150e25",
  gameColorPale: "#d4cbff",
  cardDescription:
    "Pull all 52 cards into a central black hole, one rank at a time.",
  quickStart: [
    "Cards of adjacent value to the hole card can be cleared. Clear all to win. A<->K wraps.",
  ],
  howToPlay: [
    "## Objective",
    "- **Win** by pulling every card into the black hole.",
    "- **Lose** if no exposed card can be played.",

    "## Rules",
    "- Move an exposed card into the black hole if it is **one rank above or below** the hole's current card.",
    "- Only the **exposed** (top) card of each pile is available.",
    "- Ranks **wrap around**: after a King you may play an Ace, and vice-versa.",

    "## Tips",
    "- There is no stock and no reshuffle, so plan your moves in order and as far in advance as possible.",
    "- Avoid dead ends, or getting to the end game with cards that are not adjacent in rank.",
  ],
  about: [
    "Black Hole solitaire was invented by British game expert David Parlett and first published in his 1979 book, The Penguin Book of Patience.",
    "With perfect strategy, the win rate is roughly 87%. However, because the game requires looking multiple moves ahead to avoid dead ends, the average human win rate is much lower, between 15% and 40%.",
  ],
  credits: {
    creators: [GameCreators.DavidParlett],
    creationDate: "1979",
  },
};
