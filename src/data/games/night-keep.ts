import { GameDefinition, GameTag } from "../games-data";

export const nightKeep: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/night-keep",
  title: "Night Keep",
  tags: [GameTag.ModernMechanics, GameTag.DungeonCrawler, GameTag.CardCombat],
  rating: { complexity: 35, difficulty: 60, luck: 45 },
  gameColorDark: "#251b2a",
  gameColorPale: "#f2d9ce",
  cardDescription:
    "Survive twelve hours in a cursed keep by balancing blood and wards.",
  quickStart: [
    "Survive 12 encounters.",
    "Hearts restore blood; Clubs and Diamonds build protection.",
    "Spades attack.",
  ],
  howToPlay: [
    "## Objective",
    "Survive twelve hours before your health reaches zero.",
    "## Cards",
    "- Hearts restore health.",
    "- Clubs and Diamonds increase your power.",
    "- Spades deal damage beyond your current power.",
    "- Brace to surrender one health rather than use a card's effect.",
  ],
};
