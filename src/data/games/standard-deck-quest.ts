import { GameDefinition, GameTag } from "../games-data";

export const standardDeckQuest: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/standard-deck-quest",
  title: "Standard Deck Quest",
  tags: [GameTag.EasyToLearn, GameTag.DungeonCrawler, GameTag.CardCombat],
  rating: { complexity: 35, difficulty: 55, luck: 40 },
  gameColorDark: "#20302d",
  gameColorPale: "#e9e1c8",
  cardDescription:
    "Equip weapons, drink potions, and defeat eight dungeon monsters.",
  quickStart: [
    "Defeat 8 black-suit monsters.",
    "Diamonds equip weapons; Hearts heal.",
    "Brace adds 3 defence for one fight.",
  ],
  howToPlay: [
    "## Objective",
    "Defeat eight Clubs or Spades before your health reaches zero.",
    "## Equipment",
    "- Diamonds replace your weapon when stronger.",
    "- Hearts restore health.",
    "- Black cards are monsters. Damage equals their value minus your weapon.",
    "- Brace adds three defence for the current monster.",
  ],
};
