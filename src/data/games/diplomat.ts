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
    "Move both decks to eight foundations, built by suit from A to K.",
    "Build tableau down by rank regardless of suit.",
    "Move one card at a time; any card fills a space.",
    "There is no stock redeal.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to eight foundations, Ace through King by suit.",
    "## Rules",
    "- Eight columns of four cards are dealt face up.",
    "- Build tableau down regardless of suit.",
    "- Move one card at a time and fill empty columns with any card.",
    "- Deal the stock one card at a time. There is no stock redeal.",
  ],
};
