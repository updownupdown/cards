import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const thumbAndPouch: GameDefinition = {
  path: "/thumb-and-pouch",
  title: "Thumb and Pouch",
  tags: [
    GameTag.KlondikeFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 25, difficulty: 30, luck: 55 },
  background: GAME_BACKGROUNDS.cozyCabin,
  animation: GameAnimations.Dust,
  gameColorDark: "#3b3028",
  gameColorPale: "#ead9b8",
  cardBack: CardBackColors.Terracotta,
  thumbnail: "ThumbAndPouch.webp",
  thumbnailCredit: {
    title: "Pouch",
    artistName: "Unknown American beadworker",
    date: "1830–60",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/170340",
  },
  cardDescription:
    "A flexible Klondike where cards avoid their own suit and any card fills a gap.",
  quickStart: [
    "Build four foundations by suit, from A to K.",
    "Build down on any suit except the same suit; move correctly packed runs.",
    "Any card or run may fill an empty column.",
  ],
  howToPlay: [
    "## Objective",
    "Build four foundations from Ace to King by suit.",
    "## Rules",
    "- Seven tableau columns are dealt in a 1-to-7-card staircase.",
    "- Build down by rank, but never place a card on the same suit.",
    "- Move packed sequences together.",
    "- Any card or sequence may fill an empty column.",
  ],
};
