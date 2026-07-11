import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const canfield: GameDefinition = {
  path: "/canfield",
  title: "Canfield",
  enabledOnLocalOnly: true,
  background: "felt-dark-red.jpg",
  cardColorBg: "#311a1e",
  cardColorText: "#E4F6FF",
  cardDescription:
    "Build suit foundations from a random base rank, fed by a 13-card reserve.",
  stats: {
    complexity: 0,
    difficulty: 0,
    luck: 0,
  },
  tags: [GameTag.ClassicSolitaire, GameTag.DragAndDrop],
  briefRules: [
    "All four foundations build up by suit from the same base rank, wrapping past King to Ace.",
    "Build tableau down in alternating color, wrapping allowed.",
    "Feed empty columns from the 13-card reserve.",
    "Turn the stock (one or three at a time) for more cards.",
  ],
  about: [
    "Canfield is a famously tough gambling-hall patience with a big face-up reserve.",
    "The random base rank and awkward reserve mean most deals are lost, so a win is a real prize.",
  ],
  howToPlay: [
    "## Objective",
    "Move as many cards as possible to the four **foundations**, each built up by suit from the base rank.",
    "## Setup",
    "- Deal 13 cards to the **reserve**, with the top card face up and available.",
    "- Turn one card to the first foundation: its rank becomes the **base rank** for all four foundations.",
    "- Deal **4 tableau columns of 1 card** each.",
    "- The remaining cards form the **stock**.",
    "## Foundations",
    "- Build up **by suit** from the base rank, wrapping past the King back to the Ace (for example base {7D}: 7, 8, 9, 10, J, Q, K, A, 2 … 6).",
    "## Tableau",
    "- Build down in **alternating color**, and sequences wrap from Ace to King (for example a red {AH} accepts a black {KS}).",
    "- Move a card or an ordered group between columns.",
    "- When a tableau column empties, it is refilled from the **reserve** (or, once the reserve is gone, by any card).",
    "## Stock",
    "Turn cards from the stock (one or three at a time, depending on your settings) to the waste. You may redeal as often as you like.",
    "## Winning",
    "A perfect game clears all 52 cards to the foundations.",
  ],
};
