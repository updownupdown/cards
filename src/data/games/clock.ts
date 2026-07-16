import { GameDefinition, GameTag } from "../games-data";

export const clock: GameDefinition = {
  path: "/clock",
  tip: {
    default: {
      text: "Tap active pile; cards auto-sort by hour; 4 kings first loses.",
    },
  },
  title: "Clock Solitaire",
  thumbnail: "Clock.jpg",
  cardBack: "Clock.png",
  background: "wood-table.jpg",
  cardColorBg: "#1d1610",
  cardColorText: "#eed9c2",
  cardDescription:
    "A pure-luck patience: sort the deck around a clock face before the Kings run out.",
  stats: {
    complexity: 10,
    difficulty: 10,
    luck: 100,
  },
  tags: [GameTag.ClassicSolitaire, GameTag.EasyToLearn],
  briefRules: [
    "Cards are dealt into 12 clock positions plus a center King pile.",
    "Place each card under the position matching its rank.",
    "Turn the next card from the pile you just filled.",
    "You lose if the fourth King appears before you finish.",
  ],
  about: [
    "Clock Solitaire is a classic game of pure chance with no decisions to make.",
    "Watch the deck sort itself around the dial and hope the Kings hold off.",
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
};
