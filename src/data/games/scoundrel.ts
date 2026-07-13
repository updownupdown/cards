import { GameDefinition, GameTag } from "../games-data";

export const scoundrel: GameDefinition = {
  path: "/scoundrel",
  tutorial: {
    default: {
      text: "Resolve room cards: fight monsters, equip weapons, drink potions.",
      tip: "Weapon kills must be non-increasing in value. Resolve 3 of 4 cards, then carry one forward.",
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
  briefRules: [
    "Build each room to 4 face-up cards; resolve 3 cards and carry 1 forward.",
    "Fight monsters barehanded or with a weapon, but weapon kills must be non-increasing in value.",
    "You may run from a full room, but never two rooms in a row.",
    "Reach the end of the dungeon before your health hits 0.",
  ],
  byLine: "by Zach Gage and Kurt Bieg",
  about: [
    "Scoundrel is a compact dungeon-crawling solitaire game played with a reduced standard deck.",
    "Every decision matters: when to equip, when to tank damage, when to retreat, and when to push for a clean finish.",
  ],
  howToPlay: [
    "## Setup",
    "Start with **20 health**. The dungeon is built from a reduced deck:",
    "- Monsters: black suits ({AS} counts as 14, {AC} counts as 14, down to {2S}/{2C})",
    "- Weapons: diamonds {2D} through {10D}",
    "- Potions: hearts {2H} through {10H}",
    "## Playing a room",
    "At the start of a room, reveal cards from the dungeon until **4 room cards** are face up.",
    "On each room, resolve exactly **3 cards**. The 4th card remains and carries into the next room.",
    "Weapon cards are binding: equipping a new weapon discards your old weapon and any monsters stacked on it.",
    "Monster damage is reduced by your equipped weapon value. After a weapon kills a monster, it can only be used on monsters of equal or lower value than the last one it killed.",
    "You can run from a full room by placing all 4 room cards at the bottom of the dungeon, but you **cannot run two rooms in a row**.",
    "## Winning",
    "You lose at 0 health. You win by emptying the dungeon and room; your score is based on remaining health (with bonus conditions on a perfect potion finish).",
  ],
};
