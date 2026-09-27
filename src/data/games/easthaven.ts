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
    title: "Harbor of Boston, with the City in the Distance",
    artistName: "Fitz Henry Lane",
    date: "ca. 1846–47",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://clevelandart.org/art/2004.35",
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
