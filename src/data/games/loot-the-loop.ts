import { GameDefinition, GameTag } from "../games-data";

export const lootTheLoop: GameDefinition = {
  path: "/loot-the-loop",
  tip: {
    default: {
      text: "Capture legal loop cards; keep tempo; avoid breaking loop.",
    },
  },
  title: "Loot the Loop",
  thumbnail: "LootTheLoop.jpg",
  cardBack: "LootTheLoop.png",
  background: "wall-tile.jpg",
  cardColorBg: "#1d120e",
  cardColorText: "#dfd4bd",
  cardDescription:
    "Capture scoring loop cards while preserving momentum and avoiding disruptive breaks.",
  stats: {
    complexity: 50,
    difficulty: 45,
    luck: 60,
  },
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  byLine: "Game design by Wil Su",
  briefRules: [
    "Capture valid loop cards into the score pile.",
    "Protect scoring tempo by avoiding loop breaks.",
    "Win by reaching the game score objective before deck exhaustion.",
  ],
};
