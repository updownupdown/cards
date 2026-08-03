import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";

export const merchantsSolitaire: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/merchants-solitaire",
  title: "Merchant's Solitaire",
  tags: [GameTag.ModernMechanics, GameTag.ScoringPuzzles],
  rating: {
    complexity: 65,
    difficulty: 65,
    luck: 35,
  },
  background: GAME_BACKGROUNDS.oldRoom,
  gameColorDark: "#243226",
  gameColorPale: "#f1e5c6",
  cardDescription:
    "Match exact offers, manage stock, and earn enough standing to stay in the guild.",
  quickStart: [
    "Match the customer's target exactly; matching Used Item types cost $0.",
  ],
  howToPlay: [
    "## Objective",
    "Resolve all customers with at least 10 Guild Standing cards.",
    "## Trade",
    "The target is the customer's rank value plus the revealed Used Item. Select Shop items that equal it exactly. Items matching the Used Item's suit are free; Aces may be worth 11 or 1.",
    "## Success & Failure",
    "Items matching the customer's suit join Guild Standing. The rest are discarded. Passing costs standing equal to Jacks 1, Queens 2, and Kings 3.",
    "## Restock",
    "After each customer, refill open Shop shelves from Inventory. Used Items return to the bottom of Inventory after a successful trade.",
    "## Settings",
    "Optional variants add Loyal Patrons, Inventory access, a harder free-item rule, and shelf-locking Vandals.",
  ],
};
