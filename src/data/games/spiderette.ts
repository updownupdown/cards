import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const spiderette: GameDefinition = {
  path: "/spiderette",
  title: "Spiderette",
  tags: [GameTag.SequenceBuilding],
  rating: { complexity: 35, difficulty: 60, luck: 40 },
  thumbnail: "Spiderette.webp",
  background: GAME_BACKGROUNDS.forestGrasses,
  animation: GameAnimations.Firefly,
  gameColorDark: "#202e27",
  gameColorMid: "#88335a",
  gameColorPale: "#dae6cf",
  cardDescription:
    "A compact single-deck Spider played across seven Klondike-shaped columns.",
  quickStart: [
    "Remove four complete suited runs from King to Ace.",
    "Build down by rank and move descending same-suit runs.",
    "Deal stock rows only when every column is occupied.",
  ],
  howToPlay: [
    "## Objective",
    "Remove four complete suited runs from King to Ace.",
    "## Rules",
    "- Build tableau down by rank, regardless of suit.",
    "- Only descending same-suit runs move together.",
    "- Any card or valid run may fill an empty column.",
    "- Stock deals one card to every column, but only when no column is empty.",
  ],
};
