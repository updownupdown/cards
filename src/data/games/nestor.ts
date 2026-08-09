import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const nestor: GameDefinition = {
  path: "/nestor",
  title: "Nestor",
  tags: [GameTag.PairMatching],
  rating: {
    complexity: 15,
    difficulty: 60,
    luck: 65,
  },
  thumbnail: "Nestor.jpg",
  background: GAME_BACKGROUNDS.greece,
  animation: GameAnimations.Clouds,
  cardBack: "Nestor.jpg",
  gameColorDark: "#112e49",
  gameColorPale: "#e7f7ff",
  cardDescription: "Pair off matching ranks to empty every column.",
  quickStart: [
    "Clear all cards by removing pairs of matching ranks from the bottom of columns or the reserve.",
  ],
  howToPlay: [
    "## Objective",
    "Discard all 52 cards by removing matching pairs.",

    "## Rules",
    "- Only the **bottom (exposed)** cards of each column are available, as well as **the reserve cards**.",
    "- Tap two available cards of the **same rank** to send them face down to the discard pile.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
    creationDate: "First documented in 1877",
  },
};
