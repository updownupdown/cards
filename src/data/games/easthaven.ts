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
  cardBack: CardBackColors.Teal,
  cardDescription:
    "Build seven compact columns, then deal each new stock row straight onto the tableau.",
  quickStart: [
    "Build foundations up by suit.",
    "Build tableau down in alternating colors.",
    "Deal one stock card to every column; Ks fill spaces.",
  ],
  howToPlay: [
    "## Objective",
    "Build four foundations up by suit from Ace to King.",
    "## Rules",
    "- Build tableau **down in alternating colors**.",
    "- Correctly built runs move together.",
    "- Only Kings fill empty columns.",
    "- Each stock tap deals one card to every column.",
  ],
};
