import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

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
    complexity: 10,
    difficulty: 40,
    luck: 55,
  },
  thumbnail: "ThreePeaks.webp",
  thumbnailCredit: {
    title: "The Rocky Mountains, Lander's Peak",
    artistName: "Albert Bierstadt",
    date: "1863",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/10154",
  },
  gameColorDark: "#24343a",
  gameColorPale: "#e3fcdd",
  cardBack: CardBackColors.Ocean,
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
