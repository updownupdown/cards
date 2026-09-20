import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const busyAces: GameDefinition = {
  path: "/busy-aces",
  title: "Busy Aces",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 35, difficulty: 55, luck: 50 },
  thumbnail: "BusyAces.webp",
  background: GAME_BACKGROUNDS.modernMetal1,
  animation: GameAnimations.Firefly,
  gameColorDark: "#1a2233",
  gameColorMid: "#4a78b8",
  gameColorPale: "#dde9ff",
  cardDescription:
    "Keep twelve short two-deck columns moving, one suited card at a time.",
  quickStart: [
    "Build all eight foundations up by suit, from A to K.",
    "Build tableau down by suit, one card at a time.",
    "Any card fills a space. There is no stock redeal.",
  ],
  howToPlay: [
    "## Objective",
    "Build all eight foundations up by suit from Ace to King.",
    "## Rules",
    "- Build tableau columns down by suit, moving one card at a time.",
    "- Any card may fill an empty column.",
    "- Turn the stock one card at a time with no redeal.",
  ],
};
