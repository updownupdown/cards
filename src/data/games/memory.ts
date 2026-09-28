import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const memory: GameDefinition = {
  path: "/memory",
  title: "Memory",
  tags: [GameTag.PairMatching],
  // Scored in moves or guesses: fewer is better.
  lowerScoreIsBetter: true,
  rating: {
    complexity: 5,
    difficulty: 15,
    luck: 10,
  },
  thumbnail: "Memory.webp",
  thumbnailCredit: {
    title: "Remembrance of Italy",
    artistName: "Jean Baptiste Camille Corot",
    date: "1863",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/43126",
  },
  background: GAME_BACKGROUNDS.savanah,
  animation: GameAnimations.Pollen,
  gameColorDark: "#243b35",
  gameColorPale: "#e8f1df",
  cardBack: CardBackColors.Ocean,
  cardDescription: "Reveal hidden pairs and clear the board using your memory.",
  quickStart: [
    "Clear the board by finding all matching pairs.",
    "You must match both rank and suit.",
  ],
  howToPlay: [
    "## Objective",
    "Clear the board by finding all matching pairs.",

    "## Matching",
    "- Tap one card to select it, then tap a second card to reveal both.",
    "- Matching cards move to the discard pile. Mismatched cards are turned face down again.",
    "- You can tap cards while two of them are face up to set them face down again faster.",
  ],
};
