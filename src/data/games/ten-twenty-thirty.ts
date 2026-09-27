import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const tenTwentyThirty: GameDefinition = {
  path: "/ten-twenty-thirty",
  title: "Ten Twenty Thirty",
  aliases: ["Decade"],
  tags: [GameTag.PairMatching],
  rating: {
    complexity: 15,
    difficulty: 45,
    luck: 75,
  },
  thumbnail: "TenTwentyThirty.webp",
  thumbnailCredit: {
    title: "Daikoku with an Abacus",
    artistName: "Keisai Eisen",
    date: "1828",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/81282",
  },
  background: GAME_BACKGROUNDS.modernMetal2,
  animation: GameAnimations.Firefly,
  gameColorDark: "#132d35",
  gameColorPale: "#e1f5ff",
  cardBack: CardBackColors.Navy,
  cardDescription:
    "Deal a growing line and clear runs of cards that total 10, 20 or 30.",
  quickStart: [
    "Discard all 52 cards by removing adjacent runs totaling 10, 20 or 30.",
    "Tap the stock to add a card to the end of the line.",
    "Tap the first and last card of a run to remove it.",
  ],
  howToPlay: [
    "## Objective",
    "Discard all 52 cards.",

    "## Rules",
    "- Cards count their face value; Jacks, Queens and Kings count **10**.",
    "- Tap the **stock** to add the next card to the end of the line.",
    "- Any **two or more cards next to each other** in the line that total **10, 20 or 30** can be discarded.",
    "- Tap the first card of a run, then the last; the cards between close up.",
    "- The game is lost when the stock is empty and no run adds up.",
  ],
};
