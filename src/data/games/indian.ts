import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const indian: GameDefinition = {
  path: "/indian",
  title: "Indian",
  tags: [
    GameTag.FortyThievesFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 35, difficulty: 30, luck: 40 },
  thumbnail: "Indian.webp",
  background: GAME_BACKGROUNDS.indianLandscape,
  animation: GameAnimations.Mist,
  gameColorDark: "#49362a",
  gameColorPale: "#ead6ad",
  cardBack: CardBackColors.Moss,
  cardDescription:
    "Build two-deck columns down while carefully avoiding matching suits.",
  quickStart: [
    "Build down on any suit except the same suit.",
    "Move one exposed card at a time.",
    "Any card fills an empty column; the stock has one pass.",
  ],
  howToPlay: [
    "## Objective",
    "Build eight foundations from Ace to King by suit.",
    "## Rules",
    "- Ten columns of three are dealt; the first card in each is face down.",
    "- Build down by rank on any suit except the destination's suit.",
    "- Move one exposed card at a time.",
    "- Empty columns accept any card and the stock is dealt once.",
  ],
};
