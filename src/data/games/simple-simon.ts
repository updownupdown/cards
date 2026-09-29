import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const simpleSimon: GameDefinition = {
  path: "/simple-simon",
  title: "Simple Simon",
  tags: [GameTag.SpiderFamily, GameTag.SequenceBuilding],
  rating: { complexity: 30, difficulty: 50, luck: 15 },
  thumbnail: "SimpleSimon.webp",
  thumbnailCredit: {
    title: "Simple Simon, from The Boyd Smith Mother Goose",
    artistName: "E. Boyd Smith",
    date: "1920",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:The_Boyd_Smith_Mother_Goose_(1920)_(14590961767).jpg",
  },
  background: GAME_BACKGROUNDS.modernStairs,
  animation: GameAnimations.Dust,
  gameColorDark: "#312d29",
  gameColorPale: "#eadfca",
  cardBack: CardBackColors.Crimson,
  quickStart: [
    "Build down by rank.",
    "Move descending same-suit runs.",
    "Complete suited King-to-Ace runs.",
  ],
  howToPlay: [
    "## Objective",
    "Remove four complete suited runs from King to Ace.",
    "## Rules",
    "- Build tableau down by rank, regardless of suit.",
    "- Only descending same-suit runs move together.",
    "- Any card or valid run may fill an empty column.",
    "- A complete suited King-to-Ace run leaves the tableau automatically.",
  ],
};
