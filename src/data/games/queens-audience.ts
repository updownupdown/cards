import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const queensAudience: GameDefinition = {
  path: "/queens-audience",
  title: "Queen's Audience",
  tags: [GameTag.PairMatching],
  rating: {
    complexity: 20,
    difficulty: 25,
    luck: 65,
  },
  thumbnail: "QueensAudience.webp",
  background: GAME_BACKGROUNDS.oldRoom,
  animation: GameAnimations.Dust,
  gameColorDark: "#24162b",
  gameColorPale: "#f7e0f1",
  cardBack: CardBackColors.Plum,
  cardDescription:
    "Usher royal couples into the audience chamber, and let each Jack lead its suit down.",
  quickStart: [
    "Bring all 52 cards into the audience chamber.",
    "Tap a King or Queen when its partner is also available.",
    "Tap a Jack or Ace when its partner is available to start a foundation.",
  ],
  howToPlay: [
    "## Objective",
    "Bring all 52 cards into the **audience chamber** in the middle.",

    "## Rules",
    "- Every card in the **antechamber** is available, along with the top **waste** card.",
    "- When a **King and Queen** of the same suit are both available, tap either to bring them in together.",
    "- When a **Jack and Ace** of the same suit are both available, tap either to start that suit's foundation.",
    "- Each foundation then builds **down by suit** from the Jack to the Two.",
    "- A gap in the antechamber is filled automatically from the waste, or from the stock if the waste is empty.",
    "- Tap the **stock** to turn one card onto the waste. There is no redeal.",
  ],
};
