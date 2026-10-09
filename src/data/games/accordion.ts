import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const accordion: GameDefinition = {
  path: "/accordion",
  title: "Accordion",
  tags: [GameTag.ClearTheBoard, GameTag.PairMatching],
  rating: {
    complexity: 15,
    difficulty: 95,
    luck: 20,
  },
  thumbnail: "Accordion.webp",
  thumbnailCredit: {
    title: "Pierre Mac Orlan",
    artistName: "Jules Pascin",
    date: "1924",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Pierre_Mac_Orlan_MET_DT4183.jpg",
  },
  background: GAME_BACKGROUNDS.fallLeaves,
  animation: GameAnimations.Leaves,
  gameColorDark: "#351219",
  gameColorPale: "#fffccf",
  gameColorAccent: "#e2b08d",
  cardBack: CardBackColors.Terracotta,
  quickStart: [
    "Move a pile onto the pile 1 or 3 places to its left.",
    "Their top cards must match in suit or rank.",
  ],
  howToPlay: [
    "## Goal",
    "Collapse all 52 cards into a single pile.",
    "## Rules",
    "| Playable | The top card of each pile |",
    "| Move | Onto the pile 1 or 3 places to the left, matching suit or rank |",
    "| Stock | None; every card is dealt in a line |",
    "## Special rules",
    "- Piles shift left to close each gap.",
    "## Tips",
    '- **Use the "Sweeper" Technique**: Before playing, scan your layout for four cards of the same rank (e.g., four 8s) located near the end of the board. Protect them by never moving any other card on top of a sweeper. Your ultimate goal is to get down to exactly four piles, each topped with a sweeper. Since they have the same rank, you can then stack them on top of each other to win.',
  ],
};
