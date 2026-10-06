import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const ozanamsSquare: GameDefinition = {
  path: "/ozanams-square",
  title: "Ozanam's Square",
  aliases: ["Graeco-Latin Square"],
  tags: [GameTag.Puzzles, GameTag.GridPlacement],
  rating: {
    complexity: 15,
    difficulty: 35,
    luck: 5,
  },
  thumbnail: "OzanamsSquare.webp",
  thumbnailCredit: {
    title: "Melencolia I",
    artistName: "Albrecht Dürer",
    date: "1514",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Melencolia_I_MET_DP820348.jpg",
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
  ],
  howToPlay: [
    "## Objective",
    "Fill the grid such that each **row, column, and diagonal** hold **one card of each rank and one card of each suit**.",

    "## Gameplay",
    "- Some cards are dealt into place at the start, and can't be moved.",
    "- Move cards from the tray to an empty space; cards you place can be moved to another space, swapped, or dragged back to the tray.",
    "- A card that repeats a rank or suit in one of its lines is marked in red.",
    "- Every deal has **exactly one** solution.",

    "## History",
    "Jacques Ozanam set this puzzle with playing cards in his *Récréations mathématiques et physiques* (1725). Leonhard Euler later studied squares like it, which he called Graeco-Latin squares.",
  ],
};
