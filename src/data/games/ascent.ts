import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const ascent: GameDefinition = {
  path: "/ascent",
  title: "Ascent",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 75,
    difficulty: 85,
    luck: 40,
  },
  thumbnail: "Ascent.jpg",
  background: GAME_BACKGROUNDS.mountain1,
  animation: GameAnimations.Snow,
  gameColorDark: "#2a3b4d",
  gameColorPale: "#e8f2ff",
  cardDescription:
    "A solo climbing game: play ever-higher routes to reach three camps before the deck runs out.",
  quickStart: [
    'Build progressively "higher" routes to empty your hand and reach a camp.',
    "Resting resets your hand but increases fatigue.",
    "Win by ascending through all the camps.",
  ],
  howToPlay: [
    "## Objective",
    "Win by ascending through all three camps; reach a camp by emptying your hand; empty your hand by playing routes.",
    "Lose by running out of cards before reaching the final camp.",

    "## Route Types",
    "Routes played must be one of three types, each with an anchor card.",
    "The **last card selected is the anchor**.",

    "- **Ascent:** two or more cards in consecutive increasing order (anchor is highest):",
    "-- {3S} {4S} {5S} (anchor is {5S})",
    "-- {8D} {9C} {10H} {JC} (anchor is {JC})",

    "- **Traverse:** one or more cards of the same value (choose any anchor).",
    "-- {5S} {5D} {5H} (anchor is any of the 5s)",
    "-- {9C} {9D} (anchor is either 9s)",

    "- **Descent:** two or more cards of one suit in decreasing value (anchor is lowest).",
    "-- {10C} {9C} {8C} (anchor is {8C})",
    "-- {KD} {JD} {10D} {2D} (anchor is {2D})",

    "## Route Sequences",
    "Each route must be higher than the previous one:",
    "- More cards = higher",
    "- Ascent > Traverse > Descent",
    "- Otherwise, the highest anchor determines the highest route.",

    "## Card Draws",
    "After a route, the number of cards drawn dependson the anchor's suit:",
    "- **♥ Hearts (Cautious):** one per hand card ranked higher than the anchor.",
    "- **♣ Clubs (Reckless):** one per hand card ranked lower than the anchor.",
    "- **♦ Diamonds (Technical):** one per diamond in hand.",
    "- **♠ Spades (Free-Climbing):** one per non-spade suit in the route.",
    "You never draw more than the number of cards in the played route.",

    "## Resting",
    "**Resting** discards your play area and swaps the fatigue pile into your hand (then grows the fatigue pile).",

    "## Camps",
    "When emptying your hand, if your route is higher than the last route played in the previous camp, it qualifies as a milestone, and you reach a higher camp. A fresh hand is dealt, and you must try to reach the next camp.",
    "If the last route played does not beat the previous camp's milestone, you do not reach the next camp, and must try again with a fresh hand.",

    "## Settings",
    "- **Difficulty:** Gentle, Standard, or Intense change how milestones qualify.",
    "- **Eight-Thousander challenges:** fourteen named peaks each offer tweaks to the rules, and set different trail lengths.",
  ],
};
