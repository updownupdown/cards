import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations/types";

export const threeSummits: GameDefinition = {
  path: "/three-summits",
  title: "Three Summits",
  aliases: ["TriPeaks", "Tri Peaks"],
  tags: [GameTag.EasyToLearn, GameTag.SequenceBuilding, GameTag.StockAndWaste],
  rating: {
    complexity: 15,
    difficulty: 40,
    luck: 70,
  },
  thumbnail: "ThreeSummits.jpg",
  background: GAME_BACKGROUNDS.yukon,
  animation: GameAnimations.Clouds,
  gameColorDark: "#24343a",
  gameColorPale: "#e3fcdd",
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
