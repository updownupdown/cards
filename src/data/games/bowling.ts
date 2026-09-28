import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";

export const bowling: GameDefinition = {
  path: "/bowling",
  title: "Bowling",
  tags: [GameTag.Sports, GameTag.ScoringPuzzles],
  rating: {
    complexity: 45,
    difficulty: 40,
    luck: 40,
  },
  thumbnail: "Bowling.webp",
  thumbnailCredit: {
    title: "A Game of Bowls",
    artistName: "Unknown artist",
    date: "between 1610 and 1690",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:David_Teniers_II_(1610-1690)_(style_of)_-_A_Game_of_Bowls_-_959522_-_National_Trust.jpg",
  },
  background: GAME_BACKGROUNDS.bowling,
  gameColorDark: "#331e0f",
  gameColorPale: "#a9e9f1",
  cardBack: CardBackColors.Forest,
  quickStart: [
    "Pick a ball card, and 1 to 3 adjacent pins cards.",
    "The ball can be thrown if the last digits match.",
    "End the ball if no valid match is found.",
  ],
  howToPlay: [
    "## Objective",
    "Maximize your score across ten frames. You **win** with a final score of **120** or more; otherwise it's a loss.",

    "## Throwing Balls",
    "- Choose a face-up ball card and knock down **1, 2, or 3 adjacent pins** whose values **sum to a number ending in the ball card's digit**:",
    "-- 2 + 7 + 5 = 14, which matches a 4 ball",
    "-- A + 4 = 5, which matches a 5 ball",
    "-- 10 + 10 = 20, which matches a 10 ball.",
    "- When no valid play remains, select 'End Ball'.",

    "## Restrictions",
    "- On the **first throw of a frame**, you may not remove a back-row pin, and the center pin cannot be taken by itself.",
    "- After the opening, every hit must include **at least one pin adjacent to a gap** left by an earlier hit.",

    "## Scoring",
    "Scoring is similar to bowling: a frame allows up to two balls, and ends early for strikes. In frame 10, a strike or spare earns 2 or 1 bonus ball(s).",
    "- **Strike**: 10 plus the next two balls",
    "- **Spare** (all pins in two balls): 10 plus the next ball",
    "- **Open frame**: the number of pins knocked down",
  ],
};
