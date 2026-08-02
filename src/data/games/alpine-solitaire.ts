import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const alpineSolitaire: GameDefinition = {
  path: "/alpine-solitaire",
  title: "Alpine Solitaire",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 75,
    difficulty: 85,
    luck: 40,
  },
  thumbnail: "AlpineSolitaire.jpg",
  background: GAME_BACKGROUNDS.mountain1,
  animation: GameAnimations.Snow,
  gameColorDark: "#2a3b4d",
  gameColorPale: "#e8f2ff",
  cardDescription:
    "A solo climbing game: play ever-higher routes to reach three camps before the deck runs out.",
  quickStart: [
    "Build progressively higher routes to empty hand. Rest to reset routes.",
  ],
  howToPlay: [
    "## Objective",
    "Reach three camps by playing a route that empties your hand — while your milestones keep getting higher.",
    "## Route Types",
    "- **Ascent:** two or more cards in consecutive increasing order (anchor is highest).",
    "- **Traverse:** one or more cards of the same value (choose any anchor).",
    "- **Descent:** two or more cards of one suit in decreasing value (anchor is lowest).",
    "Tap cards in order; the **last card tapped is the anchor**.",
    "## Route Sequences",
    "Each route must be higher than the previous one: more cards wins, else ascent > traverse > descent, else the higher anchor.",
    "## Card Draws",
    "After a route you draw cards based on the anchor's suit:",
    "- **{AH} Hearts (Cautious):** one per hand card ranked higher than the anchor.",
    "- **{AC} Clubs (Reckless):** one per hand card ranked lower than the anchor.",
    "- **{AD} Diamonds (Technical):** one per diamond in hand.",
    "- **{AS} Spades (Free-Climbing):** one per non-spade suit in the route.",
    "You never draw more than the number of cards in the route.",
    "## Rest & Camps",
    "**Rest** discards your play area and swaps the fatigue pile into your hand (then grows the fatigue pile). Reaching a **camp** adds a qualifying milestone to your trail and deals a fresh hand.",
    "## Settings",
    "- **Difficulty:** Gentle, Standard, or Intense change how milestones qualify.",
    "- **Eight-Thousander challenges:** fourteen named peaks each tweak the rules and set the trail length.",
  ],
  about: [
    "Alpine Solitaire by Austin Palmer is a climbing game for one player.",
    "Balance aggressive routes against the fatigue they create, and choose a difficulty or one of fourteen eight-thousander challenges in Settings.",
  ],
  credits: {
    creators: [GameCreators.AustinPalmer],
    creationDate: "2023",
  },
};
