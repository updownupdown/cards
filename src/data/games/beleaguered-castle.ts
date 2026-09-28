import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

export const beleagueredCastle: GameDefinition = {
  path: "/beleaguered-castle",
  title: "Beleaguered Castle",
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: {
    complexity: 25,
    difficulty: 60,
    luck: 20,
  },
  thumbnail: "BeleagueredCastle.webp",
  thumbnailCredit: {
    title:
      'Prise de la Ville de Bone (Capture of the City of Bonne), from "La Vie de Ferdinand Ier de Médicis série appelée aussi Les Batailles des Médicis" (The Life of Ferdinand I de\'Medici also called The Medici Battles)',
    artistName: "Jacques Callot",
    date: "1614–20",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/415848",
  },
  gameColorDark: "#2e2620",
  gameColorPale: "#f0e2c4",
  cardBack: CardBackColors.Slate,
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
    "- Double-tap an exposed card to send it to a valid foundation.",
    "- Move cards **one at a time**.",
    "- An **empty column** may be filled with any single card.",
  ],
};
