import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

export const apothecary: GameDefinition = {
  path: "/apothecary",
  title: "Apothecary",
  tags: [GameTag.Puzzles, GameTag.SpatialControl],
  lowerScoreIsBetter: true,
  rating: {
    complexity: 15,
    difficulty: 35,
    luck: 5,
  },
  thumbnail: "Apothecary.webp",
  thumbnailCredit: {
    title: "Apodictic Wares, Allegory of Kant’s Philosophy",
    artistName: "Jacob Smies",
    date: "1774 - 1833",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://www.rijksmuseum.nl/en/collection/object/Apodictische-Waaren-allegorie-op-de-filosofie-van-Kant--2074a287e4025924d2dcf09f128d0cbb",
  },
  gameColorDark: "#1d2a2a",
  gameColorPale: "#dcefe6",
  cardBack: CardBackColors.Teal,
  quickStart: [
    "Fill every jar with four of a kind to seal it.",
    "Tap a jar, then tap where to pour its top cards.",
    "Cards pour onto the same rank, or into an empty jar or dish.",
  ],
  howToPlay: [
    "## Objective",
    "Sort the deck to group all cards of the same rank together.",

    "## Pouring",
    "- Tap a jar or dish to pick up its top card, together with any matching cards directly below it.",
    "- Tap another jar or dish to pour them there: you can pour onto a card of the **same rank**, or into an empty jar or dish.",
    "- **Jars** hold four cards. If only some of the cards fit, the rest stay behind.",
    "- The two **dishes** hold a single card each.",

    "## Sealing",
    "- A jar holding four cards of the same rank is sealed and turned face down.",
    "- You win when all 13 jars are sealed. Try to do it in as few pours as you can.",
    "- The game is lost if no card can be poured anywhere.",
  ],
};
