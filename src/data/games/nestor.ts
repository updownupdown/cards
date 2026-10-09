import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const nestor: GameDefinition = {
  path: "/nestor",
  title: "Nestor",
  tags: [GameTag.PairMatching],
  rating: {
    complexity: 15,
    difficulty: 70,
    luck: 55,
  },
  thumbnail: "Nestor.webp",
  thumbnailCredit: {
    title: "The Triumph of Time over Fame",
    artistName: "South Netherlandish",
    date: "ca. 1500–1530",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/467828",
  },
  background: GAME_BACKGROUNDS.greece,
  animation: GameAnimations.Clouds,
  gameColorDark: "#112e49",
  gameColorPale: "#e7f7ff",
  gameColorAccent: "#ecc878",
  cardBack: CardBackColors.Ocean,
  quickStart: ["Remove two cards of the same rank."],
  howToPlay: [
    "## Goal",
    "Discard all 52 cards.",
    "## Rules",
    "| Playable | The bottom card of each column, and the reserve |",
    "| Remove | Two cards of the same rank |",
    "| Stock | None |",
  ],
};
