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
  gameColorAccent: "#e88790",
  cardBack: CardBackColors.Crimson,
  quickStart: [
    "Build down on any suit.",
    "Only same-suit runs move together.",
    "Any card or run fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Build four runs from King to Ace, each in one suit.",
    "## Rules",
    "| Foundations (4) | Complete King-to-Ace runs of one suit, cleared automatically |",
    "| Build | Down, regardless of suit |",
    "| Move | One card, or a same-suit run |",
    "| Empty column | Any card or run |",
    "| Stock | None |",
    "| Cards | 52 |",
  ],
};
