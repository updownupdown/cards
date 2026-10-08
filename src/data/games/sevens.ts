import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const sevens: GameDefinition = {
  path: "/sevens",
  title: "Sevens",
  aliases: ["Fan Tan", "Parliament", "Dominoes"],
  thumbnailCredit: {
    title: "The Domino Girl",
    artistName: "American 18th Century",
    date: "c. 1790",
    sourceName: "National Gallery of Art",
    sourceLink: "https://www.nga.gov/artworks/59935-domino-girl",
  },
  tags: [GameTag.TricksAndMelds, GameTag.SequenceBuilding],
  rating: {
    complexity: 20,
    difficulty: 40,
    luck: 45,
  },
  thumbnail: "Sevens.webp",
  background: GAME_BACKGROUNDS.cozyRoom2,
  animation: GameAnimations.Dust,
  gameColorDark: "#3b2a1e",
  gameColorPale: "#f3e2cc",
  gameColorAccent: "#e8a86b",
  cardBack: CardBackColors.Walnut,
  quickStart: [
    "Each suit's row grows out from its 7, one rank at a time, up to the King and down to the Ace.",
    "Play a card that fits, or draw from the stock if none does.",
    "Empty your hand before the rival does.",
  ],
  howToPlay: [
    "## Objective",
    "Be the first to play every card in your hand.",

    "## Playing",
    "- You and the rival hold seven cards each, and one 7 is laid out from the stock to start. A 7 starts its suit's row; after that, a card can be played next to either end of its row: the 8 after the 7, the 6 before it, and so on.",
    "- If you can play a card, you must. If you can't, tap the stock to draw one, and the turn passes. With the stock empty, a stuck hand passes.",
    "- The cards you can't play are greyed out.",

    "## Your Rival",
    "The rival's cards are face up, and it always plays the same way: a 7 when it holds one; otherwise, the card followed by the most of its own cards in that direction, and, of equals, its lowest card, ♣ first.",

    "## Strategy",
    "Holding back a card the rival is waiting for keeps its hand stuck, as long as you have something else to play. Your score is the number of cards left in the rival's hand.",
  ],
};
