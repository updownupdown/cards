import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const scoundrel: GameDefinition = {
  path: "/scoundrel",
  title: "Scoundrel",
  tags: [GameTag.ModernMechanics, GameTag.DungeonCrawler, GameTag.CardCombat],
  rating: {
    complexity: 55,
    difficulty: 70,
    luck: 30,
  },
  thumbnail: "Scoundrel.jpg",
  background: GAME_BACKGROUNDS.stoneTunnel,
  animation: GameAnimations.Embers,
  cardBack: "Scoundrel.jpg",
  gameColorDark: "#292116",
  gameColorPale: "#faefe3",
  cardDescription:
    "A dungeon crawl where you manage weapon strength and potion usage.",
  quickStart: [
    "Resolve any 3 cards to clear a room. You can skip at most one room in a row.",
    "Equip weapons to increase damage. Reuse weapons on monsters of equal or lower value.",
    "Use potions to heal.",
  ],
  howToPlay: [
    "## Objective",
    "- Clear the dungeon by resolving all rooms before running out of health.",
    "- Your score is based on remaining health, with a bonus when finishing with an unused potion.",

    "## Card Types",
    "- **Black cards are Monsters**: clear them by taking damage equal to their value.",
    "- **Diamonds are Weapons**: equip to reduce monster damage by the weapon's value. Weapons can only be used on monsters of equal or lower value than the last monster they killed.",
    "- **Hearts are Potions**: heal according to the potion's value. This implementation of the game differs from the original in that you are not limited to one portion per room.",

    "## Rooms",
    "- The dungeon is divided into rooms of 4 cards each.",
    "- You must resolve any 3 cards within that room to progress to the next. The unresolved 4th card carries over to the next room.",
    '- You may skip (or "Run") a room if the previous room was not skipped. The cards in skipped rooms are moved to the bottom of the stock deck, so you will still need to resolve them later.',
    "- Monster damage is reduced by your equipped weapon value. After a weapon kills a monster, it can only be used on monsters of equal or lower value than the last one it killed.",

    "## Tips",
    "- Skip rooms if they are too difficult, **or** if they are easy or contain high value weapons that are best used later on. Remember that cards in skipped rooms will still need to be resolved in future rooms; plan accordingly.",
    "- Optimize weapon usage by first using it on a monster of as high a value as possible, and then trying to decrease the value of subsequent monsters as slowly as possible.",
    "- Use barefisted attacks when using your weapon would decrease its value too much.",
    "- Tap the stock deck to see the remaining cards in the dungeon (the cards are shown in order, but reshuffled afterwards).",
  ],
  about: [
    "Scoundrel is a dungeon-crawling solitaire game where planing and strategy truly matters: when to equip, when to take damage, and when to retreat.",
  ],
  credits: {
    creators: [GameCreators.ZachGage, GameCreators.KurtBieg],
    creationDate: "2011",
  },
};
