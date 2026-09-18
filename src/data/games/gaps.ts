import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const gaps: GameDefinition = {
  path: "/gaps",
  title: "Gaps",
  aliases: ["Montana", "Addiction", "Addiction Solitaire"],
  tags: [GameTag.SpatialControl, GameTag.SequenceBuilding],
  rating: { complexity: 30, difficulty: 60, luck: 40 },
  thumbnail: "Gaps.webp",
  background: GAME_BACKGROUNDS.mountain1,
  gameColorDark: "#2c322f",
  gameColorMid: "#ada356",
  gameColorPale: "#e7ddc2",
  cardDescription: "Arrange the rows in order by suit by filling the gaps.",
  quickStart: [
    "Arrange the rows in order (2 to K).",
    "Cards can be moved to a gap when they are the same suit as, and one rank above, its left neighbor.",
    "Redeal when stuck (easy: 3 redeals, hard: 2).",
  ],
  howToPlay: [
    "## Objective",
    "Arrange four rows by suit from 2 through King, leaving the final column (on the right) empty.",

    "## Moving",
    "- The Aces are removed after the initial deal to create four gaps.",
    "- A left-edge gap accepts any 2.",
    "- Any other gap accepts only the same-suit successor of the card immediately to its left.",
    "- A gap after a King cannot be filled.",

    "## Redeal",
    "- When no more moves are possible, you may redeal the cards that are not part of a correct sequence.",
    "- Correct sequences beginning with a 2 stay in place. If no sequence exists for that suit, the left gap remains empty.",
    "- Difficulty setting: Easy allows 3 redeals; Hard allows 2 redeals.",
  ],
};
