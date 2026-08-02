import type { GameSpecificSettingApplyBehavior } from "@/data/game-settings";

export function shouldReloadGameAfterSettingChange(
  currentValue: unknown,
  nextValue: unknown,
  applyBehavior: GameSpecificSettingApplyBehavior | undefined,
) {
  return applyBehavior === "next-game" && !Object.is(currentValue, nextValue);
}
