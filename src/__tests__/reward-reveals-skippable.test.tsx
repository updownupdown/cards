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
      node.props.accessibilityRole === "button",
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

describe("Collectible reveals after a win", () => {
  test.each(REVEALS)(
    "%s can be skipped a second in, long before it has finished",
    async (_name, testID, render) => {
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

      // Exactly a second after the reveal starts.
      await act(async () => {
        jest.advanceTimersByTime(SKIPPABLE_AFTER_MS);
      });
      await act(async () => {});

      const skip = button(renderer);
      expect(skip).not.toBeNull();
      // Still animating, so it is Skip, and it can be pressed.
      expect(skip!.text).toBe("Skip");
      expect(skip!.disabled).toBe(false);
      expect(onDone).not.toHaveBeenCalled();

      skip!.press();
      // It can't be pressed twice while it closes.
      expect(button(renderer)!.disabled).toBe(true);
      act(() => {
        jest.advanceTimersByTime(EXIT_TOTAL_MS);
      });
      // The win box is uncovered, then given back, once.
      expect(onUncover).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledTimes(1);
      act(() => renderer.unmount());
    },
  );
});
