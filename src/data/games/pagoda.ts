import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const pagoda: GameDefinition = {
  path: "/pagoda",
  title: "Pagoda",
  tags: [GameTag.PairMatching],
  rating: {
    complexity: 10,
    difficulty: 35,
    luck: 30,
  },
  thumbnail: "Pagoda.webp",
  thumbnailCredit: {
    title:
      "The Thousand Buddha Hall and the Pagoda of the Cloudy Cliff Monastery",
    artistName: "Shen Zhou",
    date: "after 1490",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://clevelandart.org/art/1964.371.7",
  },
  background: GAME_BACKGROUNDS.forest,
  animation: GameAnimations.Leaves,
  gameColorDark: "#1b2420",
  gameColorPale: "#e6efe9",
  cardBack: CardBackColors.Charcoal,
  cardDescription:
    "Take cards from the tiers of the pagoda, and offer every three of a kind at the shrine.",
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
