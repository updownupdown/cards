import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const theBobaTeaShop: GameDefinition = {
  path: "/the-boba-tea-shop",
  title: "The Boba Tea Shop",
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  rating: {
    complexity: 40,
    difficulty: 60,
    luck: 55,
  },
  thumbnail: "BobaTea.jpg",
  background: GAME_BACKGROUNDS.london,
  cardBack: "BobaTeaShop.png",
  cardColorBg: "#2b1c29",
  cardColorText: "#eed5a0",
  cardDescription:
    "A push-your-luck game where you must manage ordered queues of customers.",
  quickStart: [
    "Fill orders with legal stacks; avoid deadlocks; peek reshuffles.",
  ],
  howToPlay: [
    "Play cards into valid stacks to satisfy order constraints.",
    "Plan around blocked stacks so you do not run out of legal moves.",
    "Complete all required stacks to win.",
    "You are allowed to tap the deck at any time to see who else is waiting, but the deck will be reshuffled afterwards.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },
};
