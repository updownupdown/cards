import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";
export const easthaven: GameDefinition = {
  path: "/easthaven",
  title: "Easthaven",
  tags: [
    GameTag.KlondikeFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 30, difficulty: 65, luck: 45 },
  thumbnail: "Easthaven.webp",
  thumbnailCredit: {
    title: "Harbour at Low Tide",
    artistName: "Bernard Essers",
    date: "1927",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://www.rijksmuseum.nl/en/collection/object/Haven-bij-eb--796a10bfb6b9d16e48fbcb7c754b1dde",
  },
  background: GAME_BACKGROUNDS.stonyBeach,
  animation: GameAnimations.Glints,
  gameColorDark: "#203638",
  gameColorPale: "#dcefed",
  gameColorAccent: "#e28db0",
  cardBack: CardBackColors.Teal,
  quickStart: [
    "Build down in alternating colors.",
    "Move ordered runs together.",
    "Only a King fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, alternating colors |",
    "| Move | One card, or an ordered run |",
    "| Empty column | King only |",
    "| Stock | Deals one card to every column |",
    "| Redeals | None |",
    "| Cards | 52 |",
  ],
};
