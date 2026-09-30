import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const ozanamsSquare: GameDefinition = {
  path: "/ozanams-square",
  title: "Ozanam's Square",
  aliases: ["Graeco-Latin Square"],
  enabledOnLocalOnly: true,
  tags: [GameTag.Puzzles, GameTag.GridPlacement],
  rating: {
    complexity: 15,
    difficulty: 35,
    luck: 5,
  },
  thumbnail: "OzanamsSquare.webp",
  thumbnailCredit: {
    title: "Queen of Nooses, from The Cloisters Playing Cards",
    artistName: "Unknown South Netherlandish artist",
    date: "about 1475–80",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Queen_of_Nooses,_from_The_Cloisters_Playing_Cards_MET_DP354543.jpg",
  },
  background: GAME_BACKGROUNDS.alhambra,
  animation: GameAnimations.Dust,
  gameColorDark: "#1d1b18",
  gameColorPale: "#efe6d3",
  gameColorAccent: "#cfa95e",
  cardBack: CardBackColors.Charcoal,
  quickStart: [
    "Fill the square with the sixteen Aces, Kings, Queens and Jacks.",
    "No row, column or long diagonal may hold two cards of the same rank or suit.",
    "Drag cards from the tray. Cards dealt into place can't be moved.",
  ],
  howToPlay: [
    "## Objective",
    "Arrange the **Aces, Kings, Queens and Jacks** in a 4×4 square so that every **row**, every **column** and both **long diagonals** hold one card of each rank and one card of each suit.",

    "## Play",
    "- Some cards are dealt into place, and can't be moved. The rest wait in the tray, by suit.",
    "- Drag a card from the tray to an empty space, or tap it and then tap the space.",
    "- Cards you place can be moved to another space, swapped, or dragged back to the tray.",
    "- A card that repeats a rank or suit in one of its lines is marked in red.",
    "- Every deal has **exactly one** solution.",

    "## Difficulty",
    "- **Easy:** seven cards start in place.",
    "- **Difficult:** only as many cards start in place as the solution needs.",

    "## History",
    "Jacques Ozanam set this puzzle with playing cards in his *Récréations mathématiques et physiques* (1725). Leonhard Euler later studied squares like it, which he called Graeco-Latin squares.",
  ],
};
