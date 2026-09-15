import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const busyAces: GameDefinition = {
  path: "/busy-aces",
  title: "Busy Aces",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: { complexity: 35, difficulty: 55, luck: 50 },
  thumbnail: "DefaultThumbnail.webp",
  background: GAME_BACKGROUNDS.interchange,
  animation: GameAnimations.Birds,
  gameColorDark: "#1a2233",
  gameColorMid: "#4a78b8",
  gameColorPale: "#dde9ff",
  cardDescription:
    "Keep twelve short two-deck columns moving, one suited card at a time.",
  quickStart: [
    "Build foundations up by suit.",
    "Build tableau down by suit, one card at a time.",
    "Any card fills a space; play the stock once.",
  ],
  howToPlay: [
    "## Objective",
    "Build all eight foundations up by suit from Ace to King.",
    "## Rules",
    "- Twelve columns begin with one face-down and one face-up card.",
    "- Build down by suit, moving one card at a time.",
    "- Any card may fill an empty column.",
    "- Turn the stock one card at a time with no redeal.",
  ],
};
