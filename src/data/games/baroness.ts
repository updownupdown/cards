import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const baroness: GameDefinition = {
  path: "/baroness",
  title: "Baroness",
  tags: [GameTag.PairMatching],
  rating: {
    complexity: 15,
    difficulty: 50,
    luck: 55,
  },
  thumbnail: "Baroness.webp",
  thumbnailCredit: {
    title: "Portrait of the Baroness of Bernus",
    artistName: "Philipp Veit",
    date: "1838",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Portrait_of_the_Baroness_of_Bernus_(SM_1798).png",
  },
  background: GAME_BACKGROUNDS.cozyRoom2,
  animation: GameAnimations.Dust,
  gameColorDark: "#3a1620",
  gameColorPale: "#f3d6dd",
  cardBack: CardBackColors.Rose,
  cardDescription:
    "Clear five piles by discarding cards that add up to thirteen.",
  quickStart: [
    "Discard lone Ks, or pairs that add to 13.",
    "As = 1. Deal when stuck.",
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
