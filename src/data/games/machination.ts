import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const machination: GameDefinition = {
  path: "/machination",
  title: "Machination",
  source: {
    title: "Strategy",
    designer: "Albert H. Morehead and Geoffrey Mott-Smith",
    year: "1949",
    link: "https://www.pagat.com/patience/strategy.html",
  },
  enabledOnLocalOnly: true,
  thumbnailCredit: {
    title: "The Elephant Clock, from al-Jazari's Book of the Knowledge of Ingenious Mechanical Devices",
    artistName: "Farrukh ibn `Abd al-Latif",
    date: "1315",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/451402",
  },
  tags: [GameTag.FoundationBuilders, GameTag.StockAndWaste],
  rating: {
    complexity: 25,
    difficulty: 70,
    luck: 35,
  },
  thumbnail: "Machination.webp",
  background: GAME_BACKGROUNDS.oldRoom,
  animation: GameAnimations.CandleMotes,
  gameColorDark: "#2b2420",
  gameColorPale: "#ead9c4",
  gameColorAccent: "#d4a373",
  cardBack: CardBackColors.Walnut,
  quickStart: [
    "Turn the stock one card at a time and place each on any pile.",
    "Aces go straight to the foundations.",
    "When the stock runs out, the piles are built onto the foundations by suit, top cards first.",
  ],
  howToPlay: [
    "## Objective",
    "Place every card so that, at the end, all four foundations can be built up by suit from Ace to King.",

    "## Placing",
    "- The stock is turned one card at a time. Tap a pile to place the turned card on it.",
    "- An **Ace** goes straight to a foundation as soon as it is turned.",
    "- Cards never move between piles, so plan where each card goes: a pile's top card must come off before the cards under it.",

    "## Building",
    "- When the stock is empty, every pile's top card that is the next rank of its suit moves to the foundation, one after another, until no more can.",
    "- You win when all 52 cards reach the foundations.",

    "## Tips",
    "- A lower card on a higher one is safe. A higher card on a lower one blocks it until the higher card comes off.",
    "- Never put a card on a lower card of its own suit: neither can ever come off.",
    "- Keep an empty pile for the high cards for as long as you can.",
    "- **Hard** mode, in the game's settings, plays with seven piles instead of eight.",
  ],
};
