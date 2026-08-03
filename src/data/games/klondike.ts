import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const klondike: GameDefinition = {
  path: "/klondike",
  title: "Klondike",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: {
    complexity: 20,
    difficulty: 35,
    luck: 30,
  },
  thumbnail: "Klondike.jpg",
  background: GAME_BACKGROUNDS.yukon,
  animation: GameAnimations.Clouds,
  gameColorDark: "#2c3a2f",
  gameColorPale: "#EEF0FF",
  cardDescription:
    "The classic solitaire: build four suit foundations from Ace to King.",
  quickStart: [
    "Foundations up suit; tableau down alt color; kings fill empty.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four **foundations**, each built up by suit from Ace to King.",
    "## Setup",
    "- Deal 7 tableau columns of 1 to 7 cards.",
    "- The top card of each column is face up; the rest are face down.",
    "- The remaining 24 cards form the **stock**.",
    "## Playing",
    "- Build tableau columns **down in rank, alternating color** (for example a red {6H} on a black {7S}).",
    "- Move a single card or a correctly ordered group between columns.",
    "- Only a **King** (or a King-led sequence) may move onto an empty column.",
    "- Flip a face-down card whenever it becomes exposed.",
    "- Send cards to the foundations up by suit, starting with the Aces.",
    "## Stock",
    "Turn cards from the stock to the waste pile (one or three at a time, depending on your settings). The top waste card is available to play, and you can redeal the stock when it empties.",
    "## Winning",
    "You win when every foundation is complete from Ace to King.",
  ],
  about: [
    'Klondike is the solitaire most people simply call "Solitaire".',
    "Dig through the tableau and stock to free the cards you need and move all 52 to the foundations.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
  },
};
