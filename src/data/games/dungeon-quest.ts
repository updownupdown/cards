import { GameDefinition, GameTag } from "../games-data";

export const dungeonQuest: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/dungeon-quest",
  title: "Dungeon Quest",
  tags: [
    GameTag.ModernMechanics,
    GameTag.DungeonCrawler,
    GameTag.SpatialControl,
  ],
  rating: { complexity: 75, difficulty: 65, luck: 45 },
  gameColorDark: "#242720",
  gameColorPale: "#e8dfbd",
  cardDescription:
    "Explore a branching dungeon, gather items, and escape after completing three quests.",
  quickStart: [
    "Move to a highlighted room; exhausted rooms become open corridors.",
    "Resolve traps and monsters with Fate cards, items, or retreat.",
    "Complete all three Club quests, then reach the Ace exit.",
  ],
  howToPlay: [
    "## Credit",
    "Based on **Standard Deck Dungeon** by Jesse Ames and the **Solo v1.1** variant by Jack Darwid.",
    "## Objective",
    "Complete the three Club quest cards and escape through the Ace of Spades before losing all 5 HP.",
    "## Movement",
    "Move orthogonally to the first standing room in a direction. Revealed hazards resolve when entered. Exhausted rooms are corridors and are skipped.",
    "## Fate and Items",
    "Fate checks cycle through values 6-10. Treasure can provide a Key, Rope, Retry Potion, Health Potion, or an explosion. The Gem powers one-use Wizard spells; the Shield can cancel one source of damage.",
    "## Rooms",
    "Traps, doors, monsters, passages, treasure, the Wizard, and the Dragon each retain their distinct actions. Turn a completed room sideways to exhaust it.",
  ],
};
