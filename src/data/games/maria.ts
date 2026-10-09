import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const maria: GameDefinition = {
  path: "/maria",
  title: "Maria",
  aliases: ["Thirty-Six Card Tableau"],
  tags: [
    GameTag.FortyThievesFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 25, difficulty: 65, luck: 45 },
  thumbnail: "Maria.webp",
  thumbnailCredit: {
    title: "Flower Painter Maria van Oosterwijck",
    artistName: "Wallerant Vaillant",
    date: "1671",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://www.rijksmuseum.nl/en/collection/object/Flower-Painter-Maria-van-Oosterwijck--ce0e1972dbe3091d2b1c85c968fa70e3",
  },
  background: GAME_BACKGROUNDS.painting,
  animation: GameAnimations.CherryBlossom,
  gameColorDark: "#3c2d36",
  gameColorPale: "#efd9dd",
  gameColorAccent: "#df90a2",
  cardBack: CardBackColors.Burgundy,
  quickStart: [
    "Build down in alternating colors.",
    "Move one card at a time.",
    "Any card fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Ace to King, by suit |",
    "| Build | Down, alternating colors |",
    "| Move | One card at a time |",
    "| Empty column | Any card |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "| Cards | 104 (two decks) |",
  ],
};
