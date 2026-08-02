import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const spiderSolitaire: GameDefinition = {
  path: "/spider-solitaire",
  title: "Spider Solitaire",
  tags: [GameTag.ClassicSolitaire, GameTag.TapAndDrag],
  rating: {
    complexity: 0,
    difficulty: 0,
    luck: 0,
  },
  thumbnail: "SpiderSolitaire.jpg",
  background: GAME_BACKGROUNDS.dungeon,
  animation: GameAnimations.Embers,
  gameColorDark: "#24161f",
  gameColorPale: "#ffc6ca",
  cardDescription:
    "Build same-suit runs from King to Ace across a tangled double deck.",
  quickStart: ["Build down by rank; move same-suit runs; deal when stuck."],
  howToPlay: [
    "## Objective",
    "Assemble **8 complete same-suit sequences**, each running from King down to Ace. Finished runs are removed from the table.",
    "## Setup",
    "- Two decks (104 cards) are dealt into **10 tableau columns**.",
    "- The first four columns get 6 cards and the rest get 5; only the top card of each is face up.",
    "- The remaining 50 cards form the **stock**.",
    "## Playing",
    "- Build columns **down in rank** regardless of suit (for example a {9C} on a {10H}).",
    "- You may move a group of cards only when they form a **same-suit descending run**.",
    "- Any card or valid run may be placed onto an empty column.",
    "- Flip a face-down card when it becomes exposed.",
    "- When a full **King-to-Ace** same-suit sequence forms, it is cleared automatically.",
    "## Stock",
    "Tap the stock to deal one card onto **every** column at once. You may only deal when no column is empty.",
    "## Winning",
    "You win once all eight suit runs are completed and removed.",
  ],
  about: [
    "Spider is a two-deck solitaire played across ten tangled columns.",
    "Assemble eight complete suit sequences from King down to Ace to win; fewer suits make for an easier game.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
    creationDate: "First documented in 1917",
  },
};
