import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const klondike: GameDefinition = {
  path: "/klondike",
  title: "Klondike",
  tags: [GameTag.StockAndWaste],
  rating: {
    complexity: 20,
    difficulty: 40,
    luck: 45,
  },
  thumbnail: "Klondike.webp",
  background: GAME_BACKGROUNDS.yukon,
  animation: GameAnimations.Clouds,
  gameColorDark: "#2c3a36",
  gameColorMid: "#627685",
  gameColorPale: "#EEF0FF",
  cardDescription:
    "The classic solitaire: build four suit foundations from Ace to King.",
  quickStart: [
    "Build foundations up by suit.",
    "Build tableau down by alternating color.",
    "Only kings can fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four foundations, each built up by suit, from Ace to King.",

    "## Rules",
    "- Build tableau columns **down in rank, alternating in color**.",
    "- Move a single card or a correctly ordered group between columns.",
    "- Only a **King** (or a King-led sequence) may move onto an empty column.",

    "## Stock",
    "Turn cards from the stock to the waste pile (one or three at a time, depending on your settings). The top waste card is available to play, and you can redeal the stock when it empties.",
  ],
};
