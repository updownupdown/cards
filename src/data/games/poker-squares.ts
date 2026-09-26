import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const pokerSquares: GameDefinition = {
  path: "/poker-squares",
  title: "Poker Squares",
  tags: [
    GameTag.PokerAndCribbage,
    GameTag.GridPlacement,
    GameTag.ScoringPuzzles,
  ],
  rating: {
    complexity: 35,
    difficulty: 65,
    luck: 40,
  },
  thumbnail: "PokerSquares.webp",
  thumbnailCredit: {
    title: "The Card Players",
    artistName: "Paul Cézanne",
    date: "1890–92",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/435868",
  },
  background: GAME_BACKGROUNDS.casino,
  animation: GameAnimations.Glitter,
  gameColorDark: "#112c1f",
  gameColorPale: "#fff4ce",
  cardBack: CardBackColors.Moss,
  cardDescription:
    "Build ten poker hands within a grid to achieve the highest score possible.",
  quickStart: [
    "Place each dealt card carefully; rows and columns score poker hands.",
  ],
  howToPlay: [
    "## Objective",
    "Score at least 200 points by building poker hands in the rows and columns.",

    "## Rules",
    "- Tap any empty square to place the top stock card.",
    "- Cards cannot be moved after placement.",
    "- Continue until all 25 squares are filled.",

    "## Scoring",
    "The five rows and columns are scored as per the American scoring for poker hands:",
    "- **Royal Flush:** 100",
    "- **Straight Flush:** 75",
    "- **Four of a Kind:** 50",
    "- **Full House:** 25",
    "- **Flush:** 20",
    "- **Straight:** 15",
    "- **Three of a Kind:** 10",
    "- **Two Pair:** 5",
    "- **One Pair:** 2",
  ],
};
