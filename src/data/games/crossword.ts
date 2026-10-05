import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const crossword: GameDefinition = {
  path: "/crossword",
  title: "Crossword",
  tags: [GameTag.Puzzles, GameTag.GridPlacement],
  rating: {
    complexity: 35,
    difficulty: 60,
    luck: 45,
  },
  thumbnail: "Crossword.webp",
  thumbnailCredit: {
    title: "Checkerboard Composition with Dark Colors",
    artistName: "Piet Mondrian",
    date: "1919",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Mondrian_Compositie_Dambord,_donkere_Kleuren.jpg",
  },
  background: GAME_BACKGROUNDS.cozyRoom2,
  animation: GameAnimations.Dust,
  gameColorDark: "#292e2d",
  gameColorPale: "#d0e8f3",
  gameColorAccent: "#808ba1",
  cardBack: CardBackColors.Slate,
  quickStart: [
    "Fill the grid with 49 of the 52 cards, in a crossword like pattern.",
    "Court cards are like black squares; no two may touch side by side.",
    "Number cards form 'words' between black squares or edges, and must add up to an even number.",
  ],
  howToPlay: [
    "## Objective",
    "Fill the **7×7 grid**, like a crossword, with 49 of the 52 cards.",

    "## Gameplay",
    "Place cards in an empty space **next to a card already placed**, side by side or diagonally.",
    "- Jacks, Queens and Kings are the **black squares**. Two of them may never touch side by side (diagonally is fine).",
    '- Number cards are the "letters", forming "words", between black squares or edges.',

    'When the grid is complete, "words" must **add up to an even number**. Aces count as 1.',

    "When 48 spaces are filled, the last four cards are turned up, and you choose one to fill the last space.",
  ],
};
