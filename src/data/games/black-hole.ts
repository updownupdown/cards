import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

export const blackHole: GameDefinition = {
  path: "/black-hole",
  title: "Black Hole",
  aliases: ["Singularity", "All in a Row"],
  tags: [GameTag.FoundationBuilders, GameTag.SequenceBuilding],
  rating: {
    complexity: 15,
    difficulty: 60,
    luck: 15,
  },
  thumbnail: "BlackHole.webp",
  thumbnailCredit: {
    title: "Ascent of the Blessed",
    artistName: "Hieronymus Bosch",
    date: "ca. 1500–04",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Hieronymus_Bosch_013.jpg",
  },
  gameColorDark: "#150e25",
  gameColorPale: "#d4cbff",
  cardBack: CardBackColors.Violet,
  quickStart: [
    "Cards of adjacent value to the hole card can be cleared. Clear all to win. A<->K wraps.",
  ],
  howToPlay: [
    "## Objective",
    "- **Win** by pulling every card into the black hole.",
    "- **Lose** if no exposed card can be played.",

    "## Rules",
    "- The Ace of Spades starts in the black hole.",
    "- Move an exposed card into the black hole if it is **one rank above or below** its current card.",
    "- Only the **exposed** (top) card of each pile is available.",
    "- Ranks **wrap around**: after a King you may play an Ace, and vice-versa.",

    "## All in a Row",
    "In the All in a Row variant, the cards are dealt in thirteen columns of four, and the black hole starts empty: any exposed card may go in first.",

    "## Tips",
    "- There is no stock and no reshuffle, so plan your moves in order and as far in advance as possible.",
    "- Avoid dead ends, or getting to the end game with cards that are not adjacent in rank.",
  ],
};
