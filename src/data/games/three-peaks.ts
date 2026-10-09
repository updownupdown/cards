import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations/types";

export const threePeaks: GameDefinition = {
  path: "/three-peaks",
  title: "Three Peaks",
  source: {
    title: "TriPeaks",
    designer: "Robert Hogue",
    year: "1989",
    link: "https://boardgamegeek.com/boardgamedesigner/127574/robert-hogue",
  },
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
  background: GAME_BACKGROUNDS.smokyMountain,
  animation: GameAnimations.Clouds,
  gameColorDark: "#24343a",
  gameColorPale: "#e3fcdd",
  gameColorAccent: "#efae84",
  cardBack: CardBackColors.Ocean,
  quickStart: [
    "Play a peak card one rank above or below the waste card.",
    "Draw when stuck.",
  ],
  howToPlay: [
    "## Goal",
    "Clear the three peaks.",
    "## Rules",
    "| Playable | Uncovered peak cards |",
    "| Remove | Onto the waste, one rank above or below it |",
    "| Values | Ace and King meet |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
  ],
};
