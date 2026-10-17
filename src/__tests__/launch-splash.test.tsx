import { afterEach, describe, expect, jest, test } from "@jest/globals";
import fs from "fs";
import path from "path";
import React from "react";
import { act, create } from "react-test-renderer";
import appConfig from "../../app.config.js";
import {
  LaunchSplash,
  markLaunchScreenReady,
} from "@/components/common/LaunchSplash";
import {
  LOCKUP_HEIGHT,
  NAME_GAP,
  NAME_SIZE,
  SPADE_FILL,
  SPADE_HEIGHT,
  SPADE_PATH,
  SPADE_VIEWBOX,
  SPLASH_BACKGROUND,
  SPLASH_MAX_WAIT_MS,
  SPLASH_NAME,
  SPLASH_SPADE,
} from "@/components/common/launch-lockup";
import { getColorTheme } from "@/styles/themes";

const mockHide = jest.fn();
jest.mock("expo-router", () => ({ SplashScreen: { hide: () => mockHide() } }));

const repoRoot = path.resolve(__dirname, "../..");

describe("launch lockup", () => {
  test("the web page's spade is assets/images/spade.svg", () => {
    const svg = fs.readFileSync(
      path.join(repoRoot, "assets/images/spade.svg"),
      "utf8",
    );
    expect(svg).toContain(`viewBox="${SPADE_VIEWBOX}"`);
    expect(svg).toContain(`d="${SPADE_PATH}"`);
    const side = Number(SPADE_VIEWBOX.split(" ")[3]);
    expect(SPADE_FILL * side).toBeCloseTo(810.64, 1);
  });

  test("the splash is Nocturne's yellow on its night, everywhere", () => {
    const { expo } = appConfig;
    const entry = (expo.plugins ?? []).find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen",
    );
    const splash = (entry as [string, Record<string, unknown>])[1];
    expect(splash.imageWidth).toBe(LOCKUP_HEIGHT);
    const nocturne = getColorTheme("nocturne").colors;
    expect(SPLASH_BACKGROUND).toBe(nocturne.night);
    expect(SPLASH_SPADE).toBe(nocturne.accent);
    expect(SPLASH_NAME).toBe(nocturne.ink);
    expect(splash.backgroundColor).toBe(SPLASH_BACKGROUND);
    expect(expo.backgroundColor).toBe(SPLASH_BACKGROUND);
    expect(expo.android?.backgroundColor).toBe(SPLASH_BACKGROUND);
    expect(expo.android?.adaptiveIcon?.backgroundColor).toBe(SPLASH_BACKGROUND);
    expect(expo.web?.backgroundColor).toBe(SPLASH_BACKGROUND);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "public/manifest.json"), "utf8"),
    );
    expect(manifest.background_color).toBe(SPLASH_BACKGROUND);
    expect(SPADE_HEIGHT + NAME_GAP + NAME_SIZE).toBeCloseTo(LOCKUP_HEIGHT, 6);
    expect(SPADE_HEIGHT).toBeCloseTo(70, 0);
  });
});

describe("launch splash (native)", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("stays until Home is drawn, then goes at once", async () => {
    jest.useFakeTimers();
    await act(async () => {
      create(<LaunchSplash waitForScreen />);
    });
    await act(async () => {
      jest.advanceTimersByTime(SPLASH_MAX_WAIT_MS / 2);
    });
    expect(mockHide).not.toHaveBeenCalled();

    await act(async () => {
      markLaunchScreenReady();
    });
    expect(mockHide).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(SPLASH_MAX_WAIT_MS);
    });
    expect(mockHide).toHaveBeenCalledTimes(1);
  });
});
