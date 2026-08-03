import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const baroness: GameDefinition = {
  path: "/baroness",
  title: "Baroness",
  tags: [GameTag.EasyToLearn, GameTag.PairMatching],
  rating: {
    complexity: 15,
    difficulty: 50,
    luck: 70,
  },
  thumbnail: "Baroness.jpg",
  background: GAME_BACKGROUNDS.oldRoom,
  animation: GameAnimations.Dust,
  cardBack: "DefaultCardBack.png",
  gameColorDark: "#3a1620",
  gameColorPale: "#f3d6dd",
  cardDescription: "Clear five piles by discarding cards that total thirteen.",
  quickStart: ["Discard K alone or pairs to 13 (A1 J11 Q12); deal if stuck."],
  howToPlay: [
    "## Objective",
    "Discard all 52 cards.",
    "## Setup",
    "- Deal **five piles** of one card each; the rest form the **stock**.",
    "## Card values",
    "- Aces count **1**, Jacks **11**, Queens **12**, Kings **13**; other cards are face value.",
    "## Playing",
    "- Only the **top** card of each pile is available.",
    "- Discard any **King** by itself.",
    "- Discard **two** available cards whose values total **13** (for example {5H} + {8S}, or {A}s + {Q}).",
    "- When no move remains, tap the **stock** to deal one card onto each pile.",
    "## Winning",
    "Clear every card to win. If the stock is empty and no move is left, the game ends.",
  ],
  about: [
    "Baroness — also called Thirteens or Five Piles — is a brisk thirteen-matching game.",
    "The order you clear pairs decides whether later cards ever become reachable.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
    creationDate: "First documented by Mary Whitmore Jones in 1890",
  },
};
