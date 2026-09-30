import { getCachedGlobalSettings } from "@/data/game-menu";
import { Platform } from "react-native";

// Light touch feedback for card play, behind the "Haptic feedback" setting
// (off by default). Native only. Reads the in-memory settings so it never
// waits on storage; they're loaded at startup by the home screen.
//
// Android uses the system's own haptic feedback constants (the same subtle
// clicks as the keyboard and system UI) rather than vibration waveforms,
// which felt too strong for something that fires on every move.

type HapticsModule = typeof import("expo-haptics");

// Loaded lazily and optionally: a build without the native module (e.g. an
// older development client) should simply get no haptics, not fail to start.
let hapticsModule: HapticsModule | null | undefined;

function getHaptics(): HapticsModule | null {
  if (hapticsModule === undefined) {
    try {
      // A lazy require (not an import) so a missing native module can be
      // caught here instead of failing when this file loads.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      hapticsModule = require("expo-haptics") as HapticsModule;
    } catch {
      hapticsModule = null;
    }
  }
  return hapticsModule;
}

function run(
  android: (h: HapticsModule) => Promise<void>,
  ios: (h: HapticsModule) => Promise<void>,
) {
  if (Platform.OS === "web") return;
  if (getCachedGlobalSettings()?.hapticFeedback !== true) return;

  const haptics = getHaptics();
  if (!haptics) return;
  (Platform.OS === "android" ? android : ios)(haptics).catch(() => {});
}

export const haptics = {
  /** A card (or run of cards) was picked up to drag. */
  pickUp: () =>
    run(
      (h) => h.performAndroidHapticsAsync(h.AndroidHaptics.Drag_Start),
      (h) => h.impactAsync(h.ImpactFeedbackStyle.Light),
    ),
  /** A drag moved over a valid drop target. */
  validTarget: () =>
    run(
      (h) => h.performAndroidHapticsAsync(h.AndroidHaptics.Clock_Tick),
      (h) => h.selectionAsync(),
    ),
  /** Cards were dropped onto a valid target. */
  drop: () =>
    run(
      (h) => h.performAndroidHapticsAsync(h.AndroidHaptics.Gesture_End),
      (h) => h.impactAsync(h.ImpactFeedbackStyle.Light),
    ),
  /** The faintest tick: a card landing, a sweep, a slingshot stretching. */
  tick: () =>
    run(
      (h) => h.performAndroidHapticsAsync(h.AndroidHaptics.Clock_Tick),
      (h) => h.selectionAsync(),
    ),
  /** A light knock: a card slicing, a balloon popping, a pebble landing. */
  tap: () =>
    run(
      (h) => h.performAndroidHapticsAsync(h.AndroidHaptics.Keyboard_Tap),
      (h) => h.impactAsync(h.ImpactFeedbackStyle.Soft),
    ),
  /** Something heavy landing: a boulder, a collapsing tower. */
  thud: () =>
    run(
      (h) => h.performAndroidHapticsAsync(h.AndroidHaptics.Virtual_Key),
      (h) => h.impactAsync(h.ImpactFeedbackStyle.Light),
    ),
  /** The game was won. */
  win: () =>
    run(
      (h) => h.performAndroidHapticsAsync(h.AndroidHaptics.Confirm),
      (h) => h.notificationAsync(h.NotificationFeedbackType.Success),
    ),
};
