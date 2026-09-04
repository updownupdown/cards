import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const alaska: GameDefinition = {
  path: "/alaska",
  title: "Alaska",
  tags: [GameTag.TableauBuilding],
  rating: { complexity: 45, difficulty: 60, luck: 30 },
  thumbnail: "Alaska.jpg",
  background: GAME_BACKGROUNDS.antarctica,
  animation: GameAnimations.Snow,
  gameColorDark: "#20343e",
  gameColorPale: "#e5edf0",
  cardDescription:
    "A Yukon expedition where suited cards may climb or descend.",
  quickStart: [
    "Build foundations up by suit, A to K.",
    "Build columns one rank up or down in the same suit.",
    "Move any face-up stack.",
    "Only Kings can fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Build the four foundations up by suit, from Ace to King.",

    "## Rules",
    "- Move any face-up card or **stack** of cards onto a card, **building down or up in rank, in the same suit**.",
    "- The carried cards do **not** need to be in sequence.",
    "- Empty columns can only be filled with Kings.",
    "- Double-tap or drag single cards to the foundations.",
  ],
};
