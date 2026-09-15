import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const baroness: GameDefinition = {
  path: "/baroness",
  title: "Baroness",
  tags: [GameTag.PairMatching, GameTag.EasyToLearn],
  rating: {
    complexity: 15,
    difficulty: 50,
    luck: 55,
  },
  thumbnail: "Baroness.webp",
  background: GAME_BACKGROUNDS.oldRoom,
  animation: GameAnimations.Dust,
  gameColorDark: "#3a1620",
  gameColorMid: "#a83e5a",
  gameColorPale: "#f3d6dd",
  cardDescription:
    "Clear five piles by discarding cards that add up to thirteen.",
  quickStart: [
    "Discard lone Kings, or pairs that add to 13.",
    "Aces = 1. Deal when stuck.",
  ],
  howToPlay: [
    "## Objective",
    "- **Win** by discarding all 52 cards.",
    "- **Lose** when the stock is empty and no move remains.",

    "## Discarding",
    "- Discard any **King** by itself, or two available cards whose values total **13** (for example {5H} + {8S}, or {AS} + {QC}).",
    "- Only the **top** card of each pile is available.",
    "- When no move remains, **tap the stock** deck to deal one card onto each pile.",
    "- Aces are worth 1.",
  ],
};
