import { getGameSpecificSettingDefinitions } from "@/data/game-settings";
import { useMemo } from "react";

export function useGameSpecificSettings(pathname: string) {
  return useMemo(() => getGameSpecificSettingDefinitions(pathname), [pathname]);
}
