import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const diplomat: GameDefinition = {
  path: "/diplomat",
  title: "Diplomat",
  tags: [
    GameTag.FortyThievesFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 25, difficulty: 50, luck: 40 },
  thumbnail: "Diplomat.webp",
  thumbnailCredit: {
    title: "The Ambassadors",
    artistName: "Hans Holbein the Younger",
    date: "1533",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Holbein_Ambassadors.jpg",
  },
  background: GAME_BACKGROUNDS.oldCityAlley,
  animation: GameAnimations.Rain,
  gameColorDark: "#25343a",
  gameColorPale: "#dfe0d5",
  gameColorAccent: "#e8b870",
  cardBack: CardBackColors.Ocean,
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
