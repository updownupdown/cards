import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const osmosis: GameDefinition = {
  path: "/osmosis",
  title: "Osmosis",
  tags: [GameTag.ClassicSolitaire],
  rating: {
    complexity: 30,
    difficulty: 30,
    luck: 30,
  },
  thumbnail: "DefaultThumbnail.jpg",
  background: GAME_BACKGROUNDS.feltDarkGreen,
  cardBack: "DefaultCardBack.png",
  cardColorBg: "#123027",
  cardColorText: "#d5f0d0",
  cardDescription:
    "Seep each suit onto its row, but only once the rank above has arrived.",
  quickStart: ["Top row any in-suit; lower rows need same rank above; tap stock."],
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
  about: [
    "Osmosis (also called Treasure Trove) is a game of unlocking ranks row by row.",
    "The rank you start with sets the key for the whole board, so the early rows dictate everything.",
  ],
  credits: {
    creators: [GameCreators.SidSackson],
    creationDate: "1969",
  },


};
