import { GameDefinition, GameTag } from "../games-data";

export const hideAndSeek: GameDefinition = {
  path: "/hide-and-seek",
  tip: {
    default: {
      text: "Make legal moves to uncover hidden cards; avoid burying them.",
    },
  },
  title: "Hide and Seek",
  thumbnail: "HideAndSeek.jpg",
  cardBack: "HideAndSeek.png",
  background: "felt-green.jpg",
  cardColorBg: "#221815",
  cardColorText: "#c5f7da",
  cardDescription:
    "Find your hidden playmates through careful planning and deduction.",
  stats: {
    complexity: 20,
    difficulty: 60,
    luck: 65,
  },
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  byLine: "Game design by Wil Su",
  briefRules: [
    "Reveal hidden cards through legal uncover moves.",
    "Avoid locking hidden cards under unusable stacks.",
    "Finish by uncovering and resolving the final hidden sets.",
  ],
};
