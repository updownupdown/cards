import { describe, expect, jest, test } from "@jest/globals";
import React from "react";
import { View } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { SystemBarScrims } from "@/components/common/SystemBarScrims";
import {
  getSystemBarScrims,
  SYSTEM_BAR_SCRIM,
  type ScrimPlatform,
} from "@/utils/system-bar-scrims";

let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => mockInsets,
}));
jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  return { LinearGradient: (props: object) => <View {...props} /> };
});

/** The peak opacity a scrim starts from at the screen's edge. */
const peak = (colors: string[]) =>
  Number(colors[0].match(/[\d.]+\)$/)![0].slice(0, -1));

const scrims = (platform: ScrimPlatform, top: number, bottom: number) =>
  getSystemBarScrims({ platform, insets: { top, bottom } });

describe("System bar scrims: every case", () => {
  test("Android, three-button navigation: status bar and a strong bottom scrim", () => {
    const { top, bottom } = scrims("android", 32, 48);
    expect(peak(top!.colors)).toBe(SYSTEM_BAR_SCRIM.topOpacity);
    expect(peak(bottom!.colors)).toBe(SYSTEM_BAR_SCRIM.buttonsOpacity);
  });

  test("Android, gesture navigation: a light scrim under the handle", () => {
    const { top, bottom } = scrims("android", 32, 20);
    expect(top).not.toBeNull();
    expect(peak(bottom!.colors)).toBe(SYSTEM_BAR_SCRIM.handleOpacity);
  });

  test("iOS with a notch or Dynamic Island, and the home indicator", () => {
    const { top, bottom } = scrims("ios", 59, 34);
    expect(peak(top!.colors)).toBe(SYSTEM_BAR_SCRIM.topOpacity);
    // The indicator adapts its own colour, so it needs less.
    expect(peak(bottom!.colors)).toBe(SYSTEM_BAR_SCRIM.handleOpacity);
  });

  test("iOS in landscape: the status bar hides, so no top scrim", () => {
    const { top, bottom } = scrims("ios", 0, 21);
    expect(top).toBeNull();
    expect(bottom).not.toBeNull();
  });

  test("Web in a browser tab, and an Android web app: no insets, no scrims", () => {
    expect(scrims("web", 0, 0)).toEqual({ top: null, bottom: null });
  });

  test("Installed iOS web app (black-translucent): the same scrims as native iOS", () => {
    expect(scrims("web", 59, 34)).toEqual(scrims("ios", 59, 34));
  });

  test("a tall bottom inset on the web never gets the button-bar strength", () => {
    expect(peak(scrims("web", 0, 48).bottom!.colors)).toBe(
      SYSTEM_BAR_SCRIM.handleOpacity,
    );
  });
});

describe("System bar scrims: shape", () => {
  test("black, darkest at the edge, fading to fully clear past the inset", () => {
    const { top } = scrims("android", 40, 0);
    expect(top!.height).toBeGreaterThan(40);
    expect(
      top!.colors.every((color) => color.startsWith("rgba(0, 0, 0,")),
    ).toBe(true);
    const alphas = top!.colors.map((color) => peak([color]));
    expect([...alphas].sort((a, b) => b - a)).toEqual(alphas);
    expect(alphas.at(-1)).toBe(0);
    expect(top!.locations[0]).toBe(0);
    expect(top!.locations.at(-1)).toBe(1);
  });

  test("the inset itself stays near the peak, so the icons always read", () => {
    const { top } = scrims("android", 40, 0);
    const insetEnd = top!.locations.findIndex((at) => at >= 40 / top!.height);
    expect(peak([top!.colors[insetEnd]])).toBeGreaterThanOrEqual(
      SYSTEM_BAR_SCRIM.topOpacity * 0.8 - 0.001,
    );
  });

  test("a thin inset still fades over at least the minimum distance", () => {
    const { bottom } = scrims("ios", 0, 10);
    expect(bottom!.height).toBe(10 + SYSTEM_BAR_SCRIM.minFade);
  });

  test("LOCKED values: change only after warning the owner (see AGENTS.md)", () => {
    expect(SYSTEM_BAR_SCRIM).toEqual({
      topOpacity: 0.5,
      buttonsOpacity: 0.55,
      handleOpacity: 0.3,
      buttonsMinInset: 40,
      fadeRatio: 0.8,
      minFade: 16,
    });
    expect(scrims("android", 32, 48)).toMatchInlineSnapshot(`
{
  "bottom": {
    "colors": [
      "rgba(0, 0, 0, 0.55)",
      "rgba(0, 0, 0, 0.44)",
      "rgba(0, 0, 0, 0.22)",
      "rgba(0, 0, 0, 0.066)",
      "rgba(0, 0, 0, 0)",
    ],
    "height": 86.4,
    "locations": [
      0,
      0.556,
      0.711,
      0.867,
      1,
    ],
  },
  "top": {
    "colors": [
      "rgba(0, 0, 0, 0.5)",
      "rgba(0, 0, 0, 0.4)",
      "rgba(0, 0, 0, 0.2)",
      "rgba(0, 0, 0, 0.06)",
      "rgba(0, 0, 0, 0)",
    ],
    "height": 57.6,
    "locations": [
      0,
      0.556,
      0.711,
      0.867,
      1,
    ],
  },
}
`);
  });
});

describe("SystemBarScrims", () => {
  const render = (insets: { top: number; bottom: number }) => {
    mockInsets = { ...insets, left: 0, right: 0 };
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SystemBarScrims />);
    });
    const byId = (id: string) =>
      renderer.root.findAll(
        (node) => node.type === View && node.props.testID === id,
      );
    return {
      top: byId("system-bar-scrim-top"),
      bottom: byId("system-bar-scrim-bottom"),
    };
  };

  test("draws both edges on a phone, and never takes a touch", () => {
    const { top, bottom } = render({ top: 32, bottom: 48 });
    expect(top).toHaveLength(1);
    expect(bottom).toHaveLength(1);
    for (const node of [...top, ...bottom]) {
      expect(node.props.style.pointerEvents).toBe("none");
    }
    expect(top[0].props.style.top).toBe(0);
    expect(bottom[0].props.style.bottom).toBe(0);
  });

  test("draws nothing without insets", () => {
    const { top, bottom } = render({ top: 0, bottom: 0 });
    expect(top).toHaveLength(0);
    expect(bottom).toHaveLength(0);
  });
});
