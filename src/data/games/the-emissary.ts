import { GameDefinition, GameTag } from "../games-data";

export const theEmissary: GameDefinition = {
  path: "/the-emissary",
  title: "The Emissary",
  thumbnail: "Emissary.jpg",
  cardBack: "TheEmissary.png",
  background: "wall-tile.jpg",
  cardColorBg: "#241e33",
  cardColorText: "#acdeff",
  cardDescription:
    "Win exactly the right number of debates in each kingdom while managing one-time advisors.",
  stats: {
    complexity: 70,
    difficulty: 70,
    luck: 35,
  },
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  byLine: "Game design by Wil Su",
  briefRules: [
    "Win by successfully debating all 8 kindgoms.",
    "You must win the exact number of required debates for each kingdom (1 to 8).",
    "Collect and use advisors wisely.",
  ],
  about: [
    "You are a young noble, send by your father to gather support from eight neighboring kingdoms. You must engage in a series of debates to win over each kingdom's ruler.",
  ],
  howToPlay: [
    "You must visit each kingdom, and win the exact number of debates indicated by the number of that kingdom (1 through 8).",
    "You start each visit with 8 cards, and four advisors (Jacks). When winning over a kingdom, its ruler joins you as an advisor (Queen/King), but you may only use their services once, whereas your own advisors can be used anew each kingdom.",
    "When ready, select the next topic to debate. When able, you must be a card of the same suit.",
    "Each ruler has a trump suit (its own). To win a debate, you must play a card of higher value and of the same suit, or any card of the trump suit.",
  ],
  tutorial: {
    chooseKingdom: {
      text: "Choose a kingdom to visit.",
      tip: "You must win the exact number of debates shown on the kingdom (1–8).",
    },
    drawTopic: {
      text: "Tap the draw pile to reveal the next debate topic.",
      tip: "When able, the topic must match the suit you can debate.",
    },
    debate: {
      text: "Play a card from your hand to win the debate.",
      tip: "Beat the topic with a higher card of the same suit, or play any card of the trump suit.",
    },
    discard: {
      text: "Choose a card to discard.",
      tip: "Your advisor lets you remove a card from your hand.",
    },
  },
};
