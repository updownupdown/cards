import { afterEach, describe, expect, jest, test } from "@jest/globals";
import fs from "fs";
import path from "path";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import appConfig from "../../app.config.js";
import {
  LaunchIntro,
  useLaunchIntroPhase,
} from "@/components/common/LaunchIntro";
import {
  LOCKUP_HEIGHT,
  NAME_GAP,
  NAME_SIZE,
  SPADE_FILL,
  SPADE_HEIGHT,
  SPADE_PATH,
  SPADE_VIEWBOX,
  SPLASH_BACKGROUND,
  SPLASH_SPADE,
} from "@/components/common/launch-lockup";
import { COLOR_THEMES } from "@/styles/themes";

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

  test("the splash image is as wide as the lockup is tall", () => {
    const { expo } = appConfig;
    const entry = (expo.plugins ?? []).find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen",
    );
    const splash = (entry as [string, Record<string, unknown>])[1];
    expect(splash.imageWidth).toBe(LOCKUP_HEIGHT);
    expect(splash.backgroundColor).toBe(SPLASH_BACKGROUND);
    expect(expo.backgroundColor).toBe(SPLASH_BACKGROUND);
    expect(expo.android?.backgroundColor).toBe(SPLASH_BACKGROUND);
    expect(expo.android?.adaptiveIcon?.backgroundColor).toBe(SPLASH_BACKGROUND);
    expect(SPADE_HEIGHT + NAME_GAP + NAME_SIZE).toBeCloseTo(LOCKUP_HEIGHT, 6);
    expect(SPADE_HEIGHT).toBeCloseTo(70, 0);
  });

  test("the splash has Nocturne's night and accent", () => {
    const nocturne = COLOR_THEMES.find((entry) => entry.id === "nocturne");
    expect(SPLASH_BACKGROUND).toBe(nocturne?.colors.night);
    expect(SPLASH_SPADE).toBe(nocturne?.colors.accent);
  });
});

describe("launch intro (native)", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("hides the splash once laid out, and goes at once", async () => {
    jest.useFakeTimers();
    const phases: string[] = [];
    function Probe() {
      phases.push(useLaunchIntroPhase());
      return null;
    }
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <>
          <Probe />
          <LaunchIntro pageColor="#07080d" />
        </>,
      );
    });
    const overlay = renderer.root.findAll(
      (node) => typeof node.props?.onLayout === "function",
    )[0];
    expect(overlay).toBeDefined();
    expect(mockHide).not.toHaveBeenCalled();

    await act(async () => {
      overlay.props.onLayout({ nativeEvent: { layout: {} } });
      jest.advanceTimersByTime(50);
    });
    expect(mockHide).toHaveBeenCalledTimes(1);
    expect(phases).not.toContain("easing");
    expect(renderer.toJSON()).toBeNull();
    expect(phases[phases.length - 1]).toBe("done");
  });
});
