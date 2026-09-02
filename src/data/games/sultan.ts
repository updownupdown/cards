import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const sultan: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/sultan",
  title: "Sultan",
  aliases: ["Sultan of Turkey", "Emperor of Germany"],
  tags: [GameTag.StockAndWaste, GameTag.SequenceBuilding],
  rating: { complexity: 35, difficulty: 35, luck: 55 },
  background: GAME_BACKGROUNDS.painting,
  animation: GameAnimations.Dust,
  gameColorDark: "#362d2a",
  gameColorPale: "#f0dfbd",
  cardDescription:
    "Raise eight royal foundations until the central Sultan is surrounded by Queens.",
  quickStart: [
    "Build the eight outer foundations upward by suit to Queens.",
    "Play from the waste or any of eight reserve cards.",
    "Reserve cards refill from stock; the waste may be redealt twice.",
  ],
  howToPlay: [
    "## Objective",
    "Finish eight outer foundations with Queens surrounding the central King of Hearts.",
    "## Rules",
    "- Seven foundations begin with Kings and continue with Ace, 2, and upward to Queen.",
    "- The Ace of Hearts foundation builds normally upward to Queen.",
    "- The central King of Hearts is the Sultan and never receives cards.",
    "- Play cards from the waste or any of the eight reserve spaces.",
    "- A reserve card moved to a foundation is replaced from the stock when possible.",
    "- Turn the stock one card at a time; redeal the waste twice.",
  ],
};
