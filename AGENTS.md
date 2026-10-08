# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v55.0.0/ before writing any code.

# Locked: system bar gradients

The black gradients under the status bar and the navigation buttons / home
indicator (`src/utils/system-bar-scrims.ts`, drawn by
`src/components/common/SystemBarScrims.tsx` over every screen) are tuned and
signed off. Don't change them as part of other UI work, and don't add other
veils or bars under the system bars. Before changing them — even when asked
to — warn the owner that they are locked and confirm first. The cases they
cover (native Android/iOS, web in a tab, installed web app) are listed in that
file and pinned by `src/__tests__/system-bar-scrims.test.tsx`.

# Locked: players' saved data

Players keep favourites, settings, stats, campaign progress (unlocks and wins)
and collectibles (quotes and Tao chapters) on their devices. They are stored
under the keys in `src/data/storage-keys.ts` and `src/data/game-menu.ts`, and
refer to games by path, to map nodes by the campaign map, and to quotes and Tao
chapters by number. Renaming a key, a game path or a settings field, removing
a game or a colour theme, inserting or reordering quotes, changing a loader, or
regenerating the campaign map can wipe that data on their next launch.

`src/__tests__/saved-data-guard.test.ts` pins all of this, loads a golden save
(`src/__tests__/saved-data/golden-save.json`) through the real loaders, and runs
the campaign map generator against its lock. If it fails, or before any change
that could touch saved data, STOP: warn the owner and get their OK before going
on, and prefer a migration (`MOVED_GAME_PATHS`, the campaign progress version
migrations) over changing the pins. Never:

- edit `golden-save.json`, remove anything from
  `src/__tests__/saved-data/contract.json`, or delete or hand-edit
  `src/data/campaign-map.lock.json` to make a test pass;
- run the campaign generator with `--rebuild`, `--rebalance-rewards` or
  `--reset-player-progress`.

Adding things is safe: new games (then `npm run campaign:generate` and
`npm run campaign:lock`; a game marked `enabledOnLocalOnly` gets no node and
no rewards, so it can come and go freely), quotes appended at the end, new settings, themes or
storage keys (then `npm run saved-data:pin`, which only ever adds).

Renaming, replacing or removing a game is done without losing anything else,
but only with the owner's OK for a released game: list a rename in
`MOVED_GAME_PATHS`, a different game taking another's place in
`REPLACED_GAME_PATHS` and a removal in `RETIRED_GAME_PATHS`
(`src/data/game-variants.ts`), then run `npm run campaign:generate` and
`npm run campaign:lock`. The generator keeps a renamed game's node, gives a
replaced game's node to the game in its place, and links a removed game's
neighbours to each other and hands its rewards to other games; saves keep
every game they had open (`unlockedPaths`) and every collectible. A released
path is never used again for a different game. One catalog change per PR. If
a change to a released game's rules breaks its saved deals, bump its
`sessionVersion`. The rules, step by step, are in "Adding, renaming,
replacing and removing games" in `docs/campaign-map.md`.
