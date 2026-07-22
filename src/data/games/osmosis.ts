import { GameDefinition, GameTag } from "../games-data";

export const osmosis: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/osmosis",
  tip: {
    default: "Top row any in-suit; lower rows need same rank above; tap stock.",
  },
  title: "Osmosis",
  thumbnail: "DefaultThumbnail.jpg",
  cardBack: "DefaultCardBack.png",
  background: "felt-dark-green.jpg",
  cardColorBg: "#123027",
  cardColorText: "#d5f0d0",
  cardDescription:
    "Seep each suit onto its row, but only once the rank above has arrived.",
  rating: {
    complexity: 50,
    difficulty: 60,
    luck: 45,
  },
  tags: [GameTag.ClassicSolitaire],
  about: [
    "Osmosis (also called Treasure Trove) is a game of unlocking ranks row by row.",
    "The rank you start with sets the key for the whole board, so the early rows dictate everything.",
  ],
  byLine: "Game design by Sid Sackson, 1969",
  howToPlay: [
    "## Objective",
    "Move all 52 cards onto the four **foundation rows** (one suit per row).",
    "## Setup",
    "- Four **reserve** piles of 4 cards each sit on the left; only the **top** card of each is available.",
    "- One card is dealt to start the **first foundation row**; its rank is the **key rank**.",
    "- The rest form the **stock**.",
    "## Playing",
    "- The **first row** accepts any card of its suit, in any order.",
    "- To **start** a new row, play a card of the **key rank** in a new suit.",
    "- A lower row accepts a card of its suit only if a card of that **same rank already sits in the row directly above**.",
    "- Tap the **stock** to turn a card to the waste; when the stock is empty, tap it to redeal the waste.",
    "## Winning",
    "Place all 52 cards to win. If the stock is empty and nothing is playable, the game is over.",
  ],
};
