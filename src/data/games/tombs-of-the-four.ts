import { GameDefinition, GameTag } from "../games-data";

export const tombsOfTheFour: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/tombs-of-the-four",
  title: "Tombs of the Four",
  tags: [GameTag.ModernMechanics, GameTag.DungeonCrawler, GameTag.CardCombat],
  rating: { complexity: 45, difficulty: 65, luck: 40 },
  gameColorDark: "#29251f",
  gameColorPale: "#ead9b7",
  cardDescription:
    "Gather power, break four royal seals, and survive the tomb.",
  quickStart: [
    "Draw an encounter.",
    "Use cards to gain health or power.",
    "Defeat each King with 10 power.",
  ],
  howToPlay: [
    "## Objective",
    "Break all four King seals before your health reaches zero.",
    "## Cards",
    "- Diamonds and Clubs build power.",
    "- Hearts restore health.",
    "- Spades threaten your health.",
    "- A King costs 10 power to seal; brace if you are not ready.",
  ],
};
