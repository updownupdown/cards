import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const spiderSolitaire: GameDefinition = {
  path: "/spider-solitaire",
  title: "Spider Solitaire",
  tags: [GameTag.SpiderFamily, GameTag.SequenceBuilding],
  rating: {
    complexity: 35,
    difficulty: 85,
    luck: 40,
  },
  thumbnail: "SpiderSolitaire.webp",
  thumbnailCredit: {
    title: "A Spider and Web with Blue Flowers",
    artistName: "Joseph Crawhall",
    sourceName: "Artvee",
    sourceLink: "https://artvee.com/dl/a-spider-and-web-with-blue-flowers/",
  },
  background: GAME_BACKGROUNDS.dungeon,
  animation: GameAnimations.Spiders,
  gameColorDark: "#25111e",
  gameColorPale: "#f6e6ff",
  gameColorAccent: "#e8b46a",
  cardBack: CardBackColors.Plum,
  quickStart: [
    "Build down on any suit.",
    "Only same-suit runs move together.",
    "Deal when stuck, once every column has a card.",
  ],
  howToPlay: [
    "## Goal",
    "Build eight runs from King to Ace, each in one suit.",
    "## Rules",
    "| Foundations (8) | Complete King-to-Ace runs of one suit, cleared automatically |",
    "| Build | Down, regardless of suit |",
    "| Move | One card, or a same-suit run |",
    "| Empty column | Any card or run |",
    "| Stock | Deals one card to every column, when none is empty |",
    "| Cards | 104 (two decks) |",
    "## Variants",
    "- **2 suits**: Spades and Hearts only.",
    "- **1 suit**: Spades only.",
  ],
};
