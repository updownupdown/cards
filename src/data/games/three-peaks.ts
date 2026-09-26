import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations/types";

export const threePeaks: GameDefinition = {
  path: "/three-peaks",
  title: "Three Peaks",
  aliases: ["TriPeaks", "Tri Peaks"],
  tags: [
    GameTag.ClearTheBoard,
    GameTag.SequenceBuilding,
    GameTag.StockAndWaste,
  ],
  rating: {
    complexity: 15,
    difficulty: 40,
    luck: 55,
  },
  thumbnail: "ThreePeaks.webp",
  thumbnailCredit: {
    title: "South Wind, Clear Sky, from Thirty-Six Views of Mount Fuji",
    artistName: "Katsushika Hokusai",
    date: "early 1830s",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://clevelandart.org/art/1930.189",
  },
  background: GAME_BACKGROUNDS.smokyMountain,
  animation: GameAnimations.Clouds,
  gameColorDark: "#24343a",
  gameColorPale: "#e3fcdd",
  cardBack: CardBackColors.Ocean,
  cardDescription:
    "Clear the three peaks by playing cards one rank above or below the waste.",
  quickStart: ["Play exposed +/-1 to waste; A<->K wraps; draw when stuck."],
  howToPlay: [
    "## Objective",
    "Clear the three peaks by removing cards one rank above or below the waste.",

    "## Rules",
    "- An exposed peak card may be moved to the waste if it is **one rank higher or lower** than the current waste card.",
    "- Rank wraps around: Kings can be played on Aces, and vice versa.",
    "- When no legal move remains, turn a card from the stock to the waste.",
  ],
};
