import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const spiderette: GameDefinition = {
  path: "/spiderette",
  title: "Spiderette",
  tags: [GameTag.SpiderFamily, GameTag.SequenceBuilding],
  rating: { complexity: 35, difficulty: 70, luck: 40 },
  thumbnail: "Spiderette.webp",
  thumbnailCredit: {
    title:
      "Twee tulpen met spin en vlieg in spinnenweb A. Secretarij Langschap",
    artistName: "Jacob Marrel",
    date: "1637",
    sourceName: "Artvee",
    sourceLink:
      "https://artvee.com/dl/twee-tulpen-met-spin-en-vlieg-in-spinnenweb-a-secretarij-langschap/",
  },
  background: GAME_BACKGROUNDS.forestGrasses,
  animation: GameAnimations.Spiders,
  gameColorDark: "#202e27",
  gameColorPale: "#dae6cf",
  gameColorAccent: "#d897ae",
  cardBack: CardBackColors.Rose,
  quickStart: [
    "Build down on any suit.",
    "Only same-suit runs move together.",
    "Deal when stuck, once every column has a card.",
  ],
  howToPlay: [
    "## Goal",
    "Build four runs from King to Ace, each in one suit.",
    "## Rules",
    "| Foundations (4) | Complete King-to-Ace runs of one suit, cleared automatically |",
    "| Build | Down, regardless of suit |",
    "| Move | One card, or a same-suit run |",
    "| Empty column | Any card or run |",
    "| Stock | Deals one card to every column, when none is empty |",
    "| Cards | 52 |",
  ],
};
