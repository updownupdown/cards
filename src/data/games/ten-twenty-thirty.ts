import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const tenTwentyThirty: GameDefinition = {
  path: "/ten-twenty-thirty",
  title: "Ten Twenty Thirty",
  aliases: ["Decade"],
  tags: [GameTag.PairMatching, GameTag.EasyToLearn],
  rating: {
    complexity: 20,
    difficulty: 35,
    luck: 70,
  },
  thumbnail: "DefaultThumbnail.webp",
  background: GAME_BACKGROUNDS.casino,
  animation: GameAnimations.Stars,
  gameColorDark: "#1b2430",
  gameColorMid: "#3f8f8a",
  gameColorPale: "#d8f3ee",
  cardDescription:
    "Deal a growing line and clear runs of cards that total 10, 20 or 30.",
  quickStart: [
    "Tap the stock to add a card to the end of the line.",
    "Tap the first and last card of a run to remove it.",
    "A run of two or more cards must total 10, 20 or 30.",
  ],
  howToPlay: [
    "## Objective",
    "Discard all 52 cards.",

    "## Rules",
    "- Cards count their face value; Jacks, Queens and Kings count **10**.",
    "- The line starts with three cards and reads left to right, row after row.",
    "- Tap the **stock** to add the next card to the end of the line.",
    "- Any **two or more cards next to each other** in the line that total **10, 20 or 30** can be discarded.",
    "- Tap the first card of a run, then the last; the cards between close up.",
    "- The game is lost when the stock is empty and no run adds up.",
  ],
};
