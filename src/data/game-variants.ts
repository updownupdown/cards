/**
 * Games that bundle several classic variants behind one menu entry. The
 * `variant` game setting picks one; its first option is the default.
 *
 * Kept free of imports so both the settings store and the games can use it.
 */
export const GAME_VARIANTS = {
  "/black-hole": ["black-hole", "all-in-a-row"],
  "/forty-thieves": ["forty-thieves", "josephine", "lucas", "busy-aces"],
  "/freecell": ["freecell", "bakers-game"],
  "/gargantua": ["gargantua", "harp"],
  "/king-albert": ["king-albert", "raglan"],
  "/la-belle-lucie": ["la-belle-lucie", "trefoil", "shamrocks"],
  "/miss-milligan": ["miss-milligan", "giant"],
  "/rank-and-file": ["rank-and-file", "number-ten"],
  "/scorpion": ["scorpion", "wasp"],
  "/sir-tommy": ["sir-tommy", "puss-in-the-corner"],
  "/terrace": [
    "terrace",
    "generals-patience",
    "blondes-and-brunettes",
    "falling-star",
  ],
  "/yukon": ["yukon", "russian", "alaska", "moosehide"],
} as const;

export type VariantGamePath = keyof typeof GAME_VARIANTS;
export type GameVariant<P extends VariantGamePath> =
  (typeof GAME_VARIANTS)[P][number];

export function isVariantGamePath(path: string): path is VariantGamePath {
  return path in GAME_VARIANTS;
}

export function getDefaultVariant(path: string): string {
  return isVariantGamePath(path) ? GAME_VARIANTS[path][0] : "";
}

/** The stored variant if the game offers it, otherwise the game's default. */
export function pickVariant<P extends VariantGamePath>(
  path: P,
  value: unknown,
): GameVariant<P> {
  const options = GAME_VARIANTS[path] as readonly string[];
  return (
    typeof value === "string" && options.includes(value) ? value : options[0]
  ) as GameVariant<P>;
}

/**
 * Games that were folded into another game (as one of its variants) or
 * renamed. Saved stats, favourites, recent games and Campaign wins under the
 * old path move to the new one, and the campaign map generator keeps a
 * renamed game's place, links and rewards under its new path.
 */
export const MOVED_GAME_PATHS: Record<
  string,
  { path: string; variant?: string }
> = {
  "/alaska": { path: "/yukon", variant: "alaska" },
  "/all-in-a-row": { path: "/black-hole", variant: "all-in-a-row" },
  "/bakers-game": { path: "/freecell", variant: "bakers-game" },
  "/busy-aces": { path: "/forty-thieves", variant: "busy-aces" },
  "/charlatan": { path: "/boiling-over" },
  "/four-seasons": { path: "/little-windmill" },
  "/harp": { path: "/gargantua", variant: "harp" },
  "/josephine": { path: "/forty-thieves", variant: "josephine" },
  "/lucas": { path: "/forty-thieves", variant: "lucas" },
  "/moosehide": { path: "/yukon", variant: "moosehide" },
  "/number-ten": { path: "/rank-and-file", variant: "number-ten" },
  "/puss-in-the-corner": { path: "/sir-tommy", variant: "puss-in-the-corner" },
  "/raglan": { path: "/king-albert", variant: "raglan" },
  "/russian-solitaire": { path: "/yukon", variant: "russian" },
  "/shamrocks": { path: "/la-belle-lucie", variant: "shamrocks" },
  "/singularity": { path: "/black-hole", variant: "black-hole" },
};

/**
 * Games taken out of the app for good. Whatever a save holds for them (stats,
 * a favourite, Campaign wins) is dropped when it loads; everything else in
 * the save is untouched. The campaign map generator hands a retired game's
 * rewards to other games, so its quotes and Tao chapter can still be
 * collected, and players who had already collected them keep them.
 *
 * Retiring a released game needs the owner's OK: see "Locked: players' saved
 * data" in AGENTS.md.
 */
export const RETIRED_GAME_PATHS: readonly string[] = ["/pickpocket", "/seer"];

/**
 * Games replaced by a different game, which took over their place on the
 * campaign map: its position, links and rewards (`"/old": "/new"`). Unlike a
 * rename, nothing of the old game's own carries over (stats, favourite,
 * recent games, Campaign wins), since the new game is a different game. A
 * save that had the old game open on the map has the new one open instead,
 * and its collectibles stay, as they are saved by number; the old game's
 * rewards not yet collected are won from the new one.
 *
 * Replacing a released game needs the owner's OK: see "Locked: players' saved
 * data" in AGENTS.md.
 */
export const REPLACED_GAME_PATHS: Record<string, string> = {
  "/pocket-poker": "/machination",
};

/** Game settings that only retired games used; saved values are ignored. */
export const RETIRED_GAME_SETTINGS: readonly string[] = [
  "seerDifficulty",
  "pokerDifficulty",
  "pokerJokers",
];

/** The current path for a game path that may have moved. */
export function currentGamePath(path: string): string {
  return MOVED_GAME_PATHS[path]?.path ?? path;
}

/**
 * The campaign map node a saved game path stands for now: a renamed game's
 * new path, or the game that replaced it.
 */
export function currentGameDotPath(path: string): string {
  const moved = currentGamePath(path);
  return currentGamePath(REPLACED_GAME_PATHS[moved] ?? moved);
}
