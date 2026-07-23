import { GameDefinition, GameTag } from "../games-data";

export const memory: GameDefinition = {
  path: "/memory",
  tip: {
    default: "Find matching pairs by remembering where each card is hidden.",
  },
  title: "Memory",
  thumbnail: "Memory.jpg",
  cardBack: "DefaultCardBack.png",
  background: "felt-grey.jpg",
  cardColorBg: "#243b35",
  cardColorText: "#e8f1df",
  cardDescription: "Reveal hidden pairs and clear the board using your memory.",
  rating: {
    complexity: 15,
    difficulty: 35,
    luck: 5,
  },
  tags: [GameTag.EasyToLearn],
  about: [
    "Memory is a concentration game: every revealed card gives you information for a future turn.",
  ],
  howToPlay: [
    "## Objective",
    "Find every matching pair and clear the board.",
    "## Setup",
    "- Cards are dealt face down in a grid. Every card has one matching clone.",
    "- Choose Easy (4 x 5), Medium (5 x 6), or Hard (6 x 7) in the game settings.",
    "## Playing",
    "- Tap one card to select it, then tap a second card to reveal both.",
    "- Tap the selected card again to unselect it.",
    "- Matching cards move to the discard pile. Mismatched cards turn face down again.",
    "## Winning",
    "Clear every card from the grid.",
  ],
};
