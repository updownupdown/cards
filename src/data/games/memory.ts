import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const memory: GameDefinition = {
  path: "/memory",
  title: "Memory",
  tags: [GameTag.EasyToLearn, GameTag.PairMatching],
  rating: {
    complexity: 15,
    difficulty: 35,
    luck: 5,
  },
  thumbnail: "Memory.jpg",
  background: GAME_BACKGROUNDS.savanah,
  cardBack: "Memory.jpg",
  gameColorDark: "#243b35",
  gameColorPale: "#e8f1df",
  cardDescription: "Reveal hidden pairs and clear the board using your memory.",
  quickStart: ["Find matching pairs by remembering where each card is hidden."],
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
  about: [
    "Memory is a concentration game: every revealed card gives you information for a future turn.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
  },
};
