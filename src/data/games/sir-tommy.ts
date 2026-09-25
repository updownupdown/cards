import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const sirTommy: GameDefinition = {
  path: "/sir-tommy",
  title: "Sir Tommy",
  tags: [GameTag.FoundationBuilders, GameTag.StockAndWaste],
  rating: {
    complexity: 30,
    difficulty: 60,
    luck: 55,
  },
  thumbnail: "SirTommy.webp",
  background: GAME_BACKGROUNDS.london,
  animation: GameAnimations.Rain,
  gameColorDark: "#1a2c33",
  gameColorPale: "#fdf7d9",
  cardBack: CardBackColors.Teal,
  cardDescription:
    "The granddaddy of solitaire: sort the deck across four piles into four Ace-to-King stacks.",
  quickStart: [
    "Build foundations up from A to K, regardless of suit.",
    "Cards in the waste piles cannot be moved.",
    "Single-tap to place stock card on waste pile.",
    "Double-tap an exposed stock or waste card to move it to a foundation.",
  ],
  howToPlay: [
    "## Objective",
    "Build four foundations, up from Ace to King, **regardless of suit**.",
    "**Suits can be ignored in this game.**",

    "## Rules",
    "- Each flipped card from the stock must be dropped onto one of the four waste piles.",
    "- You may **not** rearrange the waste piles.",
    "- Only the **top** card of each waste pile can be moved to foundations.",
    "- **Single-tap** a waste pile to place the stock card there.",
    "- **Double-tap** an exposed stock or waste card to move it to a valid foundation.",
  ],
};
