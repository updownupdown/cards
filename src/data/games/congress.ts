import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";
export const congress: GameDefinition = {
  path: "/congress",
  title: "Congress",
  tags: [
    GameTag.FortyThievesFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 25, difficulty: 65, luck: 45 },
  thumbnail: "Congress.webp",
  thumbnailCredit: {
    title: "The Assembly of Tejaprabha Buddha",
    artistName: "Unknown Korean artist",
    date: "1878",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1998.120",
  },
  background: GAME_BACKGROUNDS.city3,
  animation: GameAnimations.Mist,
  gameColorDark: "#292f38",
  gameColorPale: "#e9dfca",
  gameColorAccent: "#ddc692",
  cardBack: CardBackColors.Bronze,
  quickStart: [
    "Build eight foundations up by suit.",
    "Build tableau down regardless of suit.",
    "Move one card at a time; any card fills a space.",
  ],
  howToPlay: [
    "## Objective",
    "Build eight foundations up by suit from Ace to King.",
    "## Rules",
    "- Eight columns start with one card each.",
    "- Build tableau down by rank, regardless of suit.",
    "- Move one exposed card at a time.",
    "- Any card may fill an empty column.",
    "- Turn the stock one card at a time with no redeal.",
  ],
};
