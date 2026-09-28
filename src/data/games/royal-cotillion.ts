import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const royalCotillion: GameDefinition = {
  path: "/royal-cotillion",
  title: "Royal Cotillion",
  tags: [
    GameTag.DoubleDeckers,
    GameTag.SequenceBuilding,
    GameTag.StockAndWaste,
  ],
  rating: {
    complexity: 40,
    difficulty: 50,
    luck: 70,
  },
  thumbnail: "RoyalCotillion.webp",
  thumbnailCredit: {
    title: "Charles II dancing at a Ball at Court",
    artistName: "Hieronymus Janssens",
    date: "1660",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Hieronymus_Janssens_(Antwerp_1624_-_Antwerp_1693)_-_Charles_II_dancing_at_a_Ball_at_Court_-_RCIN_400525_-_Royal_Collection.jpg",
  },
  background: GAME_BACKGROUNDS.alhambra,
  animation: GameAnimations.ManaDust,
  gameColorDark: "#211a36",
  gameColorPale: "#f1e6ff",
  cardBack: CardBackColors.Violet,
  cardDescription:
    "Two decks dance up the foundations in steps of two, from Aces and from Twos.",
  quickStart: [
    "Move all 104 cards to the eight foundations, building by suit in steps of two.",
    "Aces build A, 3, 5... K, 2, 4... Q by suit.",
    "Twos build 2, 4, 6... Q, A, 3... K by suit.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 104 cards onto the eight foundations.",

    "## Foundations",
    "- Every foundation builds **up by suit in steps of two**, wrapping around after the King.",
    "- Ace foundations: A, 3, 5, 7, 9, J, K, 2, 4, 6, 8, 10, Q.",
    "- Two foundations: 2, 4, 6, 8, 10, Q, A, 3, 5, 7, 9, J, K.",

    "## Rules",
    "- Only the bottom card of each left-hand column is available, and spaces are never refilled.",
    "- Every card on the right is available.",
    "- Tap an empty right-hand space to fill it with the top **waste** card, or from the **stock** if the waste is empty.",
    "- Tap the **stock** to turn one card onto the waste. There is no redeal.",
  ],
};
