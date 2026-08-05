import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameDefinition, GameTag } from "../games-data";

export const bardsAndNobles: GameDefinition = {
  path: "/bards-and-nobles",
  title: "Bards & Nobles",
  tags: [GameTag.EasyToLearn, GameTag.ModernMechanics, GameTag.ScoringPuzzles],
  rating: { complexity: 45, difficulty: 55, luck: 50 },
  thumbnail: "BardsAndNobles.jpg",
  background: GAME_BACKGROUNDS.bookstore,
  animation: GameAnimations.Dust,
  gameColorDark: "#2e2d27",
  gameColorPale: "#f0e9d7",
  cardDescription:
    "Match customer offers with your bookstore shelves and build Guild Standing.",
  quickStart: [
    "Match the offer exactly. Used-book genre is free; selected Aces can cost 1.",
  ],
  howToPlay: [
    "## Objective",
    "Complete 12 customer trades with as much **Guild Standing** as possible.",
    "## Each Customer",
    "- The customer card is worth 11, 12, or 13; add the revealed used book's value.",
    "- Choose shelf books whose total exactly matches that offer.",
    "- Shelf books matching the used book's suit cost **0**.",
    "- A selected Ace normally costs 11. Tap it once more to make it cost 1.",
    "## Resolve",
    "- On a trade, selected books matching the customer's suit join your Guild Standing; the others are discarded.",
    "- On a pass, lose Guild Standing equal to the customer rank: J = 1, Q = 2, K = 3.",
    "- Empty shelf spots refill from inventory after each interaction.",
    "## Ending",
    "You are fired when a penalty exceeds your Guild Standing. Otherwise, your Guild Standing after 12 customers is your score.",
  ],
  about: [
    "A solitaire trading puzzle by Gregg Jewell. Every offer asks you to balance immediate shelf value against the genres that will strengthen your Guild Standing.",
  ],
  credits: { creators: [GameCreators.GreggJewell] },
};
