import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const crossword: GameDefinition = {
  path: "/crossword",
  title: "Crossword",
  enabledOnLocalOnly: true,
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
  background: GAME_BACKGROUNDS.bookstore,
  animation: GameAnimations.Dust,
  gameColorDark: "#2a1d19",
  gameColorPale: "#f3e4d0",
  gameColorAccent: "#e4b18a",
  cardBack: CardBackColors.Slate,
  quickStart: [
    "Place each card next to one already down, side by side or diagonally.",
    "Court cards are black squares: no two may touch side by side.",
    "Number cards between black squares or the edge must add up to an even number.",
  ],
  howToPlay: [
    "## Objective",
    "Fill the **7×7 grid**, like a crossword, with 49 of the 52 cards.",

    "## Placing Cards",
    "- The first card is placed in the centre for you.",
    "- Place each card you turn up in an empty space **next to a card already down**, side by side or diagonally. The spaces it can go are highlighted.",
    "- Jacks, Queens and Kings are the **black squares**. Two of them may never touch side by side (diagonally is fine).",

    "## Even Words",
    "- Number cards are the letters. Aces count 1, and the others their number.",
    "- Once a run of number cards between two black squares, or between a black square and the edge, is complete, it must **add up to an even number**.",
    "- A whole row or column without black squares must add up to an even number too.",
    "- Number cards are tinted orange when exactly one of their row and column runs has an odd sum, and red when both do. Cards in even runs are green only when both runs are closed to further number cards; otherwise they are not tinted.",
    "- Court cards are tinted grey to show the black squares.",

    "## The Last Space",
    "When 48 spaces are filled, the last four cards are turned up, and you choose one to fill the last space.",

    "## End",
    "- You win when all 49 spaces are filled.",
    "- Completing a number run with an odd sum ends the game immediately.",
    "- The game ends as soon as the card to place has nowhere to go. Your score is the number of cards placed.",

    "## Tips",
    "- A black square can end a run early, whatever the run adds up to so far.",
    "- Keep some runs open, so an odd card has somewhere to go.",
  ],
};
