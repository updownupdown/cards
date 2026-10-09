import {
  CHARGE_MS,
  COMBO_WINDOW_MS,
  PAIR_AT,
  RUN_FULL_AT,
  SHOWER_EVERY,
  starColor,
  TRIO_AT,
} from "@/components/common/TapShootingStars";
import { TaoReveal } from "@/components/TaoReveal/TaoReveal";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import React from "react";
import { StyleSheet } from "react-native";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const WIDTH = 400;
const HEIGHT = 800;

const rgbOf = (hex: string) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
/** HSL saturation, 0 to 1. */
function saturation([r, g, b]: number[]) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}
/** HSL hue, in degrees. */
function hue([r, g, b]: number[]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** A reveal with its page open, and a finger to play on it with. */
function openReveal() {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<TaoReveal chapter={1} onDone={() => {}} />);
  });
  const root = renderer.root.find(
    (node) =>
      node.props.testID === "tao-reveal" &&
      typeof node.props.onLayout === "function",
  );
  act(() => {
    root.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height: HEIGHT } },
    });
  });
  // The page (and the sky with it) opens a little into the fade.
  act(() => {
    jest.advanceTimersByTime(1000);
  });

  const touch = (
    name: "onTouchStart" | "onTouchMove" | "onTouchEnd" | "onTouchCancel",
    x: number,
    y: number,
    identifier = 1,
  ) =>
    act(() => {
      root.props[name]({
        nativeEvent: { identifier, pageX: x, pageY: y },
      });
    });

  const stars = (kind = "tap") =>
    renderer.root.findAll(
      (node: ReactTestInstance) =>
        typeof node.type === "string" &&
        String(node.props.testID).startsWith(`shooting-star:${kind}:`),
    );
  /** How many stars of the kind have been sent, burnt out or not. */
  const born = (kind = "tap") =>
    stars(kind).reduce(
      (most, node) =>
        Math.max(most, Number(String(node.props.testID).split(":")[2])),
      0,
    );
  const trails = () =>
    renderer.root.findAll(
      (node: ReactTestInstance) =>
        typeof node.type === "string" &&
        node.props.testID === "shooting-star-trail",
    );
  const sparks = () =>
    renderer.root.findAll(
      (node: ReactTestInstance) =>
        typeof node.type === "string" &&
        node.props.testID === "shooting-star-spark",
    );

  /** The latest star's path length, lit length, direction and colour. */
  const latest = () => {
    const all = stars();
    const star = all[all.length - 1];
    const trail = star.findAll(
      (node: ReactTestInstance) =>
        typeof node.type === "string" &&
        node.props.testID === "shooting-star-trail",
    )[0];
    const style = StyleSheet.flatten(star.props.style);
    const lit = StyleSheet.flatten(trail.props.style);
    const match = /rgba\((\d+), (\d+), (\d+)/.exec(String(lit.boxShadow));
    return {
      travel: style.width as number,
      tail: lit.width as number,
      angle: parseFloat(
        String((style.transform as { rotate: string }[])[0].rotate),
      ),
      rgb: match ? [+match[1], +match[2], +match[3]] : null,
    };
  };

  return {
    renderer,
    touch,
    stars,
    born,
    trails,
    sparks,
    latest,
    /**
     * A quick tap, then the given pause. Gives the star it sent (read
     * before the pause: a short star may burn out during a long one).
     */
    tap: (x: number, y: number, pauseMs = 100) => {
      touch("onTouchStart", x, y);
      act(() => {
        jest.advanceTimersByTime(30);
      });
      touch("onTouchEnd", x, y);
      const sent = stars().length > 0 ? latest() : null;
      act(() => {
        jest.advanceTimersByTime(pauseMs);
      });
      return sent;
    },
    unmount: () => act(() => renderer.unmount()),
  };
}

describe("Tapping the sky of a reveal", () => {
  test("a tap sends one white star from under the finger", () => {
    const sky = openReveal();
    expect(sky.stars()).toHaveLength(0);

    sky.tap(100, 300);
    expect(sky.stars()).toHaveLength(1);
    const style = StyleSheet.flatten(sky.stars()[0].props.style);
    expect(style.left).toBe(100);
    // All but white, and no head: the trail is a lit length of the path.
    const first = sky.latest();
    expect(saturation(first.rgb!)).toBeLessThan(0.2);
    expect(first.tail).toBeLessThan(first.travel);
    expect(sky.trails()).toHaveLength(1);
    expect(sky.sparks()).toHaveLength(0);

    // It burns out and is gone.
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(sky.stars()).toHaveLength(0);
    sky.unmount();
  });

  test("a run deepens the colour and lengthens the trail; a pause starts over", () => {
    const sky = openReveal();
    const seen: number[] = [];
    const travels: number[] = [];
    for (let count = 1; count <= RUN_FULL_AT; count += 1) {
      const star = sky.tap(100, 300)!;
      seen.push(saturation(star.rgb!));
      travels.push(star.travel);
    }
    // The first all but white, the last fully coloured, deepening between.
    expect(seen[0]).toBeLessThan(0.2);
    expect(seen[RUN_FULL_AT - 1]).toBeGreaterThan(0.8);
    expect(seen[5]).toBeGreaterThan(seen[0]);
    expect(seen[5]).toBeLessThan(seen[RUN_FULL_AT - 1]);
    // Longer with the run (the random variation is smaller than that).
    expect(Math.max(...travels.slice(-3))).toBeGreaterThan(
      Math.min(...travels.slice(0, 3)),
    );

    // A pause longer than the window, and the next tap is white again.
    act(() => {
      jest.advanceTimersByTime(COMBO_WINDOW_MS + 1);
    });
    expect(saturation(sky.tap(100, 300)!.rgb!)).toBeLessThan(0.2);
    sky.unmount();
  });

  test("every star has a hue of its own, scanning round the wheel", () => {
    const hues = Array.from({ length: 6 }, (_, index) =>
      hue(rgbOf(starColor(RUN_FULL_AT + index, 0.5))),
    );
    for (let index = 1; index < hues.length; index += 1) {
      const apart = Math.abs(hues[index] - hues[index - 1]);
      expect(Math.min(apart, 360 - apart)).toBeGreaterThan(40);
    }
  });

  test("stars set off in every direction", () => {
    const sky = openReveal();
    const angles: number[] = [];
    for (let count = 0; count < 24; count += 1) {
      angles.push(sky.tap(100, 300, COMBO_WINDOW_MS + 1)!.angle);
    }
    const quadrants = new Set(
      angles.map((angle) =>
        Math.floor(
          (((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) /
            (Math.PI / 2),
        ),
      ),
    );
    expect(quadrants.size).toBe(4);
    sky.unmount();
  });

  test("a long run sends stars in pairs, then in threes, and showers", () => {
    const sky = openReveal();
    for (let count = 1; count < PAIR_AT; count += 1) sky.tap(100, 300, 200);
    expect(sky.born()).toBe(PAIR_AT - 1);

    sky.tap(100, 300, 200);
    expect(sky.born()).toBe(PAIR_AT - 1 + 2);

    for (let count = PAIR_AT + 1; count < TRIO_AT; count += 1) {
      sky.tap(100, 300, 200);
    }
    const before = sky.born();
    sky.tap(100, 300, 200);
    expect(sky.born()).toBe(before + 3);

    for (let count = TRIO_AT + 1; count < SHOWER_EVERY; count += 1) {
      sky.tap(100, 300, 200);
    }
    expect(sky.stars("shower")).toHaveLength(0);
    sky.tap(100, 300, 1000);
    expect(sky.stars("shower").length).toBeGreaterThan(4);
    sky.unmount();
  });

  test("holding before letting go makes a longer star, not a wider one; held full, it bursts", () => {
    const sky = openReveal();
    const tap = sky.tap(100, 300, COMBO_WINDOW_MS + 1)!;
    expect(sky.sparks()).toHaveLength(0);

    sky.touch("onTouchStart", 200, 300);
    act(() => {
      jest.advanceTimersByTime(CHARGE_MS + 200);
    });
    sky.touch("onTouchEnd", 200, 300);
    const full = sky.latest();
    expect(full.travel).toBeGreaterThan(tap.travel * 1.3);
    expect(full.tail).toBeGreaterThan(tap.tail);
    expect(sky.sparks().length).toBeGreaterThan(0);
    // The same thickness throughout.
    const heights = sky
      .trails()
      .map((node) => StyleSheet.flatten(node.props.style).height);
    expect(new Set(heights).size).toBe(1);
    sky.unmount();
  });

  test("a scroll sends nothing and ends the run", () => {
    const sky = openReveal();
    let sixth = null;
    for (let count = 0; count < 6; count += 1) sixth = sky.tap(100, 300);
    expect(saturation(sixth!.rgb!)).toBeGreaterThan(0.3);

    sky.touch("onTouchStart", 100, 300);
    sky.touch("onTouchMove", 100, 340);
    sky.touch("onTouchEnd", 100, 340);
    expect(sky.born()).toBe(6);

    const fresh = sky.tap(100, 300);
    expect(sky.born()).toBe(7);
    expect(saturation(fresh!.rgb!)).toBeLessThan(0.2);
    sky.unmount();
  });

  test("a press on the button is the button's, not a star", () => {
    const sky = openReveal();
    const island = sky.renderer.root.find(
      (node: ReactTestInstance) =>
        typeof node.type === "string" &&
        node.props.testID === "reveal-button" &&
        typeof node.props.onTouchStart === "function",
    );
    const root = sky.renderer.root.find(
      (node) =>
        node.props.testID === "tao-reveal" &&
        typeof node.props.onTouchStart === "function",
    );
    // As a touch on the button does: the same event reaches the island,
    // then the sky above it.
    const event = { nativeEvent: { identifier: 1, pageX: 200, pageY: 750 } };
    act(() => {
      island.props.onTouchStart(event);
      root.props.onTouchStart(event);
      root.props.onTouchEnd(event);
    });
    expect(sky.born()).toBe(0);
    // Beside it, the sky is still the sky.
    sky.tap(20, HEIGHT - 24 - 24);
    expect(sky.born()).toBe(1);
    sky.unmount();
  });

  test("nothing is sent before the page opens", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<TaoReveal chapter={1} onDone={() => {}} />);
    });
    const root = renderer.root.find(
      (node) =>
        node.props.testID === "tao-reveal" &&
        typeof node.props.onLayout === "function",
    );
    act(() => {
      root.props.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height: HEIGHT } },
      });
      root.props.onTouchStart({
        nativeEvent: { identifier: 1, pageX: 100, pageY: 300 },
      });
      root.props.onTouchEnd({
        nativeEvent: { identifier: 1, pageX: 100, pageY: 300 },
      });
    });
    expect(
      renderer.root.findAll(
        (node) =>
          typeof node.type === "string" &&
          String(node.props.testID).startsWith("shooting-star:tap:"),
      ),
    ).toHaveLength(0);
    act(() => renderer.unmount());
  });
});
