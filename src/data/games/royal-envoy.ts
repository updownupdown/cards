import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

export const royalEnvoy: GameDefinition = {
  path: "/royal-envoy",
  title: "Royal Envoy",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 85,
    difficulty: 80,
    luck: 35,
  },
  thumbnail: "RoyalEnvoy.webp",
  thumbnailCredit: {
    title: "Arrival of the messenger",
    artistName: "Jules Worms",
    sourceName: "Artvee",
    sourceLink: "https://artvee.com/dl/arrival-of-the-messenger/",
  },
  gameColorDark: "#241e33",
  gameColorPale: "#acdeff",
  cardBack: CardBackColors.Bicycle,
  quickStart: [
    "Choose a kingdom and win exactly its listed number of debates.",
    "Follow the topic suit when possible.",
    "Use the ruler's suit as trump.",
    "Use advisor powers at strategic times.",
  ],
  howToPlay: [
    "## Objective",
    "Win exactly the number of debates shown on each of the eight kingdoms. Winning too few or too many debates in any kingdom loses the game.",

    "## Debates",
    "- Start each kingdom with eight cards in hand. Choose a topic by revealing a card from the stock deck, then play a card from your hand.",
    "- When possible, you **must** follow the topic's suit.",
    "- Win by playing a higher card of the topic suit, or by playing the ruler's trump suit when the topic is not trump.",

    "## Advisors",
    "- You may use any number of advisors at a time, but only between debates (and not while a topic is active).",
    "- Select a Jack advisor to see and use its powers. Your four Jack advisors refresh for each kingdom.",
    "- When you win a kingdom, its Queen or King becomes a temporary advisor. Each such ruler advisor may be used only once.",
  ],
};
