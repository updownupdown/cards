import { isPathBeyondField } from "./force-field";
import { isDevMode, useDevMode } from "./dev-mode";
import {
  getOdysseyUnlock,
  isOdysseyUnlocked,
  useOdysseyUnlock,
  type OdysseyUnlock,
} from "./odyssey-unlock";

/**
 * Whether the force field stands round the centre of the Odyssey: until the
 * full Odyssey is unlocked, games beyond it can be looked at on the map but
 * not played there. In dev mode, its box can show it or lift it whatever the
 * unlock says, for testing.
 */
function fieldUp(unlock: OdysseyUnlock, devMode: boolean, unlocked: boolean) {
  if (devMode && unlock.devFieldView !== "asPlayed") {
    return unlock.devFieldView === "shown";
  }
  return !unlocked;
}

export function isFieldUp() {
  return fieldUp(getOdysseyUnlock(), isDevMode(), isOdysseyUnlocked());
}

/** Whether the field keeps this game from being played in the Odyssey. */
export function isHeldBeyondField(path: string) {
  return isPathBeyondField(path) && isFieldUp();
}

/** Whether the force field stands, updating when it changes. */
export function useFieldUp() {
  const unlock = useOdysseyUnlock();
  const devMode = useDevMode();
  // isOdysseyUnlocked reads the same state the hook just delivered.
  return fieldUp(unlock, devMode, isOdysseyUnlocked());
}
