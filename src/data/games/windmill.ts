import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const windmill: GameDefinition = {
  path: "/windmill",
  title: "Windmill",
  tags: [
    GameTag.DoubleDeckers,
    GameTag.SequenceBuilding,
    GameTag.StockAndWaste,
  ],
  rating: {
    complexity: 35,
    difficulty: 45,
    luck: 65,
  },
  thumbnail: "Windmill.webp",
  thumbnailCredit: {
    title: "Windmill on the Sea Coast Near Hastings",
    artistName: "Henry Morton",
    sourceName: "Artvee",
    sourceLink:
      "https://artvee.com/dl/windmill-on-the-sea-coast-near-hastings/",
  },
  background: GAME_BACKGROUNDS.dirtRoad,
  animation: GameAnimations.Birds,
  gameColorDark: "#1e2a1f",
  gameColorPale: "#eef5d6",
  gameColorAccent: "#ccd897",
  cardBack: CardBackColors.Olive,
  quickStart: [
    "The center builds up and the corners down, regardless of suit.",
    "The sails and the top waste card are playable.",
    "A corner card can move to the center, but not twice in a row.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (5) | Center: Ace to King four times. Corners: King to Ace. Regardless of suit |",
    "| Playable | The eight sails, and the top waste card |",
    "| Build | None |",
    "| Empty sail | Refills from the waste, then the stock |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "| Cards | 104 (two decks) |",
    "## Special rules",
    "- A corner's top card may move to the center, but the next card played to the center must come from a sail or the waste.",
  ],
};
