import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const moosehide: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/moosehide",
  title: "Moosehide",
  tags: [GameTag.TableauBuilding],
  rating: { complexity: 40, difficulty: 45, luck: 35 },
  background: GAME_BACKGROUNDS.yukon,
  animation: GameAnimations.Snow,
  gameColorDark: "#29362e",
  gameColorPale: "#e2dfca",
  cardDescription:
    "A Yukon relative that descends on every suit except its own.",
  quickStart: [
    "Build down on any suit except the same suit.",
    "Move arbitrary face-up groups together.",
    "Only Kings fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Build four foundations from Ace to King by suit.",
    "## Rules",
    "- Moosehide uses Yukon's seven-column deal with no stock.",
    "- Build down by rank on any different suit.",
    "- Any face-up card may move with all cards covering it, regardless of their order.",
    "- Only Kings or groups headed by Kings fill empty columns.",
  ],
};
