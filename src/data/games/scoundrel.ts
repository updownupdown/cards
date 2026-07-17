import { GameDefinition, GameTag } from "../games-data";

export const scoundrel: GameDefinition = {
  path: "/scoundrel",
  tip: {
    default: {
      text: "Resolve 3 cards to clear a room. Every other room can be skipped. Equip weapons to increase damage, and use potions to heal.",
    },
  },
  title: "Scoundrel",
  thumbnail: "Scoundrel.jpg",
  cardBack: "Scoundrel.png",
  background: "wall-tile.jpg",
  cardColorBg: "#201913",
  cardColorText: "#fce8e3",
  cardDescription:
    "A dungeon crawl where you manage weapon strength and potion usage.",
  stats: {
    complexity: 60,
    difficulty: 70,
    luck: 30,
  },
  tags: [GameTag.ModernMechanics],
  byLine: "Game design by Zach Gage and Kurt Bieg, 2011",
  about: [
    "Scoundrel is a dungeon-crawling solitaire game where planing and strategy truly matters: when to equip, when to take damage, and when to retreat.",
  ],
  howToPlay: [
    "## Objective",
    "- Clear the dungeon by resolving all rooms before running out of health.",
    "- Your score is based on remaining health (with a bonus when finishing with an unused potion).",
    "## Card Types",
    "- **Black cards are Monsters**: Clear them by taking damage equal to their value.",
    "- **Diamonds are Weapons**: Equip to reduce monster damage by the weapon's value. Weapons can only be used on monsters of equal or lower value than the last monster they killed.",
    "- **Hearts are Potions**: Heal for the potion's value when played. This implementation of the game differs from the original in that you are not limited to one portion per room.",
    "## Playing a room",
    "- The dungeon is divided into rooms of 4 cards each.",
    'You may skip (or "Run") a room if the previous room was not skipped. The card in skipped rooms are moved to the bottom of the Draw deck, so you will still need to resolve them later.',
    "Otherwise, you must resolve any 3 cards within that room to progress to the next. The unresolved 4th card carries over to the next room.",
    "- Monster damage is reduced by your equipped weapon value. After a weapon kills a monster, it can only be used on monsters of equal or lower value than the last one it killed.",
    "## Tips",
    "- Skip rooms if they are too difficult, **or** if they are easy or contain high value weapons that are best used in future rooms. Remember that cards in skipped rooms will still need to be resolved in future rooms; plan accordingly.",
    "- Optimize weapon usage by first using it on a monster of as high a value as possible, and then by trying to decrease the value of future monsters as slowly as possible.",
    "- Use barefisted attacks when using your weapon would decrease its value too much.",
    "- Tap the Draw deck to see the remaining cards in the dungeon (the cards are not shown in their true order!).",
  ],
};
