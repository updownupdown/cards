import { GameDefinition, GameTag } from "../games-data";

export const golf: GameDefinition = {
  path: "/golf",
  title: "Golf Solitaire",
  thumbnail: "Golf.jpg",
  cardBack: "Golf.png",
  cardColorBg: "#163021",
  cardColorText: "#acfdd1",
  cardDescription:
    "Clear seven columns by playing cards one rank away from the waste.",
  stats: {
    complexity: 15,
    difficulty: 50,
    luck: 70,
  },
  tags: [GameTag.ClassicSolitaire],
  briefRules: [
    "Play an exposed tableau card one rank above or below the waste top.",
    "Sequences do not wrap: Aces are low and Kings are high.",
    "Draw from the stock when no card is playable.",
    "Clear all tableau cards to win.",
  ],
  about: [
    "Golf Solitaire is a breezy race to sweep seven columns onto a single waste pile.",
    "It plays fast, but a poorly-timed King can strand an entire column.",
  ],
  howToPlay: [
    "## Objective",
    "Remove all 35 tableau cards onto the **waste** pile.",
    "## Setup",
    "- Deal **7 columns of 5 cards**, all face up.",
    "- The remaining 17 cards form the **stock**.",
    "## Playing",
    "- Only the **bottom (exposed)** card of each column is available.",
    "- Move an available card to the waste if it is **one rank higher or lower** than the current waste card (for example a {6H} or {8S} onto a {7D}).",
    "- Sequences do **not** wrap: since Aces are low and Kings are high, the run never loops from King back to Ace.",
    "- When stuck, turn a card from the stock to the waste.",
    "## Winning",
    "You win by clearing every tableau card. If the stock is empty with no move available, the game ends.",
  ],
};
