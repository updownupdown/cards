import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const maze: GameDefinition = {
  path: "/maze",
  title: "Maze",
  source: {
    title: "Maze",
    link: "https://en.wikipedia.org/wiki/Maze_(solitaire)",
  },
  enabledOnLocalOnly: true,
  tags: [GameTag.Puzzles, GameTag.SpatialControl, GameTag.SequenceBuilding],
  rating: { complexity: 30, difficulty: 60, luck: 30 },
  background: GAME_BACKGROUNDS.stoneTunnel,
  animation: GameAnimations.Dust,
  gameColorDark: "#2a2622",
  gameColorPale: "#ece0cc",
  gameColorAccent: "#d9b77a",
  cardBack: CardBackColors.Walnut,
  quickStart: [
    "Put the cards in order, suit by suit from Ace to Queen, along one long line that wraps from each row to the next.",
    "Tap a card, then tap a gap: the card must follow the card before the gap or lead into the card after it.",
    "An Ace may follow any Queen, and a Queen may come before any Ace.",
  ],
  howToPlay: [
    "## Objective",
    "Read the cells as one long line: left to right along each row, then on to the next row, and from the last cell back to the first. Arrange the 48 cards so that, in that order, they form four runs from Ace to Queen, each of one suit.",

    "## Setup",
    "- The deck is dealt into six rows of nine cells; the first two rows get eight cards, leaving their last cell empty.",
    "- The four Kings are then removed from the game, leaving six gaps.",

    "## Moving",
    "- Tap a card, then tap a gap to move it there. Tapping a gap on its own moves the one card that fits it, when there is only one.",
    "- A card may fill a gap when it is the **same suit and one rank higher** than the card just before the gap, or the **same suit and one rank lower** than the card just after it.",
    "- Any **Ace** may follow a **Queen**, and any **Queen** may come before an **Ace**.",
    "- A gap next to another gap gives no help on that side.",
    "- The game is lost when no card can move.",
  ],
};
