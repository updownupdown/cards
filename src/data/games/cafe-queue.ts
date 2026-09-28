import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

export const cafeQueue: GameDefinition = {
  path: "/cafe-queue",
  title: "Cafe Queue",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 40,
    difficulty: 60,
    luck: 55,
  },
  thumbnail: "CafeQueue.webp",
  thumbnailCredit: {
    title: "Café Terrace at Night",
    artistName: "Vincent van Gogh",
    date: "Arles, circa 16 September 1888",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Terrasse_des_Cafés_an_der_Place_du_Forum_in_Arles_am_Abend1.jpeg",
  },
  gameColorDark: "#2b1c29",
  gameColorPale: "#eed5a0",
  cardBack: CardBackColors.Walnut,
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
    "- A customer may join the queue only if its rank fits within the descending order of the queue (from high to low).",
    "- If the customer does not fit, you can:",
    "-- seat it by discarding the selected queue, or",
    "-- turn them away, along with the next customer.",
    "- Lose immediately when four cards from the same rank have been discarded.",

    "## Peek",
    "You may tap the deck to see the waiting customers. The deck will be reshuffled afterwards.",
  ],
};
