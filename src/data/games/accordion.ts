import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const accordion: GameDefinition = {
  path: "/accordion",
  title: "Accordion",
  tags: [GameTag.EasyToLearn, GameTag.PairMatching],
  rating: {
    complexity: 10,
    difficulty: 95,
    luck: 65,
  },
  thumbnail: "Accordion.jpg",
  background: GAME_BACKGROUNDS.fallLeaves,
  animation: GameAnimations.Leaves,
  cardBack: "Accordion.jpg",
  gameColorDark: "#351219",
  gameColorPale: "#fffccf",
  cardDescription:
    "Collapse the whole deck into a single pile, matching adjacent suits or ranks one at a time.",
  quickStart: [
    "Collapse the whole deck into a single pile.",
    "Card can be moved 1 or 3 spots to their left, onto cards of matching suit or rank.",
  ],
  howToPlay: [
    "## Objective",
    "Win by collapsing all 52 cards into a **single pile**.",

    "## Stacking",
    "- A card may move onto the card **immediately to its left** or the card **three places to its left**, if the two cards **match in suit or rank**.",
    "- Only the top card of each pile matters for matching (cards underneath can effectively be ignored).",
    "- After a move, the cards shift left to close the gap.",

    "## Tips",
    '- **Use the "Sweeper" Technique**: Before playing, scan your layout for four cards of the same rank (e.g., four 8s) located near the end of the board. Protect them by never moving any other card on top of a sweeper. Your ultimate goal is to get down to exactly four piles, each topped with a sweeper. Since they have the same rank, you can then stack them on top of each other to win.',
  ],
  about: [
    "Accordion Solitaire traces its origins to the late 19th century. The earliest known description was published in 1883 by Manhattan-based publisher William B. Dick.",
    'Originally called "Idle Year" (a humorous nod to its incredibly low win rate of about 1%) it was also historically known as "Methuselah" and "Tower of Babel".',
  ],
  credits: {
    creators: [GameCreators.Unknown],
    creationDate: "First documented by William B. Dick in 1883",
  },
};
