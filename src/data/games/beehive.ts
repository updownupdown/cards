import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const beehive: GameDefinition = {
  path: "/beehive",
  title: "Beehive",
  tags: [GameTag.EasyToLearn],
  rating: {
    complexity: 15,
    difficulty: 15,
    luck: 25,
  },
  thumbnail: "Beehive.webp",
  background: GAME_BACKGROUNDS.flowerGarden,
  animation: GameAnimations.Firefly,
  gameColorDark: "#1e2b16",
  gameColorMid: "#af6300",
  gameColorPale: "#f4f9d3",
  cardDescription:
    "Clear four-card sets from six same-rank tableau slots using the beehive, waste, and stock.",
  quickStart: [
    "Match cards by rank and clear every four-card set.",
    "Tap a beehive or waste card to place it automatically.",
    "Flip three stock cards when you need new options.",
  ],
  howToPlay: [
    "## Objective",
    "Clear all 52 cards by making four-card sets of the same rank.",
    "## Rules",
    "- The beehive holds 10 cards; only its top card is active.",
    "- The six tableau slots hold cards of one rank, up to four cards each.",
    "- Move matching ranks between the beehive, waste, and tableau.",
    "- A four-card tableau set is cleared immediately.",
    "- Empty tableau slots stay empty until a beehive or waste card is moved there.",
    "- Tap a tableau stack to move it automatically onto a matching stack.",
    "- Completed stacks are moved face down to the discard pile.",
    "- Flip up to three stock cards to the waste, or recycle the waste when the stock is empty.",
  ],
};
