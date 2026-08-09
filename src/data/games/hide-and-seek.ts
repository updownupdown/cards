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
  background: GAME_BACKGROUNDS.fallLeaves,
  animation: GameAnimations.Leaves,
  cardBack: "HideAndSeek.png",
  gameColorDark: "#221815",
  gameColorPale: "#c5f7da",
  cardDescription:
    "Find your hidden playmates through careful planning and deduction.",
  quickStart: [
    "Place guesses around the hidden playmates.",
    "Reveal playmates and score for each guess of the same suit on the same line.",
  ],
  howToPlay: [
    "## Objective",
    "Score at least 20 points after revealing all 12 hidden playmates.",

    "## Gameplay",
    "- The 12 face-down playmates are Jacks, Queens, and Kings. The remaining cards form the stock.",
    "- Place the top stock card in an empty guess space around the playmate grid.",
    "- You may withdraw a guess card, at the cost of also discarding the next stock card.",
    "- At any time, reveal a hidden playmate. Every guess card of the same suit in the same horizontal or vertical line is moved to your score pile.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },
};
