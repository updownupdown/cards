import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const rankAndFile: GameDefinition = {
  path: "/rank-and-file",
  title: "Rank and File",
  aliases: ["Dress Parade", "Number Ten"],
  tags: [
    GameTag.FortyThievesFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 30, difficulty: 55, luck: 40 },
  thumbnail: "RankAndFile.webp",
  thumbnailCredit: {
    title:
      "The Triumph of Julius Caesar: Soldiers Marching with Trophies of War",
    artistName: "Andrea Andreani",
    date: "1593–99",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1930.583.4",
  },
  background: GAME_BACKGROUNDS.city,
  animation: GameAnimations.Clouds,
  gameColorDark: "#26343b",
  gameColorPale: "#dfe2d4",
  cardBack: CardBackColors.Forest,
  quickStart: [
    "Move both decks to eight foundations, built by suit from A to K.",
    "Only each column's exposed card begins face up.",
    "Build down by alternating color.",
    "Move complete or partial ordered sequences.",
    "There is no stock redeal.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to eight suit foundations, building up by suit, from Ace to King.",
    "## Rules",
    "- Ten columns of four are dealt with only their top cards exposed.",
    "- Build down by alternating color.",
    "- Move any complete or partial correctly packed sequence.",
    "- Any card or sequence may fill an empty column.",
    "- Deal the stock one card at a time. There is no stock redeal.",
    "## Number Ten",
    "Number Ten is the same game with two face-down and two face-up cards in each column.",
  ],
};
