import type { ComponentType } from "react";
import { GAMES_DATA } from "./games-registry";

/**
 * Maps each game route path (e.g. `/rogue-run`) to its screen component in
 * `src/components/Games`, so a single dynamic route (`src/app/[game].tsx`) can
 * render every game. Components are auto-discovered — there is no per-game file
 * to maintain under `src/app`.
 *
 * A component is matched to a game by comparing normalized keys (lowercase,
 * alphanumeric only), so `/spider-solitaire` resolves to `SpiderSolitaire.tsx`.
 */
function toRouteKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Relative path (not the `@/` alias) so Metro's require.context resolves it.
const componentContext = require.context("../components/Games", true, /\.tsx$/);

// Game modules are evaluated only when a game is opened. Requiring all of them
// here ran every game file (and everything it imports) at startup.
const contextKeyByRouteKey: Record<string, string> = {};
for (const key of componentContext.keys()) {
  const fileName = key
    .split("/")
    .pop()
    ?.replace(/\.tsx$/, "");
  if (fileName) contextKeyByRouteKey[toRouteKey(fileName)] = key;
}

if (__DEV__) {
  const missing = Object.keys(GAMES_DATA).filter(
    (path) => !contextKeyByRouteKey[toRouteKey(path)],
  );
  if (missing.length > 0) {
    console.warn(
      `[games-router] No matching component for ${missing.length} game route(s): ${missing.join(", ")}. Add a matching component under src/components/Games (file name must match the route, e.g. /spider-solitaire -> SpiderSolitaire.tsx).`,
    );
  }
}

const componentByPath: Record<string, ComponentType | null> = {};

export function getGameComponentByPath(game: string): ComponentType | null {
  const path = game.startsWith("/") ? game : `/${game}`;
  if (!GAMES_DATA[path]) return null;

  if (!(path in componentByPath)) {
    const key = contextKeyByRouteKey[toRouteKey(path)];
    const mod = key
      ? (componentContext(key) as { default?: ComponentType })
      : undefined;
    componentByPath[path] =
      typeof mod?.default === "function" ? mod.default : null;
  }

  return componentByPath[path];
}
