import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";
export const congress: GameDefinition = {
  path: "/congress",
  title: "Congress",
  tags: [
    GameTag.FortyThievesFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 25, difficulty: 65, luck: 45 },
  thumbnail: "Congress.webp",
  thumbnailCredit: {
    title: "The Assembly of Tejaprabha Buddha",
    artistName: "Unknown Korean artist",
    date: "1878",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1998.120",
  },
  background: GAME_BACKGROUNDS.city3,
  animation: GameAnimations.Mist,
  gameColorDark: "#292f38",
  gameColorPale: "#e9dfca",
  gameColorAccent: "#ddc692",
  cardBack: CardBackColors.Bronze,
  quickStart: [
    "Build down on any suit.",
    "Move one card at a time.",
    "Any card fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Ace to King, by suit |",
    "| Build | Down, regardless of suit |",
    "| Move | One card at a time |",
    "| Empty column | Any card |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "| Cards | 104 (two decks) |",
  ],
};
