import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const fortress: GameDefinition = {
  path: "/fortress",
  title: "Fortress",
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: { complexity: 30, difficulty: 70, luck: 25 },
  thumbnail: "Fortress.webp",
  thumbnailCredit: {
    title: "Landscape with Rock and Fortress",
    artistName: "Micco Spadaro",
    date: "ca. 1645",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/8097",
  },
  background: GAME_BACKGROUNDS.fortress,
  animation: GameAnimations.Clouds,
  gameColorDark: "#302a24",
  gameColorPale: "#ead9b8",
  gameColorAccent: "#d8b297",
  cardBack: CardBackColors.Walnut,
  quickStart: [
    "Build up or down by suit.",
    "Move one card at a time.",
    "Any card fills an empty lane.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Up or down, same suit |",
    "| Move | One card at a time |",
    "| Empty lane | Any card |",
    "| Stock | None |",
    "| Cards | 52 |",
  ],
};
