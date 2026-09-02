import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const moosehide: GameDefinition = {
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
    "Build foundations up by suit, A to K.",
    "Build columns down on any suit except the same suit.",
    "Move any face-up stack.",
    "Only Kings can fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Build the four foundations up by suit, from Ace to King.",

    "## Rules",
    "- Move any face-up card or **stack** of cards, **building down by rank, and on a card of a different suit.**.",
    "- The carried cards do **not** need to be in sequence.",
    "- Empty columns can only be filled with Kings.",
    "- Double-tap or drag single cards to the foundations.",
  ],
};
