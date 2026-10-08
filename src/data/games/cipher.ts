import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const cipher: GameDefinition = {
  path: "/cipher",
  title: "Cipher",
  aliases: ["Mastermind", "Wordle"],
  thumbnailCredit: {
    title: "Woman Reading a Letter",
    artistName: "Johannes Vermeer",
    date: "c. 1663",
    sourceName: "Rijksmuseum",
    sourceLink: "https://www.rijksmuseum.nl/en/collection/SK-C-251",
  },
  enabledOnLocalOnly: true,
  tags: [GameTag.Puzzles],
  lowerScoreIsBetter: true,
  rating: {
    complexity: 20,
    difficulty: 40,
    luck: 25,
  },
  thumbnail: "Cipher.webp",
  background: GAME_BACKGROUNDS.bookstore,
  animation: GameAnimations.CandleMotes,
  gameColorDark: "#2a2535",
  gameColorPale: "#ebe3f5",
  gameColorAccent: "#c7a2f0",
  cardBack: CardBackColors.Plum,
  quickStart: [
    "Three clubs lie face down in a secret order. Find their ranks and places in eight guesses.",
    "Lay three cards of different ranks and tap Check. Green: right rank, right place. Amber: the rank is in the cipher, elsewhere.",
    "Cards that stay plain aren't in the cipher at all.",
  ],
  howToPlay: [
    "## Objective",
    "Crack the cipher, three clubs of different ranks in a secret order, within eight guesses.",

    "## Guessing",
    "- Tap cards from the pool, a pile for each rank, to lay a guess of three different ranks in order. Tap a card in the guess to put it back.",
    "- Tap **Check**. Each card of the guess is marked: **green** when its rank sits in that place of the cipher, **amber** when its rank is in the cipher but elsewhere, and left plain when its rank isn't in the cipher at all.",
    "- Checked guesses stay on the table, and the pool's piles take their colour, so what you've learnt is always in view. When a rank's pile runs out, a card of that rank can be picked up again from an earlier guess.",

    "## The End",
    "Three greens crack the cipher, and your score is the number of guesses it took. After eight guesses, the cipher is turned up and the game is lost.",
  ],
};
