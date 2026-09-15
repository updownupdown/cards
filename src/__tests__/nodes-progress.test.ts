import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, test } from "@jest/globals";
import { loadNodesProgress } from "@/data/nodes-progress";
import { NODES_PROGRESS_STORAGE_KEY } from "@/data/storage-keys";

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
});
