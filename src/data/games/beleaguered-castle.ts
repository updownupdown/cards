import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const beleagueredCastle: GameDefinition = {
  path: "/beleaguered-castle",
  title: "Beleaguered Castle",
  tags: [GameTag.TableauBuilding],
  rating: {
    complexity: 45,
    difficulty: 55,
    luck: 30,
  },
  thumbnail: "BeleagueredCastle.jpg",
  background: GAME_BACKGROUNDS.castle,
  animation: GameAnimations.Clouds,
  gameColorDark: "#2e2620",
  gameColorPale: "#f0e2c4",
  cardDescription:
    "Storm the castle: build every suit up from Ace to King with open tableau play.",
  quickStart: [
    "Build all foundations, up by suit, from A to K.",
    "Build columns down by rank, regardless of suit, one card at a time.",
  ],
  howToPlay: [
    "## Objective",
    "- **Win** by building all four **foundations** up by suit from **Ace to King**.",
    "- **Lose** if no legal moves remain and the foundations are incomplete.",

    "## Playing",
    "- Build columns **down by rank**, regardless of suit (for example a {7C} onto an {8H}).",
    "- Send a card to its **foundation** when it is the next rank up in the same suit.",
    "- Tap an exposed card to pick it up, then tap a destination.",
    "- Move cards **one at a time**.",
    "- An **empty column** may be filled with any single card.",
  ],
  about: [
    "Beleaguered Castle is an open builder — everything is face up, so careful sequencing is rewarded.",
    "The temptation to fill an empty column too soon is what strands most games.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
    creationDate: "First documented by William Brisbane Dick in 1883",
  },
};
