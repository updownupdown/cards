import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const beleagueredCastle: GameDefinition = {
  path: "/beleaguered-castle",
  title: "Beleaguered Castle",
  tags: [GameTag.ClassicSolitaire],
  rating: {
    complexity: 45,
    difficulty: 55,
    luck: 30,
  },
  thumbnail: "BeleagueredCastle.jpg",
  background: GAME_BACKGROUNDS.castle,
  animation: GameAnimations.Clouds,
  cardBack: "DefaultCardBack.png",
  gameColorDark: "#2e2620",
  gameColorPale: "#f0e2c4",
  cardDescription:
    "Storm the castle: build every suit up from Ace to King with open tableau play.",
  quickStart: [
    "Expose Aces early; columns down any suit; foundations up suit.",
  ],
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
  about: [
    "Beleaguered Castle is an open builder — everything is face up, so wins reward careful sequencing.",
    "The temptation to fill an empty column too soon is what strands most games.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
    creationDate: "First documented by William Brisbane Dick in 1883",
  },
};
