import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const shamrocks: GameDefinition = {
  path: "/shamrocks",
  title: "Shamrocks",
  tags: [GameTag.SequenceBuilding],
  rating: { complexity: 25, difficulty: 85, luck: 60 },
  thumbnail: "Shamrocks.jpg",
  background: GAME_BACKGROUNDS.field,
  animation: GameAnimations.Leaves,
  gameColorDark: "#183b2a",
  gameColorMid: "#45963f",
  gameColorPale: "#dff3cc",
  cardDescription:
    "Build eighteen tiny fans without ever letting one grow beyond three cards.",
  quickStart: [
    "Build foundations up by suit from Ace to King.",
    "Build fans one rank up or down, regardless of suit.",
    "Fans hold at most three cards; empty fans stay empty.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to four foundations, building up by suit from Ace to King.",
    "## Fans",
    "- Only the exposed bottom card of each fan is playable.",
    "- Build one rank up or down, regardless of suit.",
    "- No fan may contain more than three cards.",
    "- Empty fans cannot be filled, and there are no redeals.",
  ],
};
