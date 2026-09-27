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
    luck: 45,
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
  cardBack: CardBackColors.Copper,
  cardDescription:
    "Stash each twenty-card deal across twenty reserve piles, then dig out what you hid.",
  quickStart: [
    "Move all 104 cards to the foundations. Build As up and Ks down by suit.",
    "Tap the stock to deal 20 cards, placing each on a reserve pile.",
    "Tap a reserve pile's top card to send it up.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 104 cards onto the eight foundations.",

    "## Foundations",
    "- Aces build **up** by suit; Kings build **down** by suit.",

    "## Rules",
    "- Only the top cards of the **reserve** piles can be played, and never onto each other.",
    "- At first, a reserve pile emptied by a foundation play is refilled from the stock.",
    "- Tap the **stock** to start a deal of **20 cards**. Each one must be placed on a reserve pile of your choice, or played straight to a foundation, which doesn't count towards the 20.",
    "- No reserve cards can be played until the deal is placed. After that, emptied piles stay empty until the next deal.",
    "- Deal again whenever you like until the stock runs out.",
  ],
};
