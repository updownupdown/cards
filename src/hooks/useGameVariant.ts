import { useGameSettings } from "./useGameSettings";
import {
  pickVariant,
  type GameVariant,
  type VariantGamePath,
} from "@/data/game-variants";

/**
 * The classic variant a game should deal, from its `variant` setting.
 * Undefined until the settings have loaded, so a game never deals (or resumes)
 * under the wrong rules and then switches.
 */
export function useGameVariant<P extends VariantGamePath>(
  path: P,
): GameVariant<P> | undefined {
  const { settings, isLoading } = useGameSettings(path);
  if (isLoading || !settings) return undefined;
  return pickVariant(path, settings.variant);
}
