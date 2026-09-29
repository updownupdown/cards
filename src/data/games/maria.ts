import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const maria: GameDefinition = {
  path: "/maria",
  title: "Maria",
  aliases: ["Thirty-Six Card Tableau"],
  tags: [
    GameTag.FortyThievesFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 25, difficulty: 65, luck: 45 },
  thumbnail: "Maria.webp",
  thumbnailCredit: {
    title: "Flower Painter Maria van Oosterwijck",
    artistName: "Wallerant Vaillant",
    date: "1671",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://www.rijksmuseum.nl/en/collection/object/Flower-Painter-Maria-van-Oosterwijck--ce0e1972dbe3091d2b1c85c968fa70e3",
  },
  background: GAME_BACKGROUNDS.painting,
  animation: GameAnimations.CherryBlossom,
  gameColorDark: "#3c2d36",
  gameColorPale: "#efd9dd",
  cardBack: CardBackColors.Burgundy,
  quickStart: [
    "Build eight foundations by suit, from A to K.",
    "Build tableau down by alternating color.",
    "Move one card at a time.",
    "Any card fills an empty column. There is no stock redeal.",
  ],
  howToPlay: [
    "## Objective",
    "Build eight foundations from Ace to King by suit.",
    "## Rules",
    "- Nine columns of four are dealt face up.",
    "- Build down by alternating color and move one card at a time.",
    "- Empty columns accept any card.",
    "- Deal the stock one card at a time. There is no stock redeal.",
  ],
};
