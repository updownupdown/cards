import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const crescent: GameDefinition = {
  path: "/crescent",
  title: "Crescent",
  aliases: ["La Demi-Lune"],
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: { complexity: 40, difficulty: 55, luck: 35 },
  thumbnail: "Crescent.webp",
  thumbnailCredit: {
    title: "Sunset and Moonrise",
    artistName: "Joseph Mallord William Turner",
    date: "c. 1832",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/29385",
  },
  background: GAME_BACKGROUNDS.nightSky,
  animation: GameAnimations.Stars,
  gameColorDark: "#182334",
  gameColorPale: "#e5dfca",
  gameColorAccent: "#e2cd8d",
  cardBack: CardBackColors.Navy,
  quickStart: [
    "Build up or down by suit; Ace and King meet.",
    "Move one card at a time.",
    "Restack up to three times when stuck.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Four Ace to King and four King to Ace, by suit |",
    "| Build | Up or down, same suit, wrapping between Ace and King |",
    "| Move | One card at a time |",
    "| Empty pile | Stays empty |",
    "| Stock | None |",
    "| Restacks | 3 |",
    "| Cards | 104 (two decks) |",
    "## Special rules",
    "- A **restack** moves every pile's bottom card to its top.",
    "- Cards above a foundation's first card can move between foundations.",
  ],
};
