import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const picketFence: GameDefinition = {
  path: "/picket-fence",
  title: "Picket Fence",
  source: {
    title: "Welcome To...",
    designer: "Benoit Turpin",
    year: "2018",
    link: "https://boardgamegeek.com/boardgame/233867/welcome-to",
  },
  tags: [
    GameTag.ModernMechanics,
    GameTag.ScoringPuzzles,
    GameTag.GridPlacement,
  ],
  rating: {
    complexity: 50,
    difficulty: 40,
    luck: 35,
  },
  thumbnail: "PicketFence.webp",
  thumbnailCredit: {
    title: "Houses at the Edge of a Village in the Dunes",
    artistName: "Salomon Leonardus Verveer",
    date: "1875",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://www.rijksmuseum.nl/en/collection/object/Houses-at-the-Edge-of-a-Village-in-the-Dunes--c15df578ad9247d7f28afa1b153d02c5",
  },
  background: GAME_BACKGROUNDS.oldPath,
  animation: GameAnimations.Pollen,
  gameColorDark: "#1e2a1c",
  gameColorPale: "#e8efd9",
  gameColorAccent: "#ccd897",
  cardBack: CardBackColors.Olive,
  quickStart: [
    "Each turn, build one card as a house and use another card's suit as its effect.",
    "House numbers must rise from left to right along each street.",
    "Fences split streets into estates: each one finished scores its houses, plus 2.",
  ],
  howToPlay: [
    "## Objective",
    "Score **70 points** or more by fencing your streets into estates and adding parks and pools. Play goes on until the deck is used up, so keep building your score.",

    "## Your Turn",
    "You hold three cards, and play two of them each turn: one for its number, then one for its suit. Then draw back up to three.",

    "## Building",
    "- Build a card as a house on an empty lot. House numbers must rise from left to right along a street (Aces are 1, Jacks 11, Queens 12 and Kings 13). Empty lots don't count.",
    "- Or **renovate**: build the card over an existing house, if the street's numbers still rise. The old house is discarded; its park or pool stays.",
    "- Or discard the card and build nothing this turn.",

    "## Effects",
    "- **♥ Park:** the heart is tucked under the house you just built or renovated, as a park.",
    "- **♦ Pool:** the diamond is tucked under that house as a pool, if it stands on a pool lot.",
    "- **♠ Fence:** put up a fence between two lots, on any street.",
    "- **♣ Second house:** build the club as a house as well, or renovate with it.",
    "- A house holds one park or pool, and a street holds parks or pools, never both: its first one decides. A card with no use is discarded.",

    "## Scoring",
    "- Fences and street ends divide each street into **estates**. A **finished** estate, with every lot built, scores 1 point per house, plus 2.",
    "- Each park scores 3 points, and each pool 4, finished or not.",

    "## Ratings",
    "- 70+: Good Neighbours",
    "- 78+: Model Suburb",
    "- 85+: Picture Perfect",

    "## Tips",
    "- Every fence makes one more estate, worth 2 more points once both sides are finished. A fence can also cut off a lot that can't be built.",
    "- Choose each street's kind: pools are worth more, but only fit on pool lots, while a park street can have a park under every house.",
    "- Leave room between numbers: a lot between a 5 and a 6 can't be built until one of them is renovated.",
    "- The label above each estate shows what it scores once finished, or ✕ if it can't be finished as it stands. The score bar shows your score if every estate is finished.",
  ],
};
