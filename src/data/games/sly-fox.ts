import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const slyFox: GameDefinition = {
  path: "/sly-fox",
  title: "Sly Fox",
  tags: [GameTag.DoubleDeckers, GameTag.StockAndWaste],
  rating: {
    complexity: 40,
    difficulty: 55,
    luck: 40,
  },
  thumbnail: "SlyFox.webp",
  thumbnailCredit: {
    title: "Red Fox",
    artistName: "Carl Rungius",
    date: "1933",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Red_Fox,_Carl_Rungius,_1933.jpg",
  },
  background: GAME_BACKGROUNDS.forestGrasses,
  animation: GameAnimations.Leaves,
  gameColorDark: "#2b1a10",
  gameColorPale: "#fde2cc",
  gameColorAccent: "#f0a060",
  cardBack: CardBackColors.Copper,
  quickStart: [
    "Build Aces up and Kings down, by suit.",
    "Reserve cards only go to the foundations.",
    "Each deal places 20 cards on the reserve.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Four Ace to King and four King to Ace, by suit |",
    "| Reserve (20) | Top cards play to the foundations only |",
    "| Stock | Deals 20 cards, each onto a reserve pile of your choice |",
    "| Redeals | None |",
    "| Cards | 104 (two decks) |",
    "## Special rules",
    "- Until you start dealing, an emptied reserve pile refills from the stock; after that it waits for the next deal.",
    "- No reserve card can be played until all 20 cards of a deal are placed. A card played straight to a foundation doesn't count toward the 20.",
    "- Deal again whenever you like, until the stock runs out.",
  ],
};
