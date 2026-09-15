import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const queensAudience: GameDefinition = {
  path: "/queens-audience",
  title: "Queen's Audience",
  tags: [GameTag.PairMatching, GameTag.EasyToLearn],
  rating: {
    complexity: 20,
    difficulty: 25,
    luck: 65,
  },
  thumbnail: "DefaultThumbnail.webp",
  background: GAME_BACKGROUNDS.greece,
  animation: GameAnimations.Stars,
  gameColorDark: "#24162b",
  gameColorMid: "#9c4f8e",
  gameColorPale: "#f7e0f1",
  cardDescription:
    "Usher royal couples into the audience chamber, and let each Jack lead its suit down.",
  quickStart: [
    "Tap a King or Queen when its partner is also available.",
    "Tap a Jack or Ace when its partner is available to start a foundation.",
    "Foundations build down by suit from the Jack to the Two.",
  ],
  howToPlay: [
    "## Objective",
    "Bring all 52 cards into the **audience chamber** in the middle.",

    "## Rules",
    "- Sixteen cards form the **antechamber**, a frame around the chamber. All of them are available, along with the top **waste** card.",
    "- When a **King and Queen** of the same suit are both available, tap either to bring them in together.",
    "- When a **Jack and Ace** of the same suit are both available, tap either to start that suit's foundation.",
    "- Each foundation then builds **down by suit** from the Jack to the Two.",
    "- A gap in the antechamber is filled at once from the waste, or from the stock if the waste is empty.",
    "- Tap the **stock** to turn one card onto the waste. There is no redeal.",
  ],
};
