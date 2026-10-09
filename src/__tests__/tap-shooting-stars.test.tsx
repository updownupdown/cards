import {
  CHARGE_MS,
  COMBO_COLORS,
  COMBO_WINDOW_MS,
  comboColor,
  PAIR_AT,
  SHOWER_EVERY,
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
  const heads = () =>
    renderer.root.findAll(
      (node: ReactTestInstance) =>
        typeof node.type === "string" &&
        node.props.testID === "shooting-star-head",
    );
  const sparks = () =>
    renderer.root.findAll(
      (node: ReactTestInstance) =>
        typeof node.type === "string" &&
        node.props.testID === "shooting-star-spark",
    );

  return {
    renderer,
    touch,
    stars,
    born,
    heads,
    sparks,
    /** A quick tap, then the given pause. */
    tap: (x: number, y: number, pauseMs = 100) => {
      touch("onTouchStart", x, y);
      act(() => {
        jest.advanceTimersByTime(30);
      });
      touch("onTouchEnd", x, y);
      act(() => {
        jest.advanceTimersByTime(pauseMs);
      });
    },
    /** The head's colour and size (a tap's is 3px); the latest by default. */
    head: (index = heads().length - 1) => {
      const style = StyleSheet.flatten(heads()[index].props.style);
      return { color: style.backgroundColor, size: style.width };
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
    expect(sky.head(0)).toEqual({ color: COMBO_COLORS[0], size: 3 });
    expect(sky.sparks()).toHaveLength(0);

    // It burns out and is gone.
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(sky.stars()).toHaveLength(0);
    sky.unmount();
  });

  test("taps in a run climb through the colours; a pause starts over", () => {
    const sky = openReveal();
    for (let count = 1; count <= 2 * COMBO_COLORS.length; count += 1) {
      sky.tap(100, 300);
      expect(sky.head().color).toBe(COMBO_COLORS[Math.floor((count - 1) / 2)]);
    }
    // Past the named colours, every tap has a hue of its own.
    sky.tap(100, 300);
    const first = sky.head().color;
    sky.tap(100, 300);
    const second = sky.head().color;
    expect(COMBO_COLORS).not.toContain(first);
    expect(first).not.toBe(second);
    expect(first).toBe(comboColor(2 * COMBO_COLORS.length + 1));

    // A pause longer than the window, and the next tap is white again.
    act(() => {
      jest.advanceTimersByTime(COMBO_WINDOW_MS + 1);
    });
    sky.tap(100, 300);
    expect(sky.head().color).toBe(COMBO_COLORS[0]);
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

  test("holding before letting go makes a bigger star; held full, it bursts", () => {
    const sky = openReveal();
    sky.touch("onTouchStart", 100, 300);
    act(() => {
      jest.advanceTimersByTime(CHARGE_MS / 2);
    });
    sky.touch("onTouchEnd", 100, 300);
    const half = sky.head(0).size as number;
    expect(half).toBeGreaterThan(3);
    expect(sky.sparks()).toHaveLength(0);

    sky.touch("onTouchStart", 200, 300);
    act(() => {
      jest.advanceTimersByTime(CHARGE_MS + 200);
    });
    sky.touch("onTouchEnd", 200, 300);
    const full = sky.head(1).size as number;
    expect(full).toBeGreaterThan(half);
    expect(sky.sparks().length).toBeGreaterThan(0);
    sky.unmount();
  });

  test("a scroll sends nothing and ends the run", () => {
    const sky = openReveal();
    sky.tap(100, 300);
    sky.tap(100, 300);
    sky.tap(100, 300);
    expect(sky.head().color).toBe(COMBO_COLORS[1]);

    sky.touch("onTouchStart", 100, 300);
    sky.touch("onTouchMove", 100, 340);
    sky.touch("onTouchEnd", 100, 340);
    expect(sky.born()).toBe(3);

    sky.tap(100, 300);
    expect(sky.born()).toBe(4);
    expect(sky.head().color).toBe(COMBO_COLORS[0]);
    sky.unmount();
  });

  test("a press on the button is the button's, not a star", () => {
    const sky = openReveal();
    const buttonWrap = sky.renderer.root.find(
      (node: ReactTestInstance) =>
        node.props.testID === "reveal-button" &&
        typeof node.props.onLayout === "function",
    );
    act(() => {
      buttonWrap.props.onLayout({
        nativeEvent: { layout: { x: 100, y: 0, width: 200, height: 48 } },
      });
    });
    // The button sits on the bottom edge (no insets): its centre is here.
    sky.tap(WIDTH / 2, HEIGHT - 24 - 24);
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
