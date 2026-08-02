import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const hideAndSeek: GameDefinition = {
  path: "/hide-and-seek",
  title: "Hide and Seek",
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  rating: {
    complexity: 20,
    difficulty: 60,
    luck: 65,
  },
  thumbnail: "HideAndSeek.jpg",
  background: GAME_BACKGROUNDS.playground,
  animation: GameAnimations.FallingLeaves,
  cardBack: "HideAndSeek.png",
  gameColorDark: "#221815",
  gameColorPale: "#c5f7da",
  cardDescription:
    "Find your hidden playmates through careful planning and deduction.",
  quickStart: ["Make legal moves to uncover hidden cards; avoid burying them."],
  howToPlay: [
    "Reveal hidden cards through legal uncover moves.",
    "Avoid locking hidden cards under unusable stacks.",
    "Finish by uncovering and resolving the final hidden sets.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },
};
