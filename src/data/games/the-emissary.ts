import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const theEmissary: GameDefinition = {
  path: "/the-emissary",
  title: "The Emissary",
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  rating: {
    complexity: 85,
    difficulty: 80,
    luck: 35,
  },
  thumbnail: "Emissary.jpg",
  background: GAME_BACKGROUNDS.castle,
  cardBack: "TheEmissary.png",
  gameColorDark: "#241e33",
  gameColorPale: "#acdeff",
  cardDescription:
    "Win exactly the right number of debates in each kingdom, using your advisors.",
  quickStart: [
    "Choose a kingdom and win exactly its listed number of debates.",
    "Follow the topic suit when possible",
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
  about: [
    "You are a young noble, send by your father to gather support from eight neighboring kingdoms. You must engage in a series of debates to win over each kingdom's ruler.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },
};
