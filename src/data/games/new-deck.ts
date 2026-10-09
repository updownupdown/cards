import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

// An original game (no `source`): designed by Claude for Solitarius.
export const newDeck: GameDefinition = {
  path: "/new-deck",
  title: "New Deck",
  enabledOnLocalOnly: true,
  tags: [GameTag.Puzzles, GameTag.SequenceBuilding],
  rating: { complexity: 25, difficulty: 55, luck: 10 },
  lowerScoreIsBetter: true,
  background: GAME_BACKGROUNDS.greenhouse,
  animation: GameAnimations.Dust,
  gameColorDark: "#1f2c2a",
  gameColorPale: "#dcefe4",
  gameColorAccent: "#e6c27f",
  cardBack: CardBackColors.Bicycle,
  quickStart: [
    "Put the shuffled deck back in the order it came in: Ace to King of spades, then hearts, diamonds and clubs.",
    "Tap the card at the foot of a column, then where it goes: its place in the new deck, the card that comes right after it, or an empty column.",
    "A card next to its neighbour in the new deck goes in by itself. Only five runs can be open at once.",
  ],
  howToPlay: [
    "## Objective",
    "Rebuild a new deck: every card in its place, Ace to King of spades, then hearts, diamonds and clubs. Every deal can be won.",

    "## The table",
    "- The whole deck is dealt face up into 8 columns. Only the card at the foot of a column can move.",
    "- Above them, the new deck has a row for each suit, Ace to King.",

    "## Moves",
    "- **Start a run**: put a card in its place in the new deck. A run is a stretch of the new deck with no gaps, and only **5 runs** can be open at once.",
    "- **Build**: put a card on the card that comes **right after it** in the new deck, such as the 6♠ on the 7♠. A King goes on the next suit's Ace: K♠ on A♥, K♥ on A♦, K♦ on A♣.",
    "- **Empty column**: any card can go into an empty column.",
    "- A card at the foot of a column whose neighbour (the card just before or after it) is in the new deck goes in **by itself**, free. When two runs meet, they join into one.",

    "## Par",
    "- Par is the number of moves in the shortest win the game found when it dealt. Cards that go in by themselves don't count. Match it, or beat it.",

    "## Tips",
    "- Each run you start is a place for two more cards, the one before it and the one after. Start runs where those cards are about to come free.",
    "- A run started one gap away from another joins it as soon as the card between them goes in.",
    "- Build chains in the columns: once the card before a chain's foot is in the new deck, the whole chain follows it in.",

    "## About this game",
    "New Deck was designed by Claude, the AI that helps build Solitarius: a whole game that ends with the deck as it came out of the box.",
  ],
};
