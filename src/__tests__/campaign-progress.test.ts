import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, test } from "@jest/globals";
import {
  grantMercySkip,
  loadCampaignProgress,
  recordCampaignWin,
  spendMercySkip,
} from "@/data/campaign-progress";
import { CAMPAIGN_PROGRESS_STORAGE_KEY } from "@/data/storage-keys";
import {
  GAME_DOT_DEFINITIONS,
  CAMPAIGN_START_PATH,
  getUnlockedGameDotPaths,
} from "@/data/campaign-map";
import { getV3Neighbours } from "@/data/campaign-map.v3";

describe("Nodes progress", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("version 1 quote IDs follow their quotes into the three 52-card decks", async () => {
    await AsyncStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        collectedTaoIds: [1],
        collectedQuoteIds: [3, 104, 105, 115, 116, 168],
      }),
    );

    const progress = await loadCampaignProgress();

    expect(progress.version).toBe(4);
    expect(progress.collectedTaoIds).toEqual([1]);
    // In version 2: 115 was dropped, 116 moved down one and 168 twelve, to
    // 3, 104, 105, 115 and 156. Of those, version 3 kept 3 and 105.
    expect(progress.collectedQuoteIds).toEqual([3, 29]);
  });

  test("version 2 quote IDs follow their quotes into the hand-picked list", async () => {
    await AsyncStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 2, collectedQuoteIds: [5, 105, 115, 205] }),
    );

    const progress = await loadCampaignProgress();

    // 115 was dropped; the others moved down to close the gaps.
    expect(progress.collectedQuoteIds).toEqual([4, 29, 66]);
  });

  test("version 3 quote IDs are kept as they are", async () => {
    await AsyncStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 3, collectedQuoteIds: [115, 170] }),
    );

    const progress = await loadCampaignProgress();

    expect(progress.collectedQuoteIds).toEqual([115, 170]);
  });

  test("granting a mercy skip increments the count; using it checkpoints collectibles owned", async () => {
    await AsyncStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        collectedTaoIds: [1, 2],
        collectedQuoteIds: [3],
      }),
    );

    await grantMercySkip();
    let progress = await loadCampaignProgress();
    expect(progress.mercySkipCount).toBe(1);
    expect(progress.mercySkipCollectibleCheckpoint).toBeNull();

    await spendMercySkip(CAMPAIGN_START_PATH);
    progress = await loadCampaignProgress();
    expect(progress.mercySkipCount).toBe(0);
    expect(progress.mercySkipCollectibleCheckpoint).toBe(3);
  });

  test("spending a mercy skip wins a reachable gameDot without granting a collectible", async () => {
    await grantMercySkip();
    const result = await spendMercySkip(CAMPAIGN_START_PATH);
    const progress = await loadCampaignProgress();

    expect(result.applied).toBe(true);
    expect(progress.winsByPath[CAMPAIGN_START_PATH]).toBe(1);
    expect(progress.mercySkipCount).toBe(0);
    expect(progress.collectedTaoIds).toEqual([]);
    expect(progress.collectedQuoteIds).toEqual([]);
    // Winning the start game dot should unlock its neighbours.
    const neighborPath = GAME_DOT_DEFINITIONS.find((gameDot) =>
      gameDot.connections.includes(CAMPAIGN_START_PATH),
    )!.path;
    expect(result.newlyUnlockedPaths).toContain(neighborPath);
  });

  test("spending a mercy skip with none available does nothing", async () => {
    const result = await spendMercySkip(CAMPAIGN_START_PATH);
    const progress = await loadCampaignProgress();

    expect(result.applied).toBe(false);
    expect(progress.winsByPath[CAMPAIGN_START_PATH]).toBeUndefined();
  });

  test("spending a mercy skip on an unreachable gameDot does nothing", async () => {
    const unreachablePath = GAME_DOT_DEFINITIONS.find(
      (gameDot) =>
        gameDot.path !== CAMPAIGN_START_PATH &&
        !gameDot.connections.includes(CAMPAIGN_START_PATH),
    )!.path;

    await grantMercySkip();
    const result = await spendMercySkip(unreachablePath);
    const progress = await loadCampaignProgress();

    expect(result.applied).toBe(false);
    expect(progress.mercySkipCount).toBe(1);
  });

  describe("games stay open once they have been", () => {
    const save = (progress: object) =>
      AsyncStorage.setItem(
        CAMPAIGN_PROGRESS_STORAGE_KEY,
        JSON.stringify(progress),
      );
    const onMap = (path: string) =>
      GAME_DOT_DEFINITIONS.some((gameDot) => gameDot.path === path);

    test("a save from before version 4 keeps what its wins opened on the old map", async () => {
      // Seer has since been removed. Winning it had opened its neighbours.
      const opened = getV3Neighbours("/seer");
      expect(opened.length).toBeGreaterThan(0);
      await save({ version: 3, winsByPath: { "/klondike": 1, "/seer": 2 } });

      const progress = await loadCampaignProgress();

      expect(progress.winsByPath).toEqual({ "/klondike": 1 });
      expect(progress.unlockedPaths).toEqual(
        expect.arrayContaining([...opened]),
      );
      expect(progress.unlockedPaths).not.toContain("/seer");
      // And they are playable, not just listed.
      const unlocked = getUnlockedGameDotPaths(
        new Set(Object.keys(progress.winsByPath)),
        progress.unlockedPaths,
      );
      for (const path of opened) expect(unlocked.has(path)).toBe(true);
    });

    test("a renamed game's win and neighbours follow it", async () => {
      await save({ version: 3, winsByPath: { "/four-seasons": 1 } });

      const progress = await loadCampaignProgress();

      const kept = getV3Neighbours("/four-seasons").filter(onMap);
      expect(progress.unlockedPaths).toEqual(
        expect.arrayContaining(["/little-windmill", ...kept]),
      );
      expect(progress.unlockedPaths).not.toContain("/four-seasons");
    });

    test("games listed as open stay open with no win to explain them", async () => {
      const far = GAME_DOT_DEFINITIONS.find(
        (gameDot) =>
          gameDot.path !== CAMPAIGN_START_PATH &&
          !gameDot.connections.includes(CAMPAIGN_START_PATH),
      )!.path;
      await save({ version: 4, winsByPath: {}, unlockedPaths: [far, "/gone"] });

      const progress = await loadCampaignProgress();
      expect(progress.unlockedPaths).toEqual([far, CAMPAIGN_START_PATH].sort());

      // So it can be won, which opens its own neighbours for good.
      const result = await recordCampaignWin(far, "session-1");
      expect(result.progress.winsByPath[far]).toBe(1);
      const after = await loadCampaignProgress();
      expect(after.unlockedPaths).toEqual(
        expect.arrayContaining(
          GAME_DOT_DEFINITIONS.find((gameDot) => gameDot.path === far)!
            .connections,
        ),
      );
    });

    test("a win adds the games it opens to the save", async () => {
      const result = await recordCampaignWin(CAMPAIGN_START_PATH, "session-1");
      const start = GAME_DOT_DEFINITIONS.find(
        (gameDot) => gameDot.path === CAMPAIGN_START_PATH,
      )!;

      expect(result.newlyUnlockedPaths.sort()).toEqual(
        [...start.connections].sort(),
      );
      expect((await loadCampaignProgress()).unlockedPaths).toEqual(
        [CAMPAIGN_START_PATH, ...start.connections].sort(),
      );
    });
  });
});
