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
    title: "Virgin and Child",
    artistName: "Anna Maria Carew",
    date: "ca. 1662",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://clevelandart.org/art/2008.148",
  },
  background: GAME_BACKGROUNDS.painting,
  animation: GameAnimations.CherryBlossom,
  gameColorDark: "#3c2d36",
  gameColorPale: "#efd9dd",
  cardBack: CardBackColors.Burgundy,
  cardDescription:
    "A nine-column Forty Thieves relative packed by alternating color.",
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
