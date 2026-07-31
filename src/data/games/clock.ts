import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const clock: GameDefinition = {
  path: "/clock",
  title: "Clock Solitaire",
  tags: [GameTag.ClassicSolitaire, GameTag.EasyToLearn],
  rating: {
    complexity: 10,
    difficulty: 10,
    luck: 100,
  },
  thumbnail: "Clock.jpg",
  background: GAME_BACKGROUNDS.oldRoom,
  cardBack: "Clock.png",
  cardColorBg: "#1d1610",
  cardColorText: "#eed9c2",
  cardDescription:
    "A pure-luck patience: follow cards around the clock before all the Kings are uncovered.",
  quickStart: [
    "Tap center pile to start, then the hour matching the last revealed card.",
  ],
  howToPlay: [
    "## Objective",
    "Turn every card face up, sorting all 52 into their **clock positions** before all four Kings appear.",
    "## Setup",
    "- Deal the deck into **13 face-down piles of 4**.",
    "- Twelve piles form a clock face (1 through 12 o'clock) and the 13th sits in the center for the **Kings**.",
    "## Playing",
    "- Turn up the top card of the center pile to begin.",
    "- Place each card face up **beneath its matching position**: Aces at 1 o'clock, numbers at their hour, Jack at 11, Queen at 12, and Kings in the center.",
    "- Then turn up the top card of the pile you just added to, and repeat.",
    "## Winning",
    "You win if every pile is turned face up. You lose the moment the **fourth King** is revealed, since it leaves no pile to continue from.",
  ],
  about: [
    "Unlike most solitaire games that involve strategy, Clock Solitaire is purely mechanical, and the odds are entirely up to luck, with winning odds of 1/13.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
    creationDate: "Known since at least the 19th century",
  },
};
