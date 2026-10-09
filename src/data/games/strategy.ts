import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const strategy: GameDefinition = {
  path: "/strategy",
  title: "Strategy",
  source: {
    title: "Strategy",
    designer: "Albert H. Morehead and Geoffrey Mott-Smith",
    year: "1949",
    link: "https://www.pagat.com/patience/strategy.html",
  },
  enabledOnLocalOnly: true,
  tags: [GameTag.FoundationBuilders, GameTag.StockAndWaste],
  rating: {
    complexity: 25,
    difficulty: 45,
    luck: 15,
  },
  background: GAME_BACKGROUNDS.oldRoom,
  animation: GameAnimations.Dust,
  gameColorDark: "#2b2420",
  gameColorPale: "#ead9c4",
  gameColorAccent: "#d4a373",
  cardBack: CardBackColors.Walnut,
  quickStart: [
    "Turn the stock one card at a time and place each on any of the eight piles.",
    "Aces go straight to the foundations.",
    "Once the stock is empty, build each foundation up by suit from Ace to King.",
  ],
  howToPlay: [
    "## Objective",
    "Build all four foundations up by suit from Ace to King.",

    "## Placing",
    "- The stock is turned one card at a time. Tap any of the eight piles to place the turned card on it.",
    "- An **Ace** goes straight to a foundation as soon as it is turned.",
    "- Cards cannot be moved between piles, so plan where each card goes: a pile's top card must come off before the cards under it.",

    "## Building",
    "- Once the stock is empty, tap a pile's top card to move it to its suit's foundation when it is the next rank up.",
    "- You win when all 52 cards are on the foundations. The game is lost if no pile's top card can be played.",
  ],
};
