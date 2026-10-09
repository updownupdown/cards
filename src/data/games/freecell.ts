import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const freeCell: GameDefinition = {
  path: "/freecell",
  title: "FreeCell",
  source: {
    title: "FreeCell",
    designer: "Paul Alfille",
    year: "1978",
  },
  aliases: ["Baker's Game"],
  tags: [GameTag.FreeCellFamily, GameTag.SequenceBuilding],
  rating: {
    complexity: 25,
    difficulty: 30,
    luck: 5,
  },
  thumbnail: "FreeCell.webp",
  thumbnailCredit: {
    title:
      "The room of Cornelis de Witt in prison The Gevangenpoort, The Hague, 1844",
    artistName: "Jacobus Ludovicus Cornet",
    date: "1844",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://www.rijksmuseum.nl/en/collection/object/The-room-of-Cornelis-de-Witt-in-prison-The-Gevangenpoort-The-Hague-1844--2ee2ca395f6f78ff00f09456efbd73a5",
  },
  background: GAME_BACKGROUNDS.cabinInterior,
  animation: GameAnimations.Dust,
  gameColorDark: "#2b231b",
  gameColorPale: "#fff1dd",
  gameColorAccent: "#e3c07a",
  cardBack: CardBackColors.Bronze,
  quickStart: [
    "Build down in alternating colors.",
    "Each free cell holds one card.",
    "Any card fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, alternating colors |",
    "| Move | One card, or a run if free spaces allow |",
    "| Empty column | Any card |",
    "| Stock | None |",
    "| Cards | 52 |",
    "## Variants",
    "- **Baker's Game**: build down in the same suit.",
  ],
};
