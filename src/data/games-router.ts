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

const componentByKey: Record<string, ComponentType> = {};
for (const key of componentContext.keys()) {
  const fileName = key
    .split("/")
    .pop()
    ?.replace(/\.tsx$/, "");
  if (!fileName) continue;

  const mod = componentContext(key) as { default?: ComponentType };
  if (typeof mod.default === "function") {
    componentByKey[toRouteKey(fileName)] = mod.default;
  }
}

const componentByPath: Record<string, ComponentType> = {};
for (const path of Object.keys(GAMES_DATA)) {
  const component = componentByKey[toRouteKey(path)];
  if (component) componentByPath[path] = component;
}

if (__DEV__) {
  const missing = Object.keys(GAMES_DATA).filter(
    (path) => !componentByPath[path],
  );
  if (missing.length > 0) {
    console.warn(
      `[games-router] No matching component for ${missing.length} game route(s): ${missing.join(", ")}. Add a matching component under src/components/Games (file name must match the route, e.g. /spider-solitaire -> SpiderSolitaire.tsx).`,
    );
  }
}

export function getGameComponentByPath(game: string): ComponentType | null {
  const path = game.startsWith("/") ? game : `/${game}`;
  if (!GAMES_DATA[path]) return null;
  return componentByPath[path] ?? null;
}
