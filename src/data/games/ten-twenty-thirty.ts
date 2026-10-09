import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const tenTwentyThirty: GameDefinition = {
  path: "/ten-twenty-thirty",
  title: "Ten-Twenty-Thirty",
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
  gameColorAccent: "#d4e28d",
  cardBack: CardBackColors.Navy,
  quickStart: [
    "Remove neighbors that total 10, 20 or 30.",
    "Face cards count 10.",
  ],
  howToPlay: [
    "## Goal",
    "Discard all 52 cards.",
    "## Rules",
    "| Playable | Every card in the line |",
    "| Remove | Two or more neighbors that total 10, 20 or 30 |",
    "| Values | Jack, Queen and King count 10 |",
    "| Stock | Adds one card to the end of the line |",
    "| Redeals | None |",
    "## Special rules",
    "- Tap the first card of a run, then the last.",
  ],
};
