import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const sultan: GameDefinition = {
  path: "/sultan",
  title: "Sultan",
  thumbnail: "Sultan.webp",
  thumbnailCredit: {
    title: "Sultan Mehmet II",
    artistName: "Gentile Bellini",
    date: "1480",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Bellini,_Gentile_-_Sultan_Mehmet_II.jpg",
  },
  aliases: ["Sultan of Turkey", "Emperor of Germany"],
  tags: [
    GameTag.DoubleDeckers,
    GameTag.SequenceBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 35, difficulty: 35, luck: 55 },
  background: GAME_BACKGROUNDS.alhambra,
  animation: GameAnimations.Clouds,
  gameColorDark: "#362d2a",
  gameColorPale: "#f0dfbd",
  cardBack: CardBackColors.Copper,
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

    "## Foundations",
    "- Seven foundations begin with Kings and continue with Ace, 2, and upward to Queen.",
    "- The Ace of Hearts foundation builds normally upward to Queen.",
    "- The central King of Hearts is the Sultan and never receives cards.",

    "## Reserve and Stock",
    "- Play cards from the waste or any of the eight reserve spaces.",
    "- The stock is turned one card at a time.",
    "- The waste may be redealt twice.",

    "## Replacing Reserve Cards",
    "- When a reserve card is played, its space is refilled automatically from the waste, or from the stock if the waste is empty.",
  ],
};
