import { Platform } from "react-native";
import * as expoIap from "expo-iap";
import type { Purchase, PurchaseAndroid } from "expo-iap";
import { isOdysseyUnlocked, setOdysseyPurchased } from "./odyssey-unlock";

/**
 * The Full Odyssey on Google Play: a one-time product (Play Console, Monetize,
 * In-app products). Bought once, it is the player's on every Android device
 * signed in to the same Google account, and comes back on a reinstall.
 */
export const ODYSSEY_PRODUCT_ID = "odyssey_unlock";

export type PurchaseOutcome =
  /** Bought, or already owned: the Odyssey is open. */
  | "purchased"
  /** Paid by a slow method (cash, some cards): it opens once Play confirms. */
  | "pending"
  /** The player closed Play's sheet. */
  | "cancelled"
  | "failed"
  /** No Google Play here (iOS, the web, a phone without Play). */
  | "unavailable";

type Iap = typeof expoIap;

let connecting: Promise<Iap | null> | null = null;
/** The purchase in progress, settled by Play's listeners. */
let settlePurchase: ((outcome: PurchaseOutcome) => void) | null = null;

function settle(outcome: PurchaseOutcome) {
  const resolve = settlePurchase;
  settlePurchase = null;
  resolve?.(outcome);
}

function isOdysseyPurchase(purchase: Purchase) {
  return purchase.productId === ODYSSEY_PRODUCT_ID;
}

/**
 * Keeps a bought Odyssey and acknowledges it to Play, which refunds a
 * purchase left unacknowledged for three days.
 */
async function keep(iap: Iap, purchase: Purchase) {
  await setOdysseyPurchased(true);
  if ((purchase as PurchaseAndroid).isAcknowledgedAndroid) return;
  try {
    await iap.finishTransaction({ purchase, isConsumable: false });
  } catch {
    // Acknowledged on a later start, by syncPlayPurchase.
  }
}

async function onPurchaseUpdated(iap: Iap, purchase: Purchase) {
  if (!isOdysseyPurchase(purchase)) return;
  if (purchase.purchaseState === "purchased") {
    await keep(iap, purchase);
    settle("purchased");
  } else if (purchase.purchaseState === "pending") {
    settle("pending");
  }
}

async function onPurchaseError(
  iap: Iap,
  error: Parameters<Parameters<Iap["purchaseErrorListener"]>[0]>[0],
) {
  if (iap.isUserCancelledError(error)) {
    settle("cancelled");
  } else if (error.code === iap.ErrorCode.AlreadyOwned) {
    // Bought before, on another phone or before a reinstall.
    await syncPlayPurchase();
    settle(isOdysseyUnlocked() ? "purchased" : "failed");
  } else {
    settle("failed");
  }
}

/** Connects to Google Play once, on Android; null where there's no Play. */
function connect() {
  connecting ??= (async () => {
    if (Platform.OS !== "android") return null;
    try {
      // Nothing in expo-iap reaches for its native module until it's used.
      const iap = expoIap;
      await iap.initConnection();
      iap.purchaseUpdatedListener((purchase) => {
        void onPurchaseUpdated(iap, purchase);
      });
      iap.purchaseErrorListener((error) => {
        void onPurchaseError(iap, error);
      });
      return iap;
    } catch {
      // Try again on the next call.
      connecting = null;
      return null;
    }
  })();
  return connecting;
}

/**
 * Asks Play whether this Google account owns the Full Odyssey, at startup:
 * it opens the Odyssey on a new phone or after a reinstall, finishes a
 * purchase that was pending, and closes it again after a refund. Offline,
 * the saved answer stands.
 */
export async function syncPlayPurchase() {
  const iap = await connect();
  if (!iap) return;
  try {
    const purchases = await iap.getAvailablePurchases();
    const owned = purchases.find(
      (purchase) =>
        isOdysseyPurchase(purchase) && purchase.purchaseState === "purchased",
    );
    if (owned) {
      await keep(iap, owned);
    } else {
      await setOdysseyPurchased(false);
    }
  } catch {
    // Play couldn't be reached: keep what was saved.
  }
}

/** Opens Play's purchase sheet for the Full Odyssey and waits for the end. */
export async function buyFullOdyssey(): Promise<PurchaseOutcome> {
  const iap = await connect();
  if (!iap) return "unavailable";
  if (settlePurchase) return "cancelled";
  try {
    // Play needs the product's details before it can sell it.
    const products = await iap.fetchProducts({
      skus: [ODYSSEY_PRODUCT_ID],
      type: "in-app",
    });
    if (!products?.length) return "unavailable";
  } catch {
    return "unavailable";
  }
  return new Promise<PurchaseOutcome>((resolve) => {
    settlePurchase = resolve;
    iap
      .requestPurchase({
        request: { google: { skus: [ODYSSEY_PRODUCT_ID] } },
        type: "in-app",
      })
      .catch(() => settle("failed"));
  });
}

/** For tests: forgets the connection and any purchase in progress. */
export function resetPlayPurchaseForTests() {
  connecting = null;
  settlePurchase = null;
}
