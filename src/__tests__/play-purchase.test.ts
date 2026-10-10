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
  isOdysseyUnlocked,
  loadOdysseyUnlock,
  resetOdysseyUnlockForTests,
} from "@/data/odyssey-unlock";
import {
  buyFullOdyssey,
  ODYSSEY_PRODUCT_ID,
  resetPlayPurchaseForTests,
  syncPlayPurchase,
} from "@/data/play-purchase";
import { ODYSSEY_UNLOCK_STORAGE_KEY } from "@/data/storage-keys";

type Listener = (value: unknown) => void;

/** A stand-in for Google Play, through expo-iap. */
const play = {
  owned: [] as object[],
  products: [{ id: "odyssey_unlock" }] as object[],
  onPurchase: null as Listener | null,
  onError: null as Listener | null,
  /** What Play does when the purchase sheet opens. */
  sheet: (() => {}) as () => void,
  finished: [] as object[],
};

jest.mock("expo-iap", () => ({
  ErrorCode: { AlreadyOwned: "already-owned" },
  initConnection: jest.fn(async () => true),
  purchaseUpdatedListener: (listener: Listener) => {
    play.onPurchase = listener;
    return { remove: () => {} };
  },
  purchaseErrorListener: (listener: Listener) => {
    play.onError = listener;
    return { remove: () => {} };
  },
  isUserCancelledError: (error: { code: string }) =>
    error.code === "user-cancelled",
  getAvailablePurchases: jest.fn(async () => play.owned),
  fetchProducts: jest.fn(async () => play.products),
  requestPurchase: jest.fn(async () => {
    play.sheet();
    return null;
  }),
  finishTransaction: jest.fn(async ({ purchase }: { purchase: object }) => {
    play.finished.push(purchase);
  }),
}));

const bought = {
  productId: ODYSSEY_PRODUCT_ID,
  purchaseState: "purchased",
  isAcknowledgedAndroid: false,
};

const originalOS = Platform.OS;

beforeEach(async () => {
  await AsyncStorage.clear();
  resetOdysseyUnlockForTests();
  resetPlayPurchaseForTests();
  play.owned = [];
  play.products = [{ id: ODYSSEY_PRODUCT_ID }];
  play.sheet = () => {};
  play.finished = [];
  Object.defineProperty(Platform, "OS", { value: "android" });
  await loadOdysseyUnlock();
});

afterEach(() => {
  Object.defineProperty(Platform, "OS", { value: originalOS });
});

async function saved() {
  const raw = await AsyncStorage.getItem(ODYSSEY_UNLOCK_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

describe("buying the Full Odyssey on Google Play", () => {
  test("a purchase opens the Odyssey, is saved and is acknowledged", async () => {
    play.sheet = () => play.onPurchase?.(bought);
    expect(isOdysseyUnlocked()).toBe(false);
    await expect(buyFullOdyssey()).resolves.toBe("purchased");
    expect(isOdysseyUnlocked()).toBe(true);
    expect((await saved()).purchased).toBe(true);
    expect(play.finished).toEqual([bought]);
  });

  test("a pending payment doesn't open it yet", async () => {
    play.sheet = () =>
      play.onPurchase?.({ ...bought, purchaseState: "pending" });
    await expect(buyFullOdyssey()).resolves.toBe("pending");
    expect(isOdysseyUnlocked()).toBe(false);
    expect(play.finished).toEqual([]);
  });

  test("closing Play's sheet changes nothing", async () => {
    play.sheet = () => play.onError?.({ code: "user-cancelled" });
    await expect(buyFullOdyssey()).resolves.toBe("cancelled");
    expect(isOdysseyUnlocked()).toBe(false);
  });

  test("an Odyssey already owned is restored", async () => {
    play.sheet = () => {
      play.owned = [{ ...bought, isAcknowledgedAndroid: true }];
      play.onError?.({ code: "already-owned" });
    };
    await expect(buyFullOdyssey()).resolves.toBe("purchased");
    expect(isOdysseyUnlocked()).toBe(true);
  });

  test("without the product on Play, there is nothing to buy", async () => {
    play.products = [];
    await expect(buyFullOdyssey()).resolves.toBe("unavailable");
  });

  test("there is nothing to buy off Android", async () => {
    Object.defineProperty(Platform, "OS", { value: "web" });
    await expect(buyFullOdyssey()).resolves.toBe("unavailable");
  });
});

describe("checking Google Play at startup", () => {
  test("an earlier purchase opens the Odyssey and is acknowledged", async () => {
    play.owned = [bought];
    await syncPlayPurchase();
    expect(isOdysseyUnlocked()).toBe(true);
    expect(play.finished).toEqual([bought]);
  });

  test("a refunded purchase closes it again", async () => {
    play.owned = [bought];
    await syncPlayPurchase();
    play.owned = [];
    await syncPlayPurchase();
    expect(isOdysseyUnlocked()).toBe(false);
    expect((await saved()).purchased).toBe(false);
  });

  test("offline, the saved purchase stands", async () => {
    play.owned = [bought];
    await syncPlayPurchase();
    const iap = jest.requireMock<{
      getAvailablePurchases: jest.Mock<() => Promise<object[]>>;
    }>("expo-iap");
    iap.getAvailablePurchases.mockRejectedValueOnce(new Error("offline"));
    await syncPlayPurchase();
    expect(isOdysseyUnlocked()).toBe(true);
  });
});
