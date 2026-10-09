import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const fortyThieves: GameDefinition = {
  path: "/forty-thieves",
  title: "Forty Thieves",
  aliases: ["Napoleon at St Helena", "Josephine", "Lucas", "Busy Aces"],
  tags: [GameTag.FortyThievesFamily, GameTag.StockAndWaste],
  rating: {
    complexity: 35,
    difficulty: 85,
    luck: 45,
  },
  thumbnail: "FortyThieves.webp",
  thumbnailCredit: {
    title: "Second Scene of Thieves",
    artistName: "Gror",
    date: "ca. 1805",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/394910",
  },
  background: GAME_BACKGROUNDS.abandonedSand,
  animation: GameAnimations.Birds,
  gameColorDark: "#2E2D34",
  gameColorPale: "#EFE8FF",
  gameColorAccent: "#e7c078",
  cardBack: CardBackColors.Violet,
  quickStart: [
    "Build down by suit.",
    "Move one card at a time.",
    "Any card fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Ace to King, by suit |",
    "| Build | Down, same suit |",
    "| Move | One card at a time |",
    "| Empty column | Any card |",
    "| Stock | Draw 1 |",
    "| Redeals | None, or unlimited in the settings |",
    "| Cards | 104 (two decks) |",
    "## Variants",
    "- **Josephine**: same-suit runs move together.",
    "- **Lucas**: thirteen columns of three, with the Aces starting on the foundations.",
    "- **Busy Aces**: twelve columns of two.",
  ],
};
