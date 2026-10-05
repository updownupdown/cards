import { GameAnimations } from "@/animations";
import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";

export const royalMarriage: GameDefinition = {
  path: "/royal-marriage",
  title: "Royal Marriage",
  tags: [GameTag.ClearTheBoard, GameTag.PairMatching],
  rating: {
    complexity: 25,
    difficulty: 85,
    luck: 35,
  },
  // Placeholder cover art.
  thumbnail: "Accordion.webp",
  background: GAME_BACKGROUNDS.fallLeaves,
  animation: GameAnimations.Leaves,
  gameColorDark: "#351219",
  gameColorPale: "#fffccf",
  gameColorAccent: "#e2b08d",
  cardBack: CardBackColors.Terracotta,
  quickStart: [
    "Discard cards sitting between two cards of the same rank or suit, until the Queen and King of Hearts are side by side.",
  ],
  howToPlay: [
    "## Objective",
    "Discard every card except the **Queen** and **King of Hearts**, which must end up side by side.",

    "## Deal",
    "- All 52 cards are laid out in one continuous line, wrapping from row to row.",
    "- The Queen of Hearts starts the line and the King of Hearts ends it.",

    "## Discarding",
    "- Select the card or cards to remove, then press **Discard**.",
    "- One card, or two cards side by side, can go if the cards on either side of them match in **rank or suit**.",
    "- A longer run can go only if every card in it is of the **same suit**, and the cards on either side match in rank or suit.",
    "- The Queen and King of Hearts never leave the line.",
    "- The line closes up after every discard.",
  ],
};
