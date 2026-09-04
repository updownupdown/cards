import { GameDefinition, GameTag } from "../games-data";

export const diamond: GameDefinition = {
  path: "/diamond",
  title: "Diamond",
  tags: [GameTag.EasyToLearn, GameTag.GridPlacement, GameTag.ScoringPuzzles],
  rating: {
    complexity: 35,
    difficulty: 55,
    luck: 55,
  },
  thumbnail: "Diamond.jpg",
  gameColorDark: "#30171B",
  gameColorPale: "#FFE4E4",
  cardDescription:
    "Place every Club and Spade around four Diamonds using arithmetic matches.",
  quickStart: [
    "Place all black cards before running out of Diamonds.",
    "Placed cards must alternate suit.",
    "Center card: any match. Outer cards: exact match.",
    "Inner cards: match either adjacent Diamond's value, their sum, difference, product, or quotient.",
    "When blocked, tap a black pile to clear it, or replace a Diamond.",
  ],
  howToPlay: [
    "## Objective",
    "Play all **26 black cards** around the four Diamond cards before the Diamond stock runs out.",

    "## Playing Black Cards",
    "- Select either card in your hand, then tap a legal pile. When both hand cards have been played, two more are dealt automatically.",
    "- Cards in every pile must alternate between Clubs and Spades.",
    "-- Outside piles must match its adjacent Diamond's value and holds up to **3 cards**.",
    "-- Inside piles touch two Diamonds. A card may match either value, or their sum, positive difference, product, or whole-number quotient. Inside piles hold up to **4 cards**.",
    "-- The center pile accepts any card, and holds up to **5 cards**.",

    "## Replenishing Diamonds",
    "- A full black pile clears automatically. Every adjacent Diamond is discarded and replaced from the Diamond stock.",
    "- To clear a pile early, deselect your hand card and tap the pile.",
    "- When blocked, tap the Diamond stock and then one of the four Diamond cards to replace that card.",
    "- You lose if a pile must be cleared and the stock does not contain enough Diamonds to replace all adjacent cards.",

    "## Card Values",
    "Aces are 1, Jacks 11, Queens 12, and Kings 13.",
  ],
};
