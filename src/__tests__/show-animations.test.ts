import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { AccessibilityInfo } from "react-native";
import {
  GLOBAL_SETTINGS_STORAGE_KEY,
  loadGlobalSettings,
  resetAllSettings,
} from "@/data/game-menu";

describe("Show animations", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetAllSettings();
  });

  test("starts off when the system removes animations", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);
    expect((await loadGlobalSettings()).showAnimations).toBe(false);
  });

  test("starts on otherwise", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(false);
    expect((await loadGlobalSettings()).showAnimations).toBe(true);
  });

  test("a saved choice wins over the system", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);
    await AsyncStorage.setItem(
      GLOBAL_SETTINGS_STORAGE_KEY,
      JSON.stringify({ showAnimations: true }),
    );
    expect((await loadGlobalSettings()).showAnimations).toBe(true);
  });
});
