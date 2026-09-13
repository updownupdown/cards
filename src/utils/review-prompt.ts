import { loadGameSettingsMap } from "@/data/game-menu";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const REVIEW_PROMPTED_STORAGE_KEY = "cards.storeReviewPrompted.v1";
const WINS_BEFORE_REVIEW_PROMPT = 5;
// Let the win box appear first rather than covering it straight away.
const REVIEW_PROMPT_DELAY_MS = 1500;

/**
 * Ask for a Play Store rating once, after the player's fifth win across all
 * games. Android decides whether the review sheet actually shows (it's
 * rate-limited, and only appears for apps installed from Google Play).
 */
export async function maybeRequestStoreReview() {
  if (Platform.OS === "web") return;

  try {
    if (await AsyncStorage.getItem(REVIEW_PROMPTED_STORAGE_KEY)) return;

    const settingsMap = await loadGameSettingsMap();
    const totalWins = Object.values(settingsMap).reduce(
      (total, settings) => total + (settings?.stats?.wins ?? 0),
      0,
    );
    if (totalWins < WINS_BEFORE_REVIEW_PROMPT) return;

    const StoreReview = await import("expo-store-review");
    if (
      !(await StoreReview.isAvailableAsync()) ||
      !(await StoreReview.hasAction())
    ) {
      return;
    }

    await AsyncStorage.setItem(REVIEW_PROMPTED_STORAGE_KEY, "1");
    await new Promise((resolve) => setTimeout(resolve, REVIEW_PROMPT_DELAY_MS));
    await StoreReview.requestReview();
  } catch {
    // A failed prompt is never worth surfacing.
  }
}
