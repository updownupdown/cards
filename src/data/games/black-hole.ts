import { GameDefinition, GameTag } from "../games-data";

export const blackHole: GameDefinition = {
  path: "/black-hole",
  tip: {
    default: {
      text: "Play exposed +/-1 to hole; A<->K wraps; plan full sequence.",
    },
  },
  title: "Black Hole",
  thumbnail: "DefaultThumbnail.jpg",
  cardBack: "DefaultCardBack.png",
  background: "felt-dark-purple.jpg",
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
    "Black Hole is an open-information game — every card is visible from the start, so success is almost pure planning.",
    "Most deals are winnable; the challenge is finding the single order that clears the board.",
  ],
  howToPlay: [
    "## Objective",
    "Pull **every card** into the central **black hole**.",
    "## Setup",
    "- The **Ace of Spades** starts in the black hole.",
    "- The other 51 cards are dealt into **17 piles of three**, all face up.",
    "## Playing",
    "- Only the **exposed** (top) card of each pile is available.",
    "- Move an exposed card into the black hole if it is **one rank above or below** the hole's current card.",
    "- Rank **wraps around**: after a King you may play an Ace, and after an Ace you may play a King.",
    "- There is no stock and no reshuffle, so think ahead about the order.",
    "## Winning",
    "You win when all 52 cards have been absorbed. If no exposed card can be played, the game is over.",
  ],
};
