import { DROP_MS } from "@/components/common/AttentionSpanSkip";
import { EXIT_TOTAL_MS } from "@/components/common/RewardReveal";
import { QuoteReveal } from "@/components/QuoteReveal/QuoteReveal";
import { TaoReveal } from "@/components/TaoReveal/TaoReveal";
import { QUOTE_IDS_BY_AUTHOR } from "@/data/quote-authors";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import React, { type ReactElement } from "react";
import { Text } from "react-native";
import { State } from "react-native-gesture-handler";
import {
  fireGestureHandler,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
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

/** A second into a reveal, the player can already leave it. */
const SKIPPABLE_AFTER_MS = 1000;

/** The reveal's button, if it is on screen. */
function button(renderer: ReactTestRenderer) {
  const pressable = renderer.root.findAll(
    (node: ReactTestInstance) =>
      typeof node.type !== "string" &&
      node.props.accessibilityRole === "button" &&
      node.props.accessibilityLabel === undefined,
  )[0];
  if (!pressable) return null;
  return {
    text: String(pressable.findAllByType(Text)[0].props.children),
    disabled: !!pressable.props.disabled,
    // As a touch would: a disabled button isn't pressed.
    press: () =>
      act(() => {
        if (!pressable.props.disabled) pressable.props.onPress();
      }),
  };
}

/** The skip box, with its square laid out left and its bin right. */
function skipBox(renderer: ReactTestRenderer) {
  const boxes = renderer.root.findAll(
    (node: ReactTestInstance) =>
      typeof node.type === "string" &&
      node.props.testID === "attention-span-skip",
  );
  if (boxes.length === 0) return null;
  const host = (testID: string) =>
    renderer.root.find(
      (node: ReactTestInstance) =>
        typeof node.type === "string" && node.props.testID === testID,
    );
  act(() => {
    host("attention-span-square-seat").props.onLayout({
      nativeEvent: { layout: { x: 12, y: 0, width: 96, height: 96 } },
    });
    host("attention-span-bin").props.onLayout({
      nativeEvent: { layout: { x: 240, y: 8, width: 64, height: 86 } },
    });
  });
  // The handlers reach React through a microtask, as on the UI thread.
  const drag = (dx: number, dy: number) =>
    act(async () => {
      fireGestureHandler(getByGestureTestId("attention-span-drag"), [
        { state: State.BEGAN, translationX: 0, translationY: 0 },
        { state: State.ACTIVE, translationX: dx / 2, translationY: dy / 2 },
        { state: State.ACTIVE, translationX: dx, translationY: dy },
        { state: State.END, translationX: dx, translationY: dy },
      ]);
    });
  const closeCross = renderer.root.findAll(
    (node: ReactTestInstance) =>
      typeof node.type !== "string" &&
      node.props.accessibilityRole === "button" &&
      node.props.accessibilityLabel === "Keep watching",
  )[0];
  return {
    /** Into the bin: from the square's centre (60, 48) to the bin's. */
    dragIntoBin: () => drag(212, 0),
    dragShort: () => drag(60, 0),
    keepWatching: () => act(() => closeCross.props.onPress()),
  };
}

const REVEALS: [
  string,
  string,
  (onUncover: () => void, onDone: () => void) => ReactElement,
][] = [
  [
    "a Tao chapter",
    "tao-reveal",
    (onUncover, onDone) => (
      <TaoReveal chapter={1} onUncover={onUncover} onDone={onDone} />
    ),
  ],
  [
    "a quote",
    "quote-reveal",
    (onUncover, onDone) => (
      <QuoteReveal
        quoteId={QUOTE_IDS_BY_AUTHOR.get("William Shakespeare")![0]}
        background={1}
        overlayColor="#223344"
        onUncover={onUncover}
        onDone={onDone}
      />
    ),
  ],
];

/** A reveal a second in, laid out, with Skip on screen. */
async function openReveal(
  testID: string,
  render: (onUncover: () => void, onDone: () => void) => ReactElement,
) {
  const onUncover = jest.fn();
  const onDone = jest.fn();
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(render(onUncover, onDone));
  });
  const root = renderer.root.find(
    (node) =>
      node.props.testID === testID &&
      typeof node.props.onLayout === "function",
  );
  act(() => {
    root.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
    });
  });
  await act(async () => {
    jest.advanceTimersByTime(SKIPPABLE_AFTER_MS);
  });
  await act(async () => {});
  return { renderer, onUncover, onDone };
}

describe("Collectible reveals after a win", () => {
  test.each(REVEALS)(
    "%s can be skipped a second in, for the price of an attention span",
    async (_name, testID, render) => {
      const { renderer, onUncover, onDone } = await openReveal(testID, render);

      const skip = button(renderer);
      expect(skip).not.toBeNull();
      // Still animating, so it is Skip, and it can be pressed.
      expect(skip!.text).toBe("Skip");
      expect(skip!.disabled).toBe(false);
      expect(skipBox(renderer)).toBeNull();

      // Pressing it doesn't leave: it asks.
      skip!.press();
      expect(onDone).not.toHaveBeenCalled();
      const box = skipBox(renderer);
      expect(box).not.toBeNull();

      // Dropped short of the bin, nothing happens.
      await box!.dragShort();
      act(() => {
        jest.advanceTimersByTime(DROP_MS);
      });
      expect(onDone).not.toHaveBeenCalled();
      expect(skipBox(renderer)).not.toBeNull();

      // Into the bin, and the reveal closes.
      await box!.dragIntoBin();
      act(() => {
        jest.advanceTimersByTime(DROP_MS);
      });
      // It can't be pressed again while it closes, and the box is gone.
      expect(button(renderer)!.disabled).toBe(true);
      expect(skipBox(renderer)).toBeNull();
      act(() => {
        jest.advanceTimersByTime(EXIT_TOTAL_MS);
      });
      // The win box is uncovered, then given back, once.
      expect(onUncover).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledTimes(1);
      act(() => renderer.unmount());
    },
  );

  test("the skip box can be put away: by its cross, or by Skip again", async () => {
    const [, testID, render] = REVEALS[0];
    const { renderer, onDone } = await openReveal(testID, render);

    button(renderer)!.press();
    expect(skipBox(renderer)).not.toBeNull();
    skipBox(renderer)!.keepWatching();
    expect(skipBox(renderer)).toBeNull();

    button(renderer)!.press();
    expect(skipBox(renderer)).not.toBeNull();
    button(renderer)!.press();
    expect(skipBox(renderer)).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  test("once the page is read, Continue leaves at once and the box is gone", async () => {
    const [, testID, render] = REVEALS[0];
    const { renderer, onDone } = await openReveal(testID, render);
    button(renderer)!.press();
    expect(skipBox(renderer)).not.toBeNull();

    // The chapter's page tells the reveal it has finished.
    const page = renderer.root.find(
      (node: ReactTestInstance) =>
        typeof node.type !== "string" &&
        typeof node.props.onRead === "function" &&
        node.props.chapterNumber === 1,
    );
    act(() => page.props.onRead());
    expect(skipBox(renderer)).toBeNull();
    expect(button(renderer)!.text).toBe("Continue");

    button(renderer)!.press();
    act(() => {
      jest.advanceTimersByTime(EXIT_TOTAL_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });
});
