import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  CAMPAIGN_START_PATH,
  FIELD_RADIUS,
  GAME_DOT_DEFINITIONS,
  GAME_DOTS_BY_PATH,
  isBeyondField,
} from "@/data/campaign-map";
import {
  grantMercySkip,
  loadCampaignProgress,
  recordCampaignWin,
  spendMercySkip,
  unlockAllCampaignGames,
} from "@/data/campaign-progress";
import { canUseDevMode, saveDevMode } from "@/data/dev-mode";
import { isFieldUp } from "@/data/odyssey-field";
import {
  getUnlockKeyRole,
  hasDevKey,
  isOdysseyUnlocked,
  loadOdysseyUnlock,
  redeemUnlockKey,
  resetOdysseyUnlockForTests,
  setDevFieldView,
  unlockKeyHash,
} from "@/data/odyssey-unlock";
import {
  CAMPAIGN_PROGRESS_STORAGE_KEY,
  ODYSSEY_UNLOCK_STORAGE_KEY,
} from "@/data/storage-keys";
import * as utils from "@/utils/utils";

const FRIEND_KEY = "ABCD-EFGH-JK12";
const DEV_KEY = "MNPQ-RSTV-WXYZ";
const TESTER_KEY = "2345-6789-ABCD";

jest.mock("@/data/unlock-keys", () => {
  const { sha256Hex } =
    jest.requireActual<typeof import("@/utils/sha256")>("@/utils/sha256");
  const salt = "test-salt:";
  return {
    UNLOCK_KEY_SALT: salt,
    UNLOCK_KEYS: [
      {
        label: "Friend",
        role: "friend",
        hash: sha256Hex(salt + "ABCDEFGHJK12"),
      },
      { label: "Me", role: "dev", hash: sha256Hex(salt + "MNPQRSTVWXYZ") },
      {
        label: "Testers",
        role: "tester",
        hash: sha256Hex(salt + "23456789ABCD"),
      },
    ],
  };
});

const beyond = GAME_DOT_DEFINITIONS.filter(isBeyondField);
const inside = GAME_DOT_DEFINITIONS.filter(
  (gameDot) => !isBeyondField(gameDot),
);

beforeEach(async () => {
  await AsyncStorage.clear();
  resetOdysseyUnlockForTests();
  jest.spyOn(utils, "isLocalDevEnvironment").mockReturnValue(false);
});

afterEach(async () => {
  await saveDevMode(false);
  jest.restoreAllMocks();
});

describe("The force field's place", () => {
  test("it holds 30% to 40% of the games", () => {
    const share = inside.length / GAME_DOT_DEFINITIONS.length;
    expect(share).toBeGreaterThanOrEqual(0.3);
    expect(share).toBeLessThanOrEqual(0.4);
  });

  test("every game inside can be reached from Klondike without leaving it", () => {
    const insidePaths = new Set(inside.map((gameDot) => gameDot.path));
    const reached = new Set([CAMPAIGN_START_PATH]);
    const pending = [CAMPAIGN_START_PATH];
    while (pending.length > 0) {
      const path = pending.pop()!;
      for (const next of GAME_DOTS_BY_PATH.get(path)!.connections) {
        if (insidePaths.has(next) && !reached.has(next)) {
          reached.add(next);
          pending.push(next);
        }
      }
    }
    expect([...insidePaths].filter((path) => !reached.has(path))).toEqual([]);
  });

  test("no game dot lies on its edge", () => {
    const nearest = Math.min(
      ...GAME_DOT_DEFINITIONS.map((gameDot) =>
        Math.abs(Math.hypot(gameDot.x, gameDot.y) - FIELD_RADIUS),
      ),
    );
    expect(nearest).toBeGreaterThan(0.01);
  });
});

describe("The force field in play", () => {
  test("a win beyond it doesn't count until the Odyssey is unlocked", async () => {
    await loadOdysseyUnlock();
    await unlockAllCampaignGames();
    expect(isFieldUp()).toBe(true);

    const blocked = await recordCampaignWin(beyond[0].path, "a");
    expect(blocked.progress.winsByPath[beyond[0].path]).toBeUndefined();
    const won = await recordCampaignWin(inside[1].path, "b");
    expect(won.progress.winsByPath[inside[1].path]).toBe(1);

    await grantMercySkip();
    expect((await spendMercySkip(beyond[0].path)).applied).toBe(false);
  });

  test("winning next to it still opens the game beyond, ready for later", async () => {
    await loadOdysseyUnlock();
    const edge = inside.find((gameDot) =>
      gameDot.connections.some((path) =>
        isBeyondField(GAME_DOTS_BY_PATH.get(path)!),
      ),
    )!;
    await unlockAllCampaignGames();
    const result = await recordCampaignWin(edge.path, "c");
    const across = edge.connections.find((path) =>
      isBeyondField(GAME_DOTS_BY_PATH.get(path)!),
    )!;
    expect(result.progress.unlockedPaths).toContain(across);
  });
});

describe("Unlock keys", () => {
  test("a friend's key opens the Odyssey on the web, typed any old way", async () => {
    jest.replaceProperty(Platform, "OS", "web");
    await loadOdysseyUnlock();
    expect(await redeemUnlockKey("nope")).toBe("invalid");
    expect(await redeemUnlockKey("abcd efgh jkl2")).toBe("unlocked");
    expect(isOdysseyUnlocked()).toBe(true);
    expect(isFieldUp()).toBe(false);
    expect(hasDevKey()).toBe(false);
    expect(canUseDevMode()).toBe(false);

    // Kept for the next start.
    resetOdysseyUnlockForTests();
    await loadOdysseyUnlock();
    expect(getUnlockKeyRole()).toBe("friend");

    const won = await recordCampaignWin(beyond[0].path, "d");
    expect(won.duplicate).toBe(false);
  });

  test("in the app, a friend's key does nothing; Google Play sells it", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    await loadOdysseyUnlock();
    expect(await redeemUnlockKey(FRIEND_KEY)).toBe("webOnly");
    expect(isOdysseyUnlocked()).toBe(false);
  });

  test("a tester's key opens the Odyssey in the app, without dev mode", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    await loadOdysseyUnlock();
    expect(await redeemUnlockKey(TESTER_KEY)).toBe("unlocked");
    expect(isOdysseyUnlocked()).toBe(true);
    expect(hasDevKey()).toBe(false);
    expect(canUseDevMode()).toBe(false);
  });

  test("a developer key opens the Odyssey anywhere and allows dev mode", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    await loadOdysseyUnlock();
    expect(await redeemUnlockKey(DEV_KEY)).toBe("devKey");
    expect(isOdysseyUnlocked()).toBe(true);
    expect(canUseDevMode()).toBe(true);
    // A friend's key entered after it doesn't take its place.
    jest.replaceProperty(Platform, "OS", "web");
    expect(await redeemUnlockKey(FRIEND_KEY)).toBe("unlocked");
    expect(hasDevKey()).toBe(true);
  });

  test("a key taken off the list no longer counts", async () => {
    await AsyncStorage.setItem(
      ODYSSEY_UNLOCK_STORAGE_KEY,
      JSON.stringify({
        keyHash: unlockKeyHash("ZZZZ-ZZZZ-ZZZZ"),
        checkedBeforeField: true,
      }),
    );
    await loadOdysseyUnlock();
    expect(getUnlockKeyRole()).toBe(null);
    expect(isFieldUp()).toBe(true);
  });
});

describe("Saves from before the field", () => {
  test("a save that won beyond the field keeps the Odyssey open", async () => {
    await AsyncStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY,
      JSON.stringify({ winsByPath: { [beyond[0].path]: 1 } }),
    );
    await loadOdysseyUnlock();
    expect(isOdysseyUnlocked()).toBe(true);
    expect(isFieldUp()).toBe(false);
  });

  test("a save that only won inside it, or a new one, gets the field", async () => {
    await AsyncStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY,
      JSON.stringify({ winsByPath: { [CAMPAIGN_START_PATH]: 1 } }),
    );
    await loadOdysseyUnlock();
    expect(isOdysseyUnlocked()).toBe(false);

    // Checked once: a later win beyond (with a key since taken back, say)
    // doesn't open it.
    await loadCampaignProgress();
    await AsyncStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY,
      JSON.stringify({ winsByPath: { [beyond[0].path]: 1 } }),
    );
    resetOdysseyUnlockForTests();
    await loadOdysseyUnlock();
    expect(isOdysseyUnlocked()).toBe(false);
  });
});

describe("Dev mode's view of the field", () => {
  test("it can show or lift the field whatever the unlock says", async () => {
    jest.spyOn(utils, "isLocalDevEnvironment").mockReturnValue(true);
    await loadOdysseyUnlock();
    await saveDevMode(true);
    expect(isFieldUp()).toBe(true);
    await setDevFieldView("lifted");
    expect(isFieldUp()).toBe(false);
    await setDevFieldView("shown");
    expect(isFieldUp()).toBe(true);
    // Out of dev mode, the field is as played.
    await setDevFieldView("lifted");
    await saveDevMode(false);
    expect(isFieldUp()).toBe(true);
  });
});
