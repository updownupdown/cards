import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const picketFence: GameDefinition = {
  path: "/picket-fence",
  title: "Picket Fence",
  enabledOnLocalOnly: true,
  tags: [
    GameTag.ModernMechanics,
    GameTag.ScoringPuzzles,
    GameTag.GridPlacement,
  ],
  rating: {
    complexity: 45,
    difficulty: 40,
    luck: 35,
  },
  thumbnail: "PicketFence.webp",
  thumbnailCredit: {
    title: "Homestead with Picket Fence and Flowers",
    artistName: "Unknown American photographer",
    date: "ca. 1857–65",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://clevelandart.org/art/2021.72",
  },
  background: GAME_BACKGROUNDS.oldPath,
  animation: GameAnimations.Pollen,
  gameColorDark: "#1e2a1c",
  gameColorPale: "#e8efd9",
  cardBack: CardBackColors.Olive,
  cardDescription:
    "Build three streets of rising house numbers, adding parks, pools and fences as you go.",
  quickStart: [
    "Each turn, build one card as a house and use another card's suit as its effect.",
    "House numbers must rise from left to right along each street.",
    "The game ends when none of your cards fits on a lot.",
  ],
  howToPlay: [
    "## Objective",
    "Score **60 points** or more by building houses, parks and pools, and fencing off estates.",

    "## Building",
    "- You hold three cards. Each turn, build one of them as a house on an empty lot.",
    "- House numbers must rise from left to right along a street (Aces are 1, Jacks 11, Queens 12 and Kings 13). Empty lots don't count.",
    "- Then use one of your other cards for its effect, and draw back up to three cards.",
    "- The game ends when none of your cards can be built, or when every lot is built.",

    "## Effects",
    "- **♥ Park:** the heart is tucked under the new house, as a park on its street.",
    "- **♦ Pool:** if the new house is on a pool lot, the diamond is tucked under it as a pool. Otherwise it is discarded.",
    "- **♠ Fence:** put up a fence between two lots, on any street.",
    "- **♣ Second house:** build the club as a house as well.",

    "## Scoring",
    "- **Parks:** 2 points each. The streets hold up to 3, 4 and 5 parks, and a full street of parks scores 10, 14 or 18 points instead.",
    "- **Pools:** 3, 6, 9, 13, 17, 21 and 26 points for 1 to 7 pools.",
    "- **Estates:** fences and street ends divide each street into estates. An estate with every lot built scores 1, 3, 5, 7, 9 or 11 points for 1 to 6 houses. Longer estates score nothing.",

    "## Ratings",
    "- 60+: Good Neighbours",
    "- 70+: Model Suburb",
    "- 80+: Picture Perfect",

    "## Tips",
    "- Leave room between numbers: a lot between a 5 and a 6 can never be built.",
    "- The label above each estate shows what it will score, or ✕ if it can no longer be completed.",
  ],
};
