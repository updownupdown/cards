import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const whitehead: GameDefinition = {
  path: "/whitehead",
  title: "Whitehead",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 35, difficulty: 50, luck: 40 },
  background: GAME_BACKGROUNDS.bloomingTree,
  animation: GameAnimations.Pollen,
  gameColorDark: "#30383a",
  gameColorPale: "#edf0e6",
  cardBack: CardBackColors.Ocean,
  thumbnail: "Whitehead.webp",
  cardDescription:
    "An open Klondike relative built by color, with suited runs moving together.",
  quickStart: [
    "Build foundations up by suit.",
    "Build down in the same color.",
    "Move suited runs; any card fills a space.",
  ],
  howToPlay: [
    "## Objective",
    "Build four foundations up by suit from Ace to King.",
    "## Rules",
    "- All tableau cards are face-up.",
    "- Build down in the same color.",
    "- Properly ordered same-suit runs move together.",
    "- Any card may fill an empty column.",
  ],
};
