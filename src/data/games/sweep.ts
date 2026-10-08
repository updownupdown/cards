import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const sweep: GameDefinition = {
  path: "/sweep",
  title: "Sweep",
  aliases: ["Scopa", "Cassino"],
  thumbnailCredit: {
    title: "The Card Players",
    artistName: "Paul Cézanne",
    date: "1890–92",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/435868",
  },
  enabledOnLocalOnly: true,
  tags: [GameTag.TricksAndMelds, GameTag.ScoringPuzzles],
  rating: {
    complexity: 35,
    difficulty: 45,
    luck: 50,
  },
  thumbnail: "Sweep.webp",
  background: GAME_BACKGROUNDS.oldRoom,
  animation: GameAnimations.CandleMotes,
  gameColorDark: "#2f3a2a",
  gameColorPale: "#e9f0d2",
  gameColorAccent: "#b7d86b",
  cardBack: CardBackColors.Moss,
  quickStart: [
    "Play a card to take a table card of the same value, or any table cards that add up to it.",
    "Taking every card on the table is a sweep, worth a point.",
    "At the end, a point each for the most cards, the most diamonds and the 7♦. Outscore your rival.",
  ],
  howToPlay: [
    "## Objective",
    "Score more points than your rival once the deck is played out.",

    "## Taking Cards",
    "- You and the rival hold three cards each, with four on the table. Each card played takes table cards: one of the same value, or, if there's none, any cards that add up to its value. Aces count 1, Jacks 11, Queens 12 and Kings 13.",
    "- A card that can take something must. One that can't is laid on the table.",
    "- Tap a card in your hand. If it can take cards in more than one way, tap the table cards you want: the capture is made once they add up.",
    "- When both hands are empty, three more cards each are dealt. Whoever took cards last takes what's left on the table at the end.",

    "## Scoring",
    "- A **sweep**, taking every card on the table, is a point.",
    "- At the end: a point for the most cards, a point for the most diamonds and a point for the 7♦.",

    "## Your Rival",
    "The rival's cards are face up, and it always plays the same way: it takes the most cards it can (a sweep first). Between equal takes, it prefers the 7♦, then the most diamonds, then its lowest card. With nothing to take, it lays down its lowest card.",
  ],
};
