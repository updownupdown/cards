import { GameDefinition, GameTag } from "../games-data";

export const baroness: GameDefinition = {
  path: "/baroness",
  tip: {
    default: "Discard K alone or pairs to 13 (A1 J11 Q12); deal if stuck.",
  },
  title: "Baroness",
  thumbnail: "Baroness.jpg",
  cardBack: "DefaultCardBack.png",
  background: "felt-dark-red.jpg",
  cardColorBg: "#3a1620",
  cardColorText: "#f3d6dd",
  cardDescription: "Clear five piles by discarding cards that total thirteen.",
  rating: {
    complexity: 15,
    difficulty: 50,
    luck: 70,
  },
  tags: [GameTag.ClassicSolitaire, GameTag.EasyToLearn],
  about: [
    "Baroness — also called Thirteens or Five Piles — is a brisk thirteen-matching game.",
    "The order you clear pairs decides whether later cards ever become reachable.",
  ],
  byLine:
    "Game designer unknown, first documented by Mary Whitmore Jones in 1890",
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
};
