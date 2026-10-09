import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const indian: GameDefinition = {
  path: "/indian",
  title: "Indian",
  tags: [
    GameTag.FortyThievesFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 25, difficulty: 55, luck: 45 },
  thumbnail: "Indian.webp",
  thumbnailCredit: {
    title: "Map of the Island of Diu on the Coromandel Coast, India",
    artistName: "anonymous",
    date: "1675 - 1725",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://www.rijksmuseum.nl/en/collection/object/Plattegrond-van-het-eiland-Dieuw-of-Diewij-aan-de-Koromandelkust-India--7366dbd9ee1fd29bf54df254859db4ff",
  },
  background: GAME_BACKGROUNDS.indianLandscape,
  animation: GameAnimations.Mist,
  gameColorDark: "#49362a",
  gameColorPale: "#ead6ad",
  gameColorAccent: "#add897",
  cardBack: CardBackColors.Moss,
  quickStart: [
    "Build down on any suit but the card's own.",
    "Move one card at a time.",
    "Any card fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Ace to King, by suit |",
    "| Build | Down, any other suit |",
    "| Move | One card at a time |",
    "| Empty column | Any card |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "| Cards | 104 (two decks) |",
  ],
};
