import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const crescent: GameDefinition = {
  path: "/crescent",
  title: "Crescent",
  aliases: ["La Demi-Lune"],
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: { complexity: 40, difficulty: 55, luck: 35 },
  thumbnail: "Crescent.webp",
  thumbnailCredit: {
    title: "Sunset and Moonrise",
    artistName: "Joseph Mallord William Turner",
    date: "c. 1832",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/29385",
  },
  gameColorDark: "#182334",
  gameColorPale: "#e5dfca",
  cardBack: CardBackColors.Navy,
  quickStart: [
    "Build Ace foundations up and King foundations down by suit.",
    "Build tableau one rank up or down in suit, wrapping Ace and King.",
    "Move one exposed card; rotate each pile up to three times.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to eight foundations: four build up from Aces and four build down from Kings.",

    "## Rules",
    "- Only the exposed card of each of the sixteen piles is playable.",
    '- Build tableau one rank up or down in the same suit; Ace and King are adjacent and "wrap around".',
    "- Move one card at a time.",
    "- Empty tableau piles cannot be filled.",
    "- Non-base cards may transfer between foundations.",
    '- Three times per game, you can "restack" to move the bottom card of every pile to its top.',
  ],
};
