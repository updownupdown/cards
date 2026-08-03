import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations/types";

export const tripeaks: GameDefinition = {
  path: "/tripeaks",
  title: "TriPeaks",
  tags: [GameTag.EasyToLearn, GameTag.SequenceBuilding, GameTag.StockAndWaste],
  rating: {
    complexity: 15,
    difficulty: 40,
    luck: 70,
  },
  thumbnail: "TriPeaks.jpg",
  background: GAME_BACKGROUNDS.yukon,
  animation: GameAnimations.Clouds,
  gameColorDark: "#24343a",
  gameColorPale: "#e3fcdd",
  cardDescription:
    "Clear three peaks by playing cards one rank above or below the waste.",
  quickStart: ["Play exposed +/-1 to waste; A<->K wraps; draw when stuck."],
  howToPlay: [
    "## Objective",
    "Remove every card from the **three peaks** by building a continuous run on the waste pile.",
    "## Setup",
    "- 28 cards are dealt into three overlapping peaks; only the bottom row starts face up.",
    "- The remaining 24 cards form the **stock**, with one card turned to the **waste** to begin.",
    "## Playing",
    "- An exposed peak card may be moved to the waste if it is **one rank higher or lower** than the current waste card.",
    "- Rank wraps around: a King plays on an Ace and an Ace plays on a King (for example {2C}, then {AD}, then {KH}).",
    "- Removing a card that covered others flips the newly exposed cards face up.",
    "- When no legal move remains, turn a card from the stock to the waste.",
    "## Winning",
    "You win when all three peaks are cleared. If the stock is empty with no move available, the game is lost.",
  ],
  about: [
    "TriPeaks is a fast, chaining patience played over three overlapping peaks.",
    "Long unbroken runs feel great, and the whole board can sometimes fall in a single chain.",
  ],
  credits: {
    creators: [GameCreators.RobertHogue],
    creationDate: "1989",
  },
};
