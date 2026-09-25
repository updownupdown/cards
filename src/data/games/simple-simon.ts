import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const simpleSimon: GameDefinition = {
  path: "/simple-simon",
  title: "Simple Simon",
  tags: [GameTag.SpiderFamily, GameTag.SequenceBuilding],
  rating: { complexity: 35, difficulty: 55, luck: 25 },
  thumbnail: "SimpleSimon.webp",
  background: GAME_BACKGROUNDS.modernStairs,
  animation: GameAnimations.Dust,
  gameColorDark: "#312d29",
  gameColorPale: "#eadfca",
  cardBack: CardBackColors.Crimson,
  cardDescription:
    "All 52 cards begin exposed across ten columns in this thoughtful Spider relative.",
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
