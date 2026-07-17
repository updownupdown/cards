import { GameDefinition, GameTag } from "../games-data";

export const theBobaTeaShop: GameDefinition = {
  path: "/the-boba-tea-shop",
  tip: {
    default: {
      text: "Fill orders with legal stacks; avoid deadlocks; peek reshuffles.",
    },
  },
  title: "The Boba Tea Shop",
  thumbnail: "BobaTea.jpg",
  cardBack: "BobaTeaShop.png",
  background: "wood-vertical.jpg",
  cardColorBg: "#2b1c29",
  cardColorText: "#eed5a0",
  cardDescription:
    "A push-your-luck game where you must manage ordered queues of customers.",
  stats: {
    complexity: 30,
    difficulty: 55,
    luck: 55,
  },
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  byLine: "Game design by Wil Su, 2021",
  howToPlay: [
    "Play cards into valid stacks to satisfy order constraints.",
    "Plan around blocked stacks so you do not run out of legal moves.",
    "Complete all required stacks to win.",
    "You are allowed to tap the deck at any time to see who else is waiting, but the deck will be reshuffled afterwards.",
  ],
};
