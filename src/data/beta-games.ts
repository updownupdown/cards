import { isLocalDevEnvironment } from "@/utils/utils";
import { isDevMode } from "./dev-mode";

/**
 * Beta (local-only) games are always shown on a dev machine. Elsewhere they
 * show while dev mode is on (see dev-mode.ts).
 */
export function areBetaGamesVisible() {
  return isDevMode() || isLocalDevEnvironment();
}
