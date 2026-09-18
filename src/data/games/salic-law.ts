import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const salicLaw: GameDefinition = {
  path: "/salic-law",
  title: "Salic Law",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: {
    complexity: 25,
    difficulty: 40,
    luck: 65,
  },
  thumbnail: "SalicLaw.webp",
  background: GAME_BACKGROUNDS.castle,
  animation: GameAnimations.Birds,
  gameColorDark: "#1f1c2b",
  gameColorMid: "#8a6d3b",
  gameColorPale: "#f5e7c4",
  cardDescription:
    "Deal two decks onto a line of Kings, bar the Queens, and raise every Ace to its Jack.",
  quickStart: [
    "Tap the stock to deal onto the newest King.",
    "Foundations build from Ace to Jack, regardless of suit.",
    "A King on its own accepts any single card.",
  ],
  howToPlay: [
    "## Objective",
    "Build all eight foundations from Ace to Jack, leaving only the Kings in the tableau.",

    "## Dealing",
    "- One **King** starts the tableau. Tap the **stock** to deal cards onto the newest King's pile, one at a time.",
    "- When a **King** is dealt, it starts a new pile.",
    "- **Aces** go straight to the foundations; **Queens** are set aside and take no part.",

    "## Rules",
    "- At any time, tap the top card of a pile to play it to a foundation, which builds **up regardless of suit** to the Jack.",
    "- Otherwise, tap it to pick it up, then tap a **King with no cards on it** to move the card there.",
    "- There is no other building in the tableau, and no redeal.",
  ],
};
