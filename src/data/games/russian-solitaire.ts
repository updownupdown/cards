import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const russianSolitaire: GameDefinition = {
  path: "/russian-solitaire",
  title: "Russian Solitaire",
  tags: [GameTag.TableauBuilding, GameTag.SequenceBuilding],
  rating: { complexity: 35, difficulty: 80, luck: 30 },
  thumbnail: "RussianSolitaire.jpg",
  background: GAME_BACKGROUNDS.siberia,
  animation: GameAnimations.Snow,
  gameColorDark: "#152c47",
  gameColorMid: "#556780",
  gameColorPale: "#fff0c1",
  cardDescription:
    "Yukon at its most brutal: haul mixed groups, and build the tableau down in suit.",
  quickStart: [
    "Build foundations up by suit, A to K.",
    "Build columns down by suit.",
    "Move any face-up stack.",
    "Only Kings can fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Build the four foundations up by suit, from Ace to King.",

    "## Rules",
    "- Move any face-up card or **stack** of cards, **building down by rank, and in the same suit.**.",
    "- The carried cards do **not** need to be in sequence.",
    "- Empty columns can only be filled with Kings.",
    "- Double-tap or drag single cards to the foundations.",
  ],
};
