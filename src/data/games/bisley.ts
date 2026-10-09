import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const bisley: GameDefinition = {
  path: "/bisley",
  title: "Bisley",
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: { complexity: 30, difficulty: 60, luck: 20 },
  thumbnail: "Bisley.webp",
  thumbnailCredit: {
    title: "Tudor Style Rural Train Station and Railroad Crossing",
    artistName: "John Connell Ogle",
    date: "1844–77",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/390328",
  },
  background: GAME_BACKGROUNDS.london,
  animation: GameAnimations.Rain,
  gameColorDark: "#30343a",
  gameColorPale: "#e8e1d3",
  gameColorAccent: "#97b4d8",
  cardBack: CardBackColors.Slate,
  quickStart: [
    "Build up or down by suit.",
    "Move one card at a time.",
    "Empty columns stay empty.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Four Ace to King and four King to Ace, by suit; the Aces start there |",
    "| Build | Up or down, same suit |",
    "| Move | One card at a time |",
    "| Empty column | Stays empty |",
    "| Stock | None |",
    "| Cards | 52 |",
  ],
};
