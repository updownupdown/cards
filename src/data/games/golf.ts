import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const golf: GameDefinition = {
  path: "/golf",
  title: "Golf",
  tags: [GameTag.Sports, GameTag.SequenceBuilding, GameTag.StockAndWaste],
  rating: {
    complexity: 10,
    difficulty: 55,
    luck: 55,
  },
  thumbnail: "Golf.webp",
  thumbnailCredit: {
    title: "The Golf-Player",
    artistName: "Rembrandt van Rijn",
    date: "1654",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/391981",
  },
  background: GAME_BACKGROUNDS.golf,
  animation: GameAnimations.Birds,
  gameColorDark: "#1d301e",
  gameColorPale: "#f2fccc",
  gameColorAccent: "#e88790",
  cardBack: CardBackColors.Crimson,
  quickStart: [
    "Play a column card one rank above or below the waste card.",
    "Draw when stuck.",
  ],
  howToPlay: [
    "## Goal",
    "Clear all 35 cards from the columns.",
    "## Rules",
    "| Playable | The bottom card of each column |",
    "| Remove | Onto the waste, one rank above or below it |",
    "| Values | Ace and King don't meet (they do on Easy) |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
  ],
};
