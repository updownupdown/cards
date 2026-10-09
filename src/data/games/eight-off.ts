import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const eightOff: GameDefinition = {
  path: "/eight-off",
  title: "Eight Off",
  tags: [GameTag.FreeCellFamily, GameTag.SequenceBuilding],
  rating: {
    complexity: 25,
    difficulty: 30,
    luck: 10,
  },
  thumbnail: "EightOff.webp",
  thumbnailCredit: {
    title: "Composition VIII",
    artistName: "Wassily Kandinsky",
    date: "1923",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Wassily_Kandinsky_Composition_VIII.jpg",
  },
  background: GAME_BACKGROUNDS.cherryBlossoms,
  animation: GameAnimations.CherryBlossom,
  gameColorDark: "#0e2741",
  gameColorPale: "#d9ffff",
  gameColorAccent: "#e28da9",
  cardBack: CardBackColors.Ocean,
  quickStart: [
    "Build down by suit.",
    "Each free cell holds one card.",
    "Only a King fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, same suit |",
    "| Move | One card, or a run if free spaces allow |",
    "| Empty column | King only |",
    "| Stock | None |",
    "| Cards | 52 |",
  ],
};
