import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const marsh: GameDefinition = {
  path: "/marsh",
  title: "Marsh",
  tags: [GameTag.SpatialControl, GameTag.EasyToLearn],
  rating: {
    complexity: 45,
    difficulty: 55,
    luck: 55,
  },
  background: GAME_BACKGROUNDS.marsh,
  animation: GameAnimations.Firefly,
  thumbnail: "Marsh.jpg",
  gameColorDark: "#173b32",
  gameColorMid: "#34806f",
  gameColorPale: "#e4f0c2",
  cardDescription:
    "Manage a hungry ecosystem of gators, bears, hogs, and ducks.",
  quickStart: [
    "Select an animal, then select a highlighted neighbor it can eat.",
    "Complete the required eats each turn; empty spaces refill automatically.",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by surviving four rounds and placing the last card from the deck in the Marsh.",
    "**Lose** by causing an ecosystem collapse:",
    "- three Bears forming a horizontal line,",
    "- three Gators forming a vertical line, or",
    "- no animal can eat while cards remain in the deck.",

    "## Turns",
    "- The game consists of four rounds, each with four turns.",
    '- Each turn has a number of required "eats" (moves) equal to the current round number.',
    "- After the required eats, empty spaces are refilled from the deck.",

    "## Animals",
    "- **Gators** (♠ Spades)",
    "-- move ← → and eat Hogs or Ducks",
    "- **Bears** (♣ Clubs)",
    "-- move ↑ ↓ and eat Gators or Ducks",
    "- **Hogs** (♥ Hearts)",
    "-- move ← → ↑ ↓ and eat Bears, but only while another Hog is orthogonally adjacent before the move.",
    "- **Ducks** (♦ Diamonds)",
    "-- do not move or eat, but are eaten by Gators and Bears.",
  ],
};
