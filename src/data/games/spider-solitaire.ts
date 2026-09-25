import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const spiderSolitaire: GameDefinition = {
  path: "/spider-solitaire",
  title: "Spider Solitaire",
  tags: [GameTag.SpiderFamily, GameTag.SequenceBuilding],
  rating: {
    complexity: 50,
    difficulty: 85,
    luck: 40,
  },
  thumbnail: "SpiderSolitaire.webp",
  background: GAME_BACKGROUNDS.dungeon,
  animation: GameAnimations.Spiders,
  gameColorDark: "#25111e",
  gameColorPale: "#f6e6ff",
  cardBack: CardBackColors.Plum,
  cardDescription:
    "Build same-suit runs from King to Ace across a tangled double deck.",
  quickStart: ["Build down by rank; move same-suit runs; deal when stuck."],
  howToPlay: [
    "## Objective",
    "Assemble **8 complete same-suit sequences**, each running from King down to Ace. Finished runs are removed from the table.",

    "## Rules",
    "- Build columns **down in rank, regardless of suit**.",
    "- You may move a group of cards only when they form a **same-suit, descending run**.",
    "- Any card or valid run may be placed onto an empty column.",
    "- When a full **King-to-Ace** same-suit sequence forms, it is cleared automatically.",

    "## Stock",
    "Tap the stock to deal one card onto every column. You may only deal when no column is empty.",
  ],
};
