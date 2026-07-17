import { GameDefinition, GameTag } from "../games-data";

export const blackHole: GameDefinition = {
  path: "/black-hole",
  tip: {
    default: {
      text: "Cards of adjacent value to the hole card can be cleared. Clear all to win. A<->K wraps.",
    },
  },
  title: "Black Hole",
  thumbnail: "DefaultThumbnail.jpg",
  cardBack: "DefaultCardBack.png",
  background: "galaxy.jpg",
  cardColorBg: "#150e25",
  cardColorText: "#d4cbff",
  cardDescription:
    "Pull all 52 cards into a central black hole, one rank at a time.",
  stats: {
    complexity: 40,
    difficulty: 55,
    luck: 30,
  },
  tags: [GameTag.ClassicSolitaire, GameTag.EasyToLearn],
  about: [
    "Black Hole solitaire was invented by British game expert David Parlett and first published in his 1979 book, The Penguin Book of Patience.",
    "With perfect strategy, the win rate is roughly 87%. However, because the game requires looking multiple moves ahead to avoid dead ends, the average human win rate is much lower, between 15% and 40%.",
  ],
  howToPlay: [
    "## Objective",
    "- Pull every card into the central black hole.",
    "- If no exposed card can be played, the game is over.",
    "## Rules",
    "- Move an exposed card into the black hole if it is **one rank above or below** the hole's current card.",
    "- Only the **exposed** (top) card of each pile is available.",
    "- Ranks **wrap around**: after a King you may play an Ace, and vice-versa.",
    "## Tips",
    "- There is no stock and no reshuffle, so plan your moves in order and as far in advance as possible.",
    "- Avoid dead ends, or getting to the end game with cards that are not adjacent in rank.",
  ],
};
