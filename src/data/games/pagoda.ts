import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

export const pagoda: GameDefinition = {
  path: "/pagoda",
  title: "Pagoda",
  tags: [GameTag.PairMatching],
  rating: {
    complexity: 15,
    difficulty: 45,
    luck: 40,
  },
  thumbnail: "Pagoda.webp",
  thumbnailCredit: {
    title:
      'The Thousand Buddha Hall and the Pagoda of the "Cloudy Cliff" Monastery, from Twelve Views of Tiger Hill, Suzhou',
    artistName: "Shen Zhou",
    date: "after 1490",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1964.371.7",
  },
  gameColorDark: "#1b2420",
  gameColorPale: "#e6efe9",
  cardBack: CardBackColors.Charcoal,
  quickStart: [
    "Tap an uncovered card to move it into your tray.",
    "Three cards of the same rank in the tray are offered at the shrine.",
    "Don't let the tray fill up with too many unmatched cards (Easy: 7, Normal: 6, Hard: 5).",
  ],
  howToPlay: [
    "## Objective",
    "Clear all **39 cards** from the pagoda by offering them at the shrine in sets of three.",

    "## Rules",
    "- The deck is missing one suit of each rank, so there are exactly three cards of every rank.",
    "- Tap an uncovered card to move it into the tray.",
    "- As soon as the tray holds a set of three cards of the same rank, they are offered at the shrine.",
    "- The game is lost when the tray is full, which depends on the difficulty setting:",
    "-- Easy: max **7** cards",
    "-- Normal: max **6** cards",
    "-- Hard: max **5** cards",
  ],
};
