import { GameAnimations } from "@/animations/types";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const fortunesCall: GameDefinition = {
  // The Fortune Teller? Unclear if there's an actual source game.
  path: "/fortunes-call",
  title: "Fortune's Call",
  thumbnail: "FortunesCall.jpg",
  tags: [GameTag.EasyToLearn, GameTag.ModernMechanics, GameTag.ScoringPuzzles],
  rating: { complexity: 20, difficulty: 45, luck: 70 },
  gameColorDark: "#272330",
  gameColorMid: "#883450",
  gameColorPale: "#b8f1c6",
  background: GAME_BACKGROUNDS.alaska,
  animation: GameAnimations.Snow,
  cardDescription:
    "Predict each hidden card's colour or direction before three misses.",
  quickStart: [
    "Colour calls score 1.",
    "Higher or lower calls score 2.",
    "Reach 12 points before missing three times.",
  ],
  howToPlay: [
    "## Objective",
    "Score twelve points before making three incorrect calls.",

    "## Predictions",
    "- Red or Black predicts the hidden card's colour and scores one point.",
    "- Higher or Lower compares its rank with the face-up anchor and scores two points.",
    "- Equal ranks do not satisfy either direction call.",
    "- After the reveal, the new card becomes the next anchor.",
  ],
};
