import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const dominion: GameDefinition = {
  path: "/dominion",
  title: "Dominion",
  source: {
    title: "Empire",
    designer: "Jim Owen",
  },
  tags: [GameTag.Puzzles, GameTag.SpatialControl, GameTag.CardCombat],
  rating: {
    complexity: 35,
    difficulty: 65,
    luck: 35,
  },
  background: GAME_BACKGROUNDS.nightSky,
  animation: GameAnimations.Stars,
  thumbnail: "Dominion.webp",
  thumbnailCredit: {
    title: "Procession of a Daimyo",
    artistName: "Hishikawa Moronobu",
    date: "ca. 1681–84",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/30113",
  },
  gameColorDark: "#1d2231",
  gameColorPale: "#dbe9eb",
  gameColorAccent: "#e2cd8d",
  cardBack: CardBackColors.Ocean,
  quickStart: [
    "Conquer adjacent cards of the same suit or rank.",
    "Reserve cards can (and must) be played to empty spaces.",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by reducing all eighteen cards to a single card on the board.",
    "**Lose** when no conquest is possible and no reserve can be drawn and placed, or when a single non-matching card exists.",

    "## Conquering",
    "- Select any card, then select an adjacent card of the same rank or suit to conquer it.",
    "- Cards may conquer horizontally, vertically, or diagonally.",
    "- A card may also conquer a more distant card in the same row or column when every space between them is empty.",
    "- The conquering card moves into the conquered card's space, leaving its old space empty.",

    "## Reserve",
    "- Once an empty space exists, you may turn over the top reserve card.",
    "- You must place that card in any empty space before making another conquest.",
    "- All three reserve cards must enter play before you can win.",
  ],
};
