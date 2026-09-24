import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, test } from "@jest/globals";
import {
  grantMercySkip,
  loadNodesProgress,
  spendMercySkip,
} from "@/data/nodes-progress";
import { NODES_PROGRESS_STORAGE_KEY } from "@/data/storage-keys";
import { NODE_DEFINITIONS, NODES_START_PATH } from "@/data/nodes-map";

describe("Nodes progress", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("version 1 quote IDs follow their quotes into the three 52-card decks", async () => {
    await AsyncStorage.setItem(
      NODES_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        collectedTaoIds: [1],
        collectedQuoteIds: [3, 104, 105, 115, 116, 168],
      }),
    );

    const progress = await loadNodesProgress();

    expect(progress.version).toBe(2);
    expect(progress.collectedTaoIds).toEqual([1]);
    // 115 was dropped, 116 moves down one and 168 moves down twelve.
    expect(progress.collectedQuoteIds).toEqual([3, 104, 105, 115, 156]);
  });

  test("version 2 quote IDs are kept as they are", async () => {
    await AsyncStorage.setItem(
      NODES_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 2, collectedQuoteIds: [115, 156] }),
    );

    const progress = await loadNodesProgress();

    expect(progress.collectedQuoteIds).toEqual([115, 156]);
  });

  test("granting a mercy skip increments the count; using it checkpoints collectibles owned", async () => {
    await AsyncStorage.setItem(
      NODES_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        collectedTaoIds: [1, 2],
        collectedQuoteIds: [3],
      }),
    );

    await grantMercySkip();
    let progress = await loadNodesProgress();
    expect(progress.mercySkipCount).toBe(1);
    expect(progress.mercySkipCollectibleCheckpoint).toBeNull();

    await spendMercySkip(NODES_START_PATH);
    progress = await loadNodesProgress();
    expect(progress.mercySkipCount).toBe(0);
    expect(progress.mercySkipCollectibleCheckpoint).toBe(3);
  });

  test("spending a mercy skip wins a reachable node without granting a collectible", async () => {
    await grantMercySkip();
    const result = await spendMercySkip(NODES_START_PATH);
    const progress = await loadNodesProgress();

    expect(result.applied).toBe(true);
    expect(progress.winsByPath[NODES_START_PATH]).toBe(1);
    expect(progress.mercySkipCount).toBe(0);
    expect(progress.collectedTaoIds).toEqual([]);
    expect(progress.collectedQuoteIds).toEqual([]);
    // Winning the start node should unlock its neighbours.
    const neighborPath = NODE_DEFINITIONS.find((node) =>
      node.connections.includes(NODES_START_PATH),
    )!.path;
    expect(result.newlyUnlockedPaths).toContain(neighborPath);
  });

  test("spending a mercy skip with none available does nothing", async () => {
    const result = await spendMercySkip(NODES_START_PATH);
    const progress = await loadNodesProgress();

    expect(result.applied).toBe(false);
    expect(progress.winsByPath[NODES_START_PATH]).toBeUndefined();
  });

  test("spending a mercy skip on an unreachable node does nothing", async () => {
    const unreachablePath = NODE_DEFINITIONS.find(
      (node) =>
        node.path !== NODES_START_PATH &&
        !node.connections.includes(NODES_START_PATH),
    )!.path;

    await grantMercySkip();
    const result = await spendMercySkip(unreachablePath);
    const progress = await loadNodesProgress();

    expect(result.applied).toBe(false);
    expect(progress.mercySkipCount).toBe(1);
  });
});
