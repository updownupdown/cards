import AsyncStorage from "@react-native-async-storage/async-storage";

export type GameMenuInfo = {
  title: string;
  howToPlay: string[];
};

export type GameStats = {
  attempts: number;
  wins: number;
  losses: number;
};

export type GameStatsMap = Record<string, GameStats>;

export type HomeGameEntry = {
  path: string;
  label: string;
};

const STORAGE_KEY = "cards.gameStats.v1";
const FAVORITES_STORAGE_KEY = "cards.favorites.v1";

const DEFAULT_STATS: GameStats = {
  attempts: 0,
  wins: 0,
  losses: 0,
};

export const GAME_MENU_INFO: Record<string, GameMenuInfo> = {
  "/solitaire": {
    title: "Solitaire",
    howToPlay: [
      "Move all cards to the four foundations by suit from Ace to King.",
      "Build tableau piles in descending rank with alternating colors.",
      "Only Kings can fill an empty tableau column.",
    ],
  },
  "/freecell": {
    title: "FreeCell",
    howToPlay: [
      "Move all cards to the foundations from Ace up to King by suit.",
      "Build tableau columns down by alternating colors.",
      "Use free cells and empty columns as temporary storage.",
    ],
  },
  "/spider-solitaire": {
    title: "Spider Solitaire",
    howToPlay: [
      "Build cards down by rank in tableau columns.",
      "Complete full King to Ace suit runs to clear them.",
      "Deal new rows when needed, but only when every column has cards.",
    ],
  },
  "/pyramid": {
    title: "Pyramid",
    howToPlay: [
      "Clear the pyramid by pairing exposed cards that total 13.",
      "Kings are worth 13 and can be removed alone.",
      "Use stock and waste cards to make needed pairs.",
    ],
  },
  "/tripeaks": {
    title: "TriPeaks",
    howToPlay: [
      "Remove exposed cards that are one rank higher or lower than waste top.",
      "Aces and Kings wrap in sequence for moves.",
      "Draw from stock when no legal tableau move is available.",
    ],
  },
  "/aces-up": {
    title: "Aces Up",
    howToPlay: [
      "Discard a top card when a higher card of the same suit is showing.",
      "Move a top card into an empty pile to create new options.",
      "Win by ending with only the four Aces.",
    ],
  },
  "/skyway": {
    title: "Skyway",
    howToPlay: [
      "Play cards onto lanes following each lane's build rule.",
      "Use draws and transfers to keep lanes advancing.",
      "Avoid board lockups that leave no legal lane actions.",
    ],
  },
  "/the-sandwich-guy": {
    title: "The Sandwich Guy",
    howToPlay: [
      "Chain legal matches to keep the run alive.",
      "Use buffer spaces carefully to prevent dead ends.",
      "A round ends when no legal chain can continue.",
    ],
  },
  "/area-52": {
    title: "Area 52",
    howToPlay: [
      "Survive each wave by placing cards according to the scenario rule.",
      "Use limited actions efficiently before drawing deeper into the deck.",
      "Clear all required wave objectives to win.",
    ],
  },
  "/dead-center": {
    title: "Dead Center",
    howToPlay: [
      "Resolve threats in center lanes before they overwhelm the board.",
      "Use tactical placements to keep the draw sequence alive.",
      "Win by clearing the final objective state.",
    ],
  },
  "/the-first-boba-tea-shop-in-london": {
    title: "The First Boba Tea Shop in London",
    howToPlay: [
      "Play cards into valid stacks to satisfy order constraints.",
      "Plan around blocked stacks so you do not run out of legal moves.",
      "Complete all required stacks to win.",
    ],
  },
  "/foursquare": {
    title: "Foursquare",
    howToPlay: [
      "Manage four zones with distinct placement constraints.",
      "Sequence cards so each zone can continue progressing.",
      "Complete all target zone conditions before deck lockout.",
    ],
  },
  "/loot-the-loop": {
    title: "Loot the Loop",
    howToPlay: [
      "Capture valid loop cards into the score pile.",
      "Protect scoring tempo by avoiding loop breaks.",
      "Win by reaching the game score objective before deck exhaustion.",
    ],
  },
  "/syndicate": {
    title: "Syndicate",
    howToPlay: [
      "Build and convert stacks under syndicate rank restrictions.",
      "Use timing windows to secure high-value conversions.",
      "Game ends when objective is met or no legal move remains.",
    ],
  },
  "/hide-and-seek": {
    title: "Hide and Seek",
    howToPlay: [
      "Reveal hidden cards through legal uncover moves.",
      "Avoid locking hidden cards under unusable stacks.",
      "Finish by uncovering and resolving the final hidden sets.",
    ],
  },
  "/the-emissary": {
    title: "The Emissary",
    howToPlay: [
      "Progress through kingdoms by completing each local objective.",
      "Balance risk and board control between kingdoms.",
      "Win by completing all required kingdoms.",
    ],
  },
  "/golf": {
    title: "Golf Solitaire",
    howToPlay: [
      "Play only top tableau cards one rank up or down from waste top.",
      "Use stock draws when no tableau play is possible.",
      "Clear all tableau cards to win.",
    ],
  },
  "/clock": {
    title: "Clock",
    howToPlay: [
      "Place revealed cards to matching clock positions by rank.",
      "Continue turns by revealing from the pile at each destination.",
      "Losing occurs if the fourth King appears before completion.",
    ],
  },
  "/monte-carlo": {
    title: "Monte Carlo",
    howToPlay: [
      "Remove adjacent equal-rank pairs.",
      "Consolidate cards only when no removable pair exists.",
      "Win by clearing all cards.",
    ],
  },
  "/accordion": {
    title: "Accordion",
    howToPlay: [
      "Move a card onto one 1-left or 3-left if suit or rank matches.",
      "Each move compresses the row and changes future options.",
      "Win by reducing to one card.",
    ],
  },
  "/calculation": {
    title: "Calculation",
    howToPlay: [
      "Build four foundations with step intervals 1, 2, 3, and 4.",
      "Draw from stock to waste and play waste onto legal foundation.",
      "Win by placing all cards on foundations.",
    ],
  },
  "/scorpion": {
    title: "Scorpion",
    howToPlay: [
      "Build same-suit descending runs in tableau columns.",
      "Move face-up sequences as a stack to legal destinations.",
      "Win after completing four full King-to-Ace suit runs.",
    ],
  },
  "/canfield": {
    title: "Canfield",
    howToPlay: [
      "Build foundations by suit from the starting base rank.",
      "Build tableau down by alternating color with wraparound allowed.",
      "Use reserve and stock strategically to avoid dead ends.",
    ],
  },
  "/penguin": {
    title: "Penguin",
    howToPlay: [
      "Build foundations by suit upward from the beak rank.",
      "Build tableau down by suit, filling empties with valid continuation cards.",
      "Use the reserve (flipper) cards to unlock key moves.",
    ],
  },
  "/forty-thieves": {
    title: "Forty Thieves",
    howToPlay: [
      "Build foundations up by suit from Ace.",
      "Build tableau down by suit and move one card at a time.",
      "Only Kings can fill empty tableau piles.",
    ],
  },
};

export const HOME_GAME_ENTRIES: HomeGameEntry[] = [
  { path: "/aces-up", label: "Aces Up" },
  { path: "/solitaire", label: "Solitaire" },
  { path: "/freecell", label: "FreeCell" },
  { path: "/spider-solitaire", label: "Spider Solitaire" },
  { path: "/pyramid", label: "Pyramid" },
  { path: "/tripeaks", label: "TriPeaks" },
  { path: "/golf", label: "Golf Solitaire" },
  { path: "/clock", label: "Clock Solitaire" },
  { path: "/monte-carlo", label: "Monte Carlo" },
  { path: "/accordion", label: "Accordion" },
  { path: "/calculation", label: "Calculation" },
  { path: "/scorpion", label: "Scorpion" },
  { path: "/canfield", label: "Canfield" },
  { path: "/penguin", label: "Penguin" },
  { path: "/forty-thieves", label: "Forty Thieves" },
  { path: "/skyway", label: "Skyway" },
  { path: "/the-sandwich-guy", label: "The Sandwich Guy" },
  { path: "/area-52", label: "Area 52" },
  { path: "/dead-center", label: "Dead Center" },
  { path: "/boba-shop", label: "The First Boba Tea Shop in London" },
  { path: "/foursquare", label: "Foursquare" },
  { path: "/loot-the-loop", label: "Loot the Loop" },
  { path: "/syndicate", label: "Syndicate" },
  { path: "/hide-and-seek", label: "Hide and Seek" },
  { path: "/the-emissary", label: "The Emissary" },
];

export function normalizeGamePath(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function getGameInfo(pathname: string): GameMenuInfo {
  const key = normalizeGamePath(pathname);
  return (
    GAME_MENU_INFO[key] ?? {
      title: "Game",
      howToPlay: [
        "Use the in-game controls to complete that game's objective.",
      ],
    }
  );
}

export function sortHomeGames(
  entries: HomeGameEntry[],
  favorites: Set<string>,
) {
  const normalize = (path: string) => normalizeGamePath(path);
  const alpha = [...entries].sort((a, b) => a.label.localeCompare(b.label));

  const starred = alpha.filter((entry) => favorites.has(normalize(entry.path)));
  const nonStarred = alpha.filter(
    (entry) => !favorites.has(normalize(entry.path)),
  );

  return [...starred, ...nonStarred];
}

export async function loadFavoriteGames(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
  if (!raw) return new Set<string>();

  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.map((path) => normalizeGamePath(path)));
  } catch {
    return new Set<string>();
  }
}

async function saveFavoriteGames(favorites: Set<string>) {
  const values = [...favorites].sort((a, b) => a.localeCompare(b));
  await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(values));
}

export async function toggleFavoriteGame(pathname: string) {
  const key = normalizeGamePath(pathname);
  const favorites = await loadFavoriteGames();

  if (favorites.has(key)) {
    favorites.delete(key);
  } else {
    favorites.add(key);
  }

  await saveFavoriteGames(favorites);
  return favorites;
}

function getDefaultStats(map: GameStatsMap, path: string): GameStats {
  return map[path] ?? DEFAULT_STATS;
}

export function calculateWinRate(stats: GameStats) {
  if (stats.attempts === 0) return "0.0%";
  return `${((stats.wins / stats.attempts) * 100).toFixed(1)}%`;
}

export async function loadStatsMap(): Promise<GameStatsMap> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as GameStatsMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

async function writeStatsMap(map: GameStatsMap) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

async function updateStats(
  pathname: string,
  updater: (stats: GameStats) => GameStats,
) {
  const key = normalizeGamePath(pathname);
  const map = await loadStatsMap();
  const current = getDefaultStats(map, key);
  const nextMap = {
    ...map,
    [key]: updater(current),
  };
  await writeStatsMap(nextMap);
  return nextMap;
}

export async function recordAttempt(pathname: string) {
  return updateStats(pathname, (stats) => ({
    ...stats,
    attempts: stats.attempts + 1,
  }));
}

export async function recordResult(pathname: string, won: boolean) {
  return updateStats(pathname, (stats) => ({
    ...stats,
    wins: stats.wins + (won ? 1 : 0),
    losses: stats.losses + (won ? 0 : 1),
  }));
}
