import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameDefinition, GameTag } from "../games-data";

export const swamp: GameDefinition = {
  path: "/swamp",
  title: "Swamp",
  tags: [GameTag.EasyToLearn, GameTag.ModernMechanics, GameTag.SpatialControl],
  rating: {
    complexity: 45,
    difficulty: 55,
    luck: 55,
  },
  background: GAME_BACKGROUNDS.swamp,
  animation: GameAnimations.Firefly,
  thumbnail: "Swamp.jpg",
  cardBack: "Swamp.jpg",
  gameColorDark: "#173b32",
  gameColorPale: "#e4f0c2",
  cardDescription:
    "Manage a hungry ecosystem of gators, bears, hogs, and ducks.",
  quickStart: [
    "Select an animal, then select a highlighted neighbor it can eat.",
    "Complete the required eats each turn; empty spaces refill automatically.",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by surviving four rounds and placing the last card from the deck in the Swamp.",
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
  credits: {
    creators: [GameCreators.PlaylinesGames],
    creationDate: "2025",
  },
};
