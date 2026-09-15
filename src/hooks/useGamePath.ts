import { normalizeGamePath } from "@/data/game-menu";
import { useLocalSearchParams, usePathname } from "expo-router";

/**
 * The path of the game this component belongs to. Inside a game screen it
 * comes from that screen's own route, so a screen that is still mounted while
 * another game or the home screen is shown keeps its own game rather than
 * following the global pathname. Elsewhere it is the current pathname.
 */
export function useGamePath() {
  const { game } = useLocalSearchParams<{ game?: string }>();
  const pathname = usePathname();
  return normalizeGamePath(
    typeof game === "string" && game ? `/${game}` : pathname,
  );
}
