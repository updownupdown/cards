import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const apothecary: GameDefinition = {
  path: "/apothecary",
  title: "Apothecary",
  tags: [GameTag.Puzzles, GameTag.SpatialControl],
  lowerScoreIsBetter: true,
  rating: {
    complexity: 15,
    difficulty: 30,
    luck: 5,
  },
  thumbnail: "Apothecary.webp",
  background: GAME_BACKGROUNDS.headlessStatue,
  animation: GameAnimations.CandleMotes,
  gameColorDark: "#1d2a2a",
  gameColorPale: "#dcefe6",
  cardBack: CardBackColors.Teal,
  cardDescription: "Transfer cards between jars until all ranks are grouped.",
  quickStart: [
    "Fill every jar with four of a kind to seal it.",
    "Tap a jar, then tap where to pour its top cards.",
    "Cards pour onto the same rank, or into an empty jar or dish.",
  ],
  howToPlay: [
    "## Objective",
    "Sort the deck to group all cards of the same rank together.",

    "## Pouring",
    "- Tap a jar or dish to pick up its top card, together with any matching cards directly below it.",
    "- Tap another jar or dish to pour them there: you can pour onto a card of the **same rank**, or into an empty jar or dish.",
    "- **Jars** hold four cards. If only some of the cards fit, the rest stay behind.",
    "- The two **dishes** hold a single card each.",

    "## Sealing",
    "- A jar holding four cards of the same rank is sealed and turned face down.",
    "- You win when all 13 jars are sealed. Try to do it in as few pours as you can.",
    "- The game is lost if no card can be poured anywhere.",
  ],
};
