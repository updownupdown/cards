import { normalizeGamePath, type GameSettings } from "./game-menu";

export type GameSpecificSettingKey =
  | "difficulty"
  | "memoryDifficulty"
  | "drawCount"
  | "islandJokers"
  | "loboMode"
  | "dungeonLevel"
  | "boomerAce"
  | "powerReserve"
  | "specialAbilities"
  | "optritaHard"
  | "pokerJokers"
  | "alpineDifficulty"
  | "alpineChallenge"
  | "dungeonDifficulty";
export type GameSpecificSettingApplyBehavior = "immediate" | "next-game";

type GameSpecificSettingOptionValue = GameSettings[GameSpecificSettingKey];

export type GameSpecificSettingDefinition = {
  key: GameSpecificSettingKey;
  label: string;
  type: "string";
  applyBehavior: GameSpecificSettingApplyBehavior;
  options: { label: string; value: GameSpecificSettingOptionValue }[];
  description?: string;
};

const GAME_SPECIFIC_SETTINGS: Record<string, GameSpecificSettingDefinition[]> =
  {
    "/canfield": [
      {
        key: "drawCount",
        label: "Stock Draw",
        type: "string",
        applyBehavior: "next-game",
        options: [
          { label: "Draw 1", value: 1 },
          { label: "Draw 3", value: 3 },
        ],
      },
    ],
    "/forty-thieves": [
      {
        key: "difficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "next-game",
        options: [
          { label: "Easy", value: "easy" },
          { label: "Difficult", value: "difficult" },
        ],
      },
    ],
    "/baroness": [
      {
        key: "difficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "immediate",
        options: [
          { label: "Easy", value: "easy" },
          { label: "Difficult", value: "difficult" },
        ],
      },
    ],
    "/memory": [
      {
        key: "memoryDifficulty",
        label: "Grid Size",
        type: "string",
        applyBehavior: "next-game",
        options: [
          { label: "Easy (4 x 5)", value: "easy" },
          { label: "Medium (5 x 6)", value: "medium" },
          { label: "Hard (6 x 7)", value: "hard" },
        ],
      },
    ],
    "/solitaire": [
      {
        key: "drawCount",
        label: "Stock Draw",
        type: "string",
        applyBehavior: "next-game",
        options: [
          { label: "Draw 1", value: 1 },
          { label: "Draw 3", value: 3 },
        ],
      },
    ],
    "/island-of-cards": [
      {
        key: "islandJokers",
        label: "Use Jokers",
        type: "string",
        applyBehavior: "next-game",
        description: "Adds two Joker wildcards you can place anywhere.",
        options: [
          { label: "No", value: false },
          { label: "Yes (Easier)", value: true },
        ],
      },
    ],
    "/lobo": [
      {
        key: "loboMode",
        label: "Difficulty",
        type: "string",
        applyBehavior: "next-game",
        description: "Fewer high rank cards make the Wolf easier to beat.",
        options: [
          { label: "Easy (no 9s or 10s)", value: "easy" },
          { label: "Medium (no 10s)", value: "medium" },
          { label: "Hard (all cards)", value: "hard" },
        ],
      },
    ],
    "/clear-the-dungeon": [
      {
        key: "dungeonLevel",
        label: "Dungeon Layout",
        type: "string",
        applyBehavior: "next-game",
        options: [
          { label: "Level 1 (4x3)", value: 1 },
          { label: "Level 2 (3x4)", value: 2 },
          { label: "Level 3", value: 3 },
          { label: "Level 4", value: 4 },
          { label: "Level 5 (Extreme)", value: 5 },
        ],
      },
      {
        key: "boomerAce",
        label: "Boomer-Ace",
        type: "string",
        applyBehavior: "next-game",
        description:
          "Aces are worth 11 and return to hand when used as a trigger.",
        options: [
          { label: "Off", value: false },
          { label: "On", value: true },
        ],
      },
      {
        key: "powerReserve",
        label: "Power Reserve",
        type: "string",
        applyBehavior: "next-game",
        description: "Draw five on turn one and set two aside to use anytime.",
        options: [
          { label: "Off", value: false },
          { label: "On", value: true },
        ],
      },
      {
        key: "specialAbilities",
        label: "Special Abilities",
        type: "string",
        applyBehavior: "next-game",
        description: "Defeated Kings grant one-time abilities.",
        options: [
          { label: "Off", value: false },
          { label: "On", value: true },
        ],
      },
    ],
    "/optrita-lines": [
      {
        key: "optritaHard",
        label: "Mode",
        type: "string",
        applyBehavior: "next-game",
        description: "Hard mode gives the grid a lower target to reach.",
        options: [
          { label: "Normal", value: false },
          { label: "Hard", value: true },
        ],
      },
    ],
    "/in-hand-poker": [
      {
        key: "pokerJokers",
        label: "Jokers",
        type: "string",
        applyBehavior: "next-game",
        description: "Include two wild Jokers in the deck.",
        options: [
          { label: "No Jokers", value: false },
          { label: "Wild Jokers", value: true },
        ],
      },
    ],
    "/alpine-solitaire": [
      {
        key: "alpineDifficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "next-game",
        description:
          "Controls how a milestone qualifies for your trail when you reach a camp.",
        options: [
          { label: "Gentle", value: "gentle" },
          { label: "Standard", value: "standard" },
          { label: "Intense", value: "intense" },
        ],
      },
      {
        key: "alpineChallenge",
        label: "Eight-Thousander",
        type: "string",
        applyBehavior: "next-game",
        description:
          "Optional named challenges tweak the rules and set the trail length.",
        options: [
          { label: "Base Climb", value: "none" },
          { label: "Cho Oyu (\u22656-card milestones)", value: "cho-oyu" },
          {
            label: "Shishapangma (approach draws)",
            value: "shishapangma",
          },
          { label: "Manaslu (fatigue capped at 1)", value: "manaslu" },
          { label: "Broad Peak (vary approaches)", value: "broad-peak" },
          {
            label: "Gasherbrum II (draw one fewer)",
            value: "gasherbrum-ii",
          },
          { label: "Everest (draw seven)", value: "everest" },
          {
            label: "Dhaulagiri (traverse milestones)",
            value: "dhaulagiri",
          },
          { label: "Gasherbrum I (even anchors)", value: "gasherbrum-i" },
          {
            label: "Kangchenjunga (any anchor)",
            value: "kangchenjunga",
          },
          { label: "Lhotse (2+ card routes)", value: "lhotse" },
          { label: "Makalu (free discard)", value: "makalu" },
          {
            label: "Nanga Parbat (even-step ascents)",
            value: "nanga-parbat",
          },
          { label: "K2 (uncapped draws)", value: "k2" },
          { label: "Annapurna I (matching suits recall)", value: "annapurna" },
        ],
      },
    ],
    "/dungeon-bounty": [
      {
        key: "dungeonDifficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "next-game",
        description:
          "Higher tiers start with less strength; only Beginner ignores enemy suit powers.",
        options: [
          { label: "Beginner (5, no powers)", value: "beginner" },
          { label: "Intermediate (5)", value: "intermediate" },
          { label: "Advanced (3)", value: "advanced" },
          { label: "Bloodlust (1)", value: "bloodlust" },
        ],
      },
    ],
  };

const APPLY_BEHAVIOR_TEXT: Record<GameSpecificSettingApplyBehavior, string> = {
  immediate: "Applies without resetting the game.",
  "next-game": "Will reset the game.",
};

export function getSettingApplyBehaviorText(
  applyBehavior: GameSpecificSettingApplyBehavior,
) {
  return APPLY_BEHAVIOR_TEXT[applyBehavior];
}

export function getGameSpecificSettingDefinitions(pathname: string) {
  const key = normalizeGamePath(pathname);
  return GAME_SPECIFIC_SETTINGS[key] ?? [];
}
