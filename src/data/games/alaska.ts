import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const alaska: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/alaska",
  title: "Alaska",
  tags: [GameTag.TableauBuilding],
  rating: { complexity: 45, difficulty: 60, luck: 30 },
  background: GAME_BACKGROUNDS.antarctica,
  animation: GameAnimations.Snow,
  gameColorDark: "#20343e",
  gameColorPale: "#e5edf0",
  cardDescription:
    "A Yukon expedition where suited cards may climb or descend.",
  quickStart: [
    "Build tableau one rank up or down in the same suit.",
    "Move any face-up card with every card covering it.",
    "Only Kings fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Build four foundations from Ace to King by suit.",
    "## Rules",
    "- Alaska uses Yukon's seven-column deal with no stock.",
    "- Build tableau one rank up or down in the same suit.",
    "- Move any face-up card together with all cards covering it.",
    "- Only Kings or groups headed by Kings fill empty columns.",
  ],
};
