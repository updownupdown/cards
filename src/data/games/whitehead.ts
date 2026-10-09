import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const whitehead: GameDefinition = {
  path: "/whitehead",
  title: "Whitehead",
  tags: [
    GameTag.KlondikeFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 30, difficulty: 45, luck: 20 },
  background: GAME_BACKGROUNDS.bloomingTree,
  animation: GameAnimations.Pollen,
  gameColorDark: "#30383a",
  gameColorPale: "#edf0e6",
  gameColorAccent: "#90c6e0",
  cardBack: CardBackColors.Ocean,
  thumbnail: "Whitehead.webp",
  thumbnailCredit: {
    title: "White-Headed Eagle",
    artistName: "Robert Havell after John James Audubon",
    date: "1832",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Robert_Havell_after_John_James_Audubon,_White-Headed_Eagle,_1832,_NGA_32267.jpg",
  },
  quickStart: [
    "Build down in the same color.",
    "Only same-suit runs move together.",
    "Any card fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, same color |",
    "| Move | One card, or a same-suit run |",
    "| Empty column | Any card |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "| Cards | 52 |",
  ],
};
