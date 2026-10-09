import { GameAnimations } from "@/animations";
import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";

export const scorpion: GameDefinition = {
  path: "/scorpion",
  title: "Scorpion",
  tags: [GameTag.SpiderFamily, GameTag.SequenceBuilding],
  rating: {
    complexity: 40,
    difficulty: 75,
    luck: 40,
  },
  thumbnail: "Scorpion.webp",
  thumbnailCredit: {
    title: "Scorpion",
    artistName: "Pierre Roche",
    date: "1897",
    sourceName: "Artvee",
    sourceLink: "https://artvee.com/dl/scorpion-2/",
  },
  background: GAME_BACKGROUNDS.sahara,
  animation: GameAnimations.Sand,
  gameColorDark: "#352b21",
  gameColorPale: "#fff3e4",
  gameColorAccent: "#eb9c72",
  cardBack: CardBackColors.Terracotta,
  quickStart: [
    "Build down by suit.",
    "Move any face-up card with every card on it.",
    "Only a King fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Build four runs from King to Ace, each in one suit.",
    "## Rules",
    "| Foundations (4) | Complete King-to-Ace runs of one suit, cleared automatically |",
    "| Build | Down, same suit |",
    "| Move | Any face-up card, with every card on it |",
    "| Empty column | King only |",
    "| Stock | Deals its 3 cards onto the first three columns |",
    "| Cards | 52 |",
    "## Variants",
    "- **Wasp**: any card fills an empty column.",
  ],
};
