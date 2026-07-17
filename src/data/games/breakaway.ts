import { GameDefinition, GameTag } from "../games-data";

export const breakaway: GameDefinition = {
  enabledOnLocalOnly: true,
  enabled: false,
  path: "/breakaway",
  tip: {
    default: "Play exposed +/-1 to paceline; A<->K wraps; draw team car.",
  },
  title: "Breakaway",
  thumbnail: "DefaultThumbnail.jpg",
  cardBack: "DefaultCardBack.png",
  background: "concrete.jpg",
  cardColorBg: "#26303a",
  cardColorText: "#f5d34e",
  cardDescription:
    "Chase down the bunch by pulling riders into one flowing paceline.",
  rating: {
    complexity: 20,
    difficulty: 45,
    luck: 70,
  },
  tags: [GameTag.Beta],
  byLine: "Game design by James Carmichael, 2026",
  about: [
    "Breakaway is a fast, looping take on the classic chase solitaire, dressed up as a road-race stage.",
    "Because the pace wraps from King back to Ace, momentum rarely stalls — but a careless pull can still strand a rider.",
  ],
  howToPlay: [
    "## Objective",
    "Absorb every rider in the **bunch** into a single **paceline**.",
    "## Setup",
    "- Deal **7 columns of 5 riders**, all face up — this is the bunch.",
    "- The remaining 17 cards form the **team car** (stock).",
    "- One rider is turned to the front of the **paceline**.",
    "## Playing",
    "- Only the **exposed (bottom)** rider of each column can move.",
    "- Send a rider to the paceline if it is **one rank higher or lower** than the front rider — for example a {6H} or {8S} onto a {7D}.",
    "- The race **loops**: ranks wrap, so an **Ace** can follow a **King** and a **King** can follow an **Ace**.",
    "- When no rider fits, pull the next card from the **team car** to the front of the paceline.",
    "## Winning",
    "You win the stage by clearing every column. If the team car empties with no move left, the stage ends.",
  ],
};
