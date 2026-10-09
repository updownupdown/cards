import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const acesUp: GameDefinition = {
  path: "/aces-up",
  title: "Aces Up",
  tags: [GameTag.ClearTheBoard, GameTag.TableauBuilding],
  rating: {
    complexity: 15,
    difficulty: 75,
    luck: 70,
  },
  thumbnail: "AcesUp.webp",
  thumbnailCredit: {
    title: "Playing Card: Ace of Spades",
    artistName: "Unknown artist",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/82930",
  },
  background: GAME_BACKGROUNDS.castleIndoors,
  animation: GameAnimations.Dust,
  gameColorDark: "#1d0f0a",
  gameColorPale: "#eee0ca",
  gameColorAccent: "#e8b86a",
  cardBack: CardBackColors.Terracotta,
  quickStart: [
    "Discard every card but the four Aces.",
    "Discard a card when a higher one of its suit is on top.",
    "Any top card fills an empty pile.",
  ],
  howToPlay: [
    "## Goal",
    "Discard every card but the four Aces.",
    "## Rules",
    "| Playable | The top card of each pile |",
    "| Remove | A card, when a higher card of its suit is also on top |",
    "| Values | Aces high |",
    "| Empty pile | Any top card |",
    "| Stock | Deals one card to every pile |",
    "| Redeals | None |",
  ],
};
