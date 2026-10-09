import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const flowerGarden: GameDefinition = {
  path: "/flower-garden",
  title: "Flower Garden",
  aliases: ["The Bouquet", "The Garden"],
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: { complexity: 25, difficulty: 60, luck: 25 },
  thumbnail: "FlowerGarden.webp",
  thumbnailCredit: {
    title: "Flower Garden and Bungalow, Bermuda",
    artistName: "Winslow Homer",
    date: "1899",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/11121",
  },
  background: GAME_BACKGROUNDS.flowerGarden,
  animation: GameAnimations.Pollen,
  gameColorDark: "#24402f",
  gameColorPale: "#f2e4c2",
  gameColorAccent: "#f09ab8",
  cardBack: CardBackColors.Olive,
  quickStart: [
    "Build down on any suit.",
    "Every bouquet card is playable.",
    "Any card fills an empty bed.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, regardless of suit |",
    "| Move | One card at a time |",
    "| Empty bed | Any card |",
    "| Bouquet (16) | Every card is playable; nothing goes back |",
    "| Stock | None |",
    "| Cards | 52 |",
  ],
};
