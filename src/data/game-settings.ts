import { normalizeGamePath, type GameSettings } from "./game-menu";

export type GameSpecificSettingKey = "difficulty" | "drawCount";
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
    "/spider-solitaire": [
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
  };

const APPLY_BEHAVIOR_TEXT: Record<GameSpecificSettingApplyBehavior, string> = {
  immediate: "Setting changes apply immediately.",
  "next-game": "Setting changes apply to the next game.",
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
