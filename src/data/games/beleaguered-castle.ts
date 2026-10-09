import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const beleagueredCastle: GameDefinition = {
  path: "/beleaguered-castle",
  title: "Beleaguered Castle",
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: {
    complexity: 25,
    difficulty: 60,
    luck: 20,
  },
  thumbnail: "BeleagueredCastle.webp",
  thumbnailCredit: {
    title:
      'Prise de la Ville de Bone (Capture of the City of Bonne), from "La Vie de Ferdinand Ier de Médicis série appelée aussi Les Batailles des Médicis" (The Life of Ferdinand I de\'Medici also called The Medici Battles)',
    artistName: "Jacques Callot",
    date: "1614–20",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/415848",
  },
  background: GAME_BACKGROUNDS.castle,
  animation: GameAnimations.Clouds,
  gameColorDark: "#2e2620",
  gameColorPale: "#f0e2c4",
  gameColorAccent: "#97b4d8",
  cardBack: CardBackColors.Slate,
  quickStart: [
    "Build down on any suit.",
    "Move one card at a time.",
    "Any card fills an empty row.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit; the Aces start there |",
    "| Build | Down, regardless of suit |",
    "| Move | One card at a time |",
    "| Empty row | Any card |",
    "| Stock | None |",
    "| Cards | 52 |",
  ],
};
