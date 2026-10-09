import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const westcliff: GameDefinition = {
  path: "/westcliff",
  title: "Westcliff",
  tags: [
    GameTag.KlondikeFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 25, difficulty: 55, luck: 50 },
  background: GAME_BACKGROUNDS.cliffFields,
  animation: GameAnimations.Pollen,
  gameColorDark: "#27363b",
  gameColorPale: "#e4ece9",
  gameColorAccent: "#e2d78d",
  cardBack: CardBackColors.Pine,
  thumbnail: "Westcliff.webp",
  thumbnailCredit: {
    title: "Bald Head Cliff, York, Maine",
    artistName: "Emil Carlsen",
    date: "circa 1923",
    sourceName: "Artvee",
    sourceLink: "https://artvee.com/dl/bald-head-cliff-york-maine/",
  },
  quickStart: [
    "Build down in alternating colors.",
    "Move ordered runs together.",
    "Any card fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, alternating colors |",
    "| Move | One card, or an ordered run |",
    "| Empty column | Any card or run |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "| Cards | 52 |",
  ],
};
