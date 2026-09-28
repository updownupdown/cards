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
  cardBack: CardBackColors.Crimson,
  quickStart: [
    "Clear all cards to win.",
    "Clear exposed cards that are 1 rank above or below the top waste card.",
    "Draw from the stock when stuck.",
  ],
  howToPlay: [
    "## Objective",
    "**Win by clearing all 35 tableau cards.**",
    "**Lose** if the stock is empty and no tableau cards can be moved to the waste.",

    "## Clearing Cards",
    "- Only the **bottom (exposed)** card of each column is available.",
    "- Move an available card to the waste if it is **one rank higher or lower** than the current waste card.",
    "- Sequences do **not** wrap: since Aces are low and Kings are high, the run never loops from King back to Ace.",
    "- When stuck, turn a card from the stock to the waste.",
  ],
};
