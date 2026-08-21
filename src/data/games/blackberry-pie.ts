import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const blackberryPie: GameDefinition = {
  path: "/blackberry-pie",
  title: "Blackberry Pie",
  tags: [
    GameTag.EasyToLearn,
    GameTag.SequenceBuilding,
    GameTag.TableauBuilding,
  ],
  rating: {
    complexity: 38,
    difficulty: 62,
    luck: 52,
  },
  background: GAME_BACKGROUNDS.forest,
  thumbnail: "BlackberryPie.jpg",
  cardDescription:
    "Build matching trios under berry cards to help the Queen bake her pie.",
  gameColorDark: "#2a1c33",
  gameColorPale: "#f7e4ff",
  quickStart: [
    "Choose a hand or retainer card, then place it under an available berry.",
    "After the first play, place beside the previous column unless you played a joker.",
    "Collect every berry card to win.",
  ],
  howToPlay: [
    "## Objective",
    "**Collect all ten club berry cards** by completing a suitable set beneath each one.",
    "",
    "## Your Turn",
    "- Your hand refills to three cards from the stock whenever possible.",
    "- Choose a card from your hand or either retainer, then choose a berry column.",
    "- After the first card, play immediately left or right of the previous column.",
    "- A joker lets your next card go under any uncollected berry, including the same column.",
    "",
    "## Collecting Berries",
    "A set is any three non-joker cards beneath a berry that includes its rank and is either:",
    "- A run of three consecutive ranks.",
    "- Three cards of the same suit.",
    "- Three picture cards (Jacks, Queens, or Kings).",
    "Extra cards may remain beneath a collected berry.",
    "",
    "## Scoring",
    "Score the pip values of your collected berries, **5 bonus points** for collecting all ten, and **1 point** for every card left in hand.",
  ],
};
