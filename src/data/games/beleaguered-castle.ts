import { GameDefinition, GameTag } from "../games-data";

export const beleagueredCastle: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/beleaguered-castle",
  tip: {
    default: {
      text: "Expose Aces early; columns down any suit; foundations up suit.",
    },
  },
  title: "Beleaguered Castle",
  thumbnail: "DefaultThumbnail.jpg",
  cardBack: "DefaultCardBack.png",
  background: "medieval-blocks.jpg",
  cardColorBg: "#2e2620",
  cardColorText: "#f0e2c4",
  cardDescription:
    "Storm the castle: build every suit up from Ace to King with open tableau play.",
  rating: {
    complexity: 45,
    difficulty: 55,
    luck: 30,
  },
  tags: [GameTag.Beta],
  about: [
    "Beleaguered Castle is an open builder — everything is face up, so wins reward careful sequencing.",
    "The temptation to fill an empty column too soon is what strands most games.",
  ],
  byLine:
    "Game designer unknown, first documented by William Brisbane Dick in 1883",
  howToPlay: [
    "## Objective",
    "Build all four **foundations** up by suit from **Ace to King**.",
    "## Setup",
    "- The four **Aces** are placed as foundations.",
    "- The other 48 cards are dealt into **8 columns of 6**, all face up.",
    "## Playing",
    "- Tap an **exposed** card (the outer end of a column) to pick it up, then tap a destination.",
    "- Build columns **down by rank**, regardless of suit (for example a {7C} onto an {8H}).",
    "- Move cards **one at a time**.",
    "- Send a card to its **foundation** when it is the next rank up in the same suit.",
    "- An **empty column** may be filled with any single card.",
    "## Winning",
    "Complete all four foundations to win. If no legal move remains, the siege is lost.",
  ],
};
