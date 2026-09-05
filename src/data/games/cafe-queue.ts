import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";

export const cafeQueue: GameDefinition = {
  path: "/cafe-queue",
  title: "Cafe Queue",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 40,
    difficulty: 60,
    luck: 55,
  },
  thumbnail: "CafeQueue.jpg",
  background: GAME_BACKGROUNDS.london,
  gameColorDark: "#2b1c29",
  gameColorMid: "#643b12",
  gameColorPale: "#eed5a0",
  cardDescription:
    "A push-your-luck game where you must manage ordered queues of customers.",
  quickStart: [
    "Select a queue position for the next customer.",
    "Queues must remain in descending order of rank.",
    "If a customer doesn't fit, discard the queue, or turn away two customers.",
  ],
  howToPlay: [
    "## Objective",
    "Deal the entire deck without discarding all four cards from the same rank.",

    "## Placing Customers",
    "- Choose a numbered position from one of the queues, then reveal the next customer.",
    "- A customer may join the queue only if its ranks fits within the descending order of the queue (from high to low).",
    "- If the customer does not fit, you can:",
    "-- seat it by discarding the selected queue, or",
    "-- turn them away, along with the next customer.",
    "- Lose immediately when four cards from the same rank have been discarded.",

    "## Peek",
    "You may tap the deck to see the waiting customers. The deck will be reshuffled afterwards.",
  ],
};
