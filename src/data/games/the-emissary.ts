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
    "Win exactly the right number of debates in each kingdom while managing one-time advisors.",
  quickStart: [
    "Pick a kingdom and win exactly its listed number of debates. Draw next topic; when possible, follow topic suit.",
  ],
  howToPlay: [
    "You must visit each kingdom, and win the exact number of debates indicated by the number of that kingdom (1 through 8).",
    "You start each visit with 8 cards, and four advisors (Jacks). When winning over a kingdom, its ruler joins you as an advisor (Queen/King), but you may only use their services once, whereas your own advisors can be used anew each kingdom.",
    "When ready, select the next topic to debate. When able, you must be a card of the same suit.",
    "Each ruler has a trump suit (its own). To win a debate, you must play a card of higher value and of the same suit, or any card of the trump suit.",
  ],
  about: [
    "You are a young noble, send by your father to gather support from eight neighboring kingdoms. You must engage in a series of debates to win over each kingdom's ruler.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },
};
