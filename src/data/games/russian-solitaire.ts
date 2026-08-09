import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const russianSolitaire: GameDefinition = {
  path: "/russian-solitaire",
  title: "Russian Solitaire",
  tags: [GameTag.TableauBuilding],
  rating: {
    complexity: 35,
    difficulty: 80,
    luck: 30,
  },
  thumbnail: "RussianSolitaire.jpg",
  background: GAME_BACKGROUNDS.siberia,
  animation: GameAnimations.Snow,
  gameColorDark: "#152c47",
  gameColorPale: "#fff0c1",
  cardDescription:
    "Yukon at its most brutal: haul mixed groups, and build the tableau down in suit.",
  quickStart: [
    "Build foundations up by suit, A to K.",
    "Move any face-up card or stack between columns, building up by suit.",
    "Only Kings can fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Build the four **foundations** up by suit from Ace to King.",

    "## Rules",
    "- Move any card or group of cards on top of another, if the target card is **one rank higher and of the same suit**.",
    "- The carried cards do **not** need to be in sequence.",
    "- Only Kings can be moved to empty columns.",
    "- Double-tap or drag single cards to the foundations, up by suit.",
  ],
};
