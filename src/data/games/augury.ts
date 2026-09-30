import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const augury: GameDefinition = {
  path: "/augury",
  title: "Augury",
  enabledOnLocalOnly: true,
  tags: [GameTag.Puzzles],
  rating: {
    complexity: 35,
    difficulty: 50,
    luck: 35,
  },
  thumbnail: "Augury.webp",
  thumbnailCredit: {
    title: "The Oracle",
    artistName: "Camillo Miola",
    date: "1880",
    sourceName: "J. Paul Getty Museum",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Camillo_Miola_(Biacca)_-_The_Oracle_-_72.PA.32_-_J._Paul_Getty_Museum.jpg",
  },
  background: GAME_BACKGROUNDS.greece,
  animation: GameAnimations.Birds,
  gameColorDark: "#2a1e17",
  gameColorPale: "#f2e3c9",
  gameColorAccent: "#dba35a",
  cardBack: CardBackColors.Copper,
  quickStart: [
    "A hidden law decides which cards may follow the last card on the path.",
    "Play a card you think fits, or declare that none in your hand does.",
    "Make eight right calls in a row to win.",
  ],
  howToPlay: [
    "## Objective",
    "Work out the **hidden law** well enough to make **eight right calls in a row**.",

    "## The Law",
    "- Each game has a secret law about which cards may follow the **last card on the path**. For example, it might only allow a card of the other colour.",
    "- The first card starts the path.",

    "## Playing",
    "- You hold four cards. Tap one to play it.",
    "- If the law allows it, the card joins the path and counts as a right call.",
    "- If not, it is turned away: it lies greyed in the grid, and your run of right calls starts again.",
    "- You draw back up to four after each play.",

    "## None Fit",
    "- If you think no card in your hand fits, tap **None Fit**.",
    "- If you're right, it counts as a right call and you get a fresh hand.",
    "- If a card did fit, it is played for you (in purple), and your run starts again.",
    "- Older cards and skipped hands go face down to the **Discard** pile; tap it to see them.",

    "## End",
    "- You win with eight right calls in a row.",
    "- You lose if your hand runs out. The law is revealed either way.",

    "## Difficulty",
    "- **Easy:** simple laws about the last card's colour, suit or rank.",
    "- **Difficult:** subtler laws, some looking two cards back or mixing colour and rank.",
  ],
};
