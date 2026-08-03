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
  gameColorDark: "#173b32",
  gameColorPale: "#e4f0c2",
  cardDescription:
    "Manage a hungry ecosystem of Gators, Bears, Hogs, and Ducks.",
  quickStart: [
    "Select an animal, then select a highlighted neighbor it can eat.",
    "Complete the required eats each turn; empty spaces refill automatically.",
  ],
  howToPlay: [
    "## Objective",
    "Survive four rounds and win when the last card from the deck enters the Swamp.",
    "## Setup",
    "- Twelve cards are dealt face up in a 4 x 3 grid.",
    "- Diamonds and any just-dealt animal that completes a three-animal row or column become face-down **Ducks**.",
    "- Spades are **Gators**, Clubs are **Bears**, and Hearts are **Hogs**.",
    "## Turns",
    "- Each round has four turns.",
    "- Make one eat per turn in round 1, two in round 2, three in round 3, and four in round 4.",
    "- After the required eats, every empty space refills from the deck.",
    "## Eating",
    "- **Gators** move ← → and eat Hogs or Ducks.",
    "- **Bears** move ↑ ↓ and eat Gators or Ducks.",
    "- **Hogs** move ← → ↑ ↓ and eat Bears, but only while another Hog is orthogonally adjacent before the move.",
    "## Ecosystem Collapse",
    "- You lose when three Bears form a contiguous horizontal line.",
    "- You lose when three Gators form a contiguous vertical line.",
    "- You also lose when no animal can eat while cards remain in the deck.",
    "## Victory",
    "Win immediately when the last card from the deck is placed.",
  ],
  about: [
    "Swamp is a ten-minute ecosystem puzzle designed by Playlines Games.",
  ],
  credits: {
    creators: [GameCreators.PlaylinesGames],
    creationDate: "2025",
  },
};
