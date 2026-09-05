import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const thumbAndPouch: GameDefinition = {
  path: "/thumb-and-pouch",
  title: "Thumb and Pouch",
  tags: [GameTag.StockAndWaste, GameTag.TableauBuilding],
  rating: { complexity: 25, difficulty: 30, luck: 35 },
  background: GAME_BACKGROUNDS.cozyCabin,
  animation: GameAnimations.Dust,
  gameColorDark: "#3b3028",
  gameColorMid: "#ad8a56",
  gameColorPale: "#ead9b8",
  cardDescription:
    "A flexible Klondike where cards avoid their own suit and any card fills a gap.",
  quickStart: [
    "Build down on any suit except the same suit.",
    "Move correctly packed runs.",
    "Any card or run may fill an empty column.",
  ],
  howToPlay: [
    "## Objective",
    "Build four foundations from Ace to King by suit.",
    "## Rules",
    "- The tableau begins in the standard seven-column Klondike layout.",
    "- Build down by rank, but never place a card on the same suit.",
    "- Move packed sequences together.",
    "- Any card or sequence may fill an empty column.",
  ],
};
