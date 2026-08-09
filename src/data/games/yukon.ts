import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations/types";

export const yukon: GameDefinition = {
  path: "/yukon",
  title: "Yukon",
  tags: [GameTag.TableauBuilding],
  rating: {
    complexity: 35,
    difficulty: 55,
    luck: 35,
  },
  thumbnail: "Yukon.jpg",
  background: GAME_BACKGROUNDS.yukon,
  animation: GameAnimations.Clouds,
  gameColorDark: "#20303a",
  gameColorPale: "#e6f1f7",
  cardDescription:
    "Klondike unleashed: move whole groups of cards, in any order, across the tableau.",
  quickStart: [
    "Build the four foundations up by suit (A to K).",
    "Build columns down by alternating colors.",
    "Move any face-up stack.",
    "Only kings can fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Build the four foundations up by suit, from Ace to King.",

    "## Rules",
    "- Move any **face-up card** or **stack of cards** onto a card **one rank higher and of the opposite colour**.",
    "- The carried cards do **not** need to be in sequence.",
    "- Only Kings may be moved to an empty column.",
    "- Double-tap or drag single cards to the foundations, building up by suit.",
  ],
  about: [
    "Yukon takes Klondike's layout but lets you haul entire piles of mixed cards in a single move.",
    "With no stock and almost everything face up, wins reward untangling the columns in the right order.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
  },
};
