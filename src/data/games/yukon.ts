import { GameAnimations } from "@/animations/types";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const yukon: GameDefinition = {
  path: "/yukon",
  title: "Yukon",
  tags: [GameTag.TableauBuilding, GameTag.SequenceBuilding],
  rating: { complexity: 35, difficulty: 55, luck: 35 },
  thumbnail: "Yukon.webp",
  background: GAME_BACKGROUNDS.yukon,
  animation: GameAnimations.Clouds,
  gameColorDark: "#20303a",
  gameColorMid: "#5a90af",
  gameColorPale: "#e6f1f7",
  cardDescription:
    "Klondike unleashed: move whole groups of cards, in any order, across the tableau.",
  quickStart: [
    "Build foundations up by suit, A to K.",
    "Build columns down by alternating colors.",
    "Move any face-up stack.",
    "Only Kings can fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Build the four foundations up by suit, from Ace to King.",

    "## Rules",
    "- Move any face-up card or **stack** of cards, **building down by rank, in alternating colors.**.",
    "- The carried cards do **not** need to be in sequence.",
    "- Empty columns can only be filled with Kings.",
    "- Double-tap or drag single cards to the foundations.",
  ],
};
