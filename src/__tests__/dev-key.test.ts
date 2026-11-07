import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GAME_DOT_DEFINITIONS } from "@/data/campaign-map";
import {
  grantMercySkip,
  recordCampaignWin,
  spendMercySkip,
  unlockAllCampaignGames,
} from "@/data/campaign-progress";
import {
  devKeyHash,
  hasDevKey,
  loadDevKey,
  redeemDevKey,
  resetDevKeyForTests,
} from "@/data/dev-key";
import { canUseDevMode, saveDevMode } from "@/data/dev-mode";
import { DEV_KEY_STORAGE_KEY } from "@/data/storage-keys";
import * as utils from "@/utils/utils";

const DEV_KEY = "MNPQ-RSTV-WXYZ";

jest.mock("@/data/dev-keys", () => {
  const { sha256Hex } =
    jest.requireActual<typeof import("@/utils/sha256")>("@/utils/sha256");
  const salt = "test-salt:";
  return {
    DEV_KEY_SALT: salt,
    DEV_KEYS: [{ label: "Me", hash: sha256Hex(salt + "MNPQRSTVWXYZ") }],
  };
});

beforeEach(async () => {
  await AsyncStorage.clear();
  resetDevKeyForTests();
  jest.spyOn(utils, "isLocalDevEnvironment").mockReturnValue(false);
});

afterEach(async () => {
  await saveDevMode(false);
  jest.restoreAllMocks();
});

describe("Developer keys", () => {
  test("a developer key, typed any old way, allows dev mode and is kept", async () => {
    await loadDevKey();
    expect(canUseDevMode()).toBe(false);
    expect(await redeemDevKey("nope")).toBe(false);
    expect(await redeemDevKey("")).toBe(false);
    expect(await redeemDevKey("mnpq rstv wxyz")).toBe(true);
    expect(hasDevKey()).toBe(true);
    expect(canUseDevMode()).toBe(true);

    resetDevKeyForTests();
    await loadDevKey();
    expect(hasDevKey()).toBe(true);
  });

  test("a key entered as the Odyssey's unlock still counts, and its save is kept", async () => {
    const before = {
      keyHash: devKeyHash(DEV_KEY),
      keptFromBefore: true,
      checkedBeforeField: true,
      devFieldView: "lifted",
    };
    await AsyncStorage.setItem(DEV_KEY_STORAGE_KEY, JSON.stringify(before));
    await loadDevKey();
    expect(hasDevKey()).toBe(true);
    expect(
      JSON.parse((await AsyncStorage.getItem(DEV_KEY_STORAGE_KEY))!),
    ).toEqual(before);
  });

  test("a key taken off the list, or a friend's from before, no longer counts", async () => {
    await AsyncStorage.setItem(
      DEV_KEY_STORAGE_KEY,
      JSON.stringify({ keyHash: devKeyHash("ZZZZ-ZZZZ-ZZZZ") }),
    );
    await loadDevKey();
    expect(hasDevKey()).toBe(false);
    expect(canUseDevMode()).toBe(false);
  });

  test("an unreadable save reads as no key", async () => {
    await AsyncStorage.setItem(DEV_KEY_STORAGE_KEY, "{not json");
    await loadDevKey();
    expect(hasDevKey()).toBe(false);
  });
});

describe("The whole Odyssey", () => {
  test("every game on the map counts a win and takes a Mercy Skip", async () => {
    await unlockAllCampaignGames();
    const far = [...GAME_DOT_DEFINITIONS].sort(
      (a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y),
    )[0];
    const won = await recordCampaignWin(far.path, "a");
    expect(won.progress.winsByPath[far.path]).toBe(1);

    const next = [...GAME_DOT_DEFINITIONS].sort(
      (a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y),
    )[1];
    await grantMercySkip();
    expect((await spendMercySkip(next.path)).applied).toBe(true);
  });
});
