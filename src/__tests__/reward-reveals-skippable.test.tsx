import {
  EXIT_TOTAL_MS,
  HOLD_TO_SKIP_MS,
} from "@/components/common/RewardReveal";
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
      node.props.accessibilityRole === "button" &&
      node.props.accessibilityLabel === undefined,
  )[0];
  if (!pressable) return null;
  return {
    text: String(pressable.findAllByType(Text)[0].props.children),
    disabled: !!pressable.props.disabled,
    // As a touch would: a disabled button isn't pressed, and a press is
    // a touch down, then up (when it lets go, it also counts as a press).
    pressIn: () =>
      act(() => {
        if (!pressable.props.disabled) pressable.props.onPressIn?.();
      }),
    pressOut: () =>
      act(() => {
        if (!pressable.props.disabled) pressable.props.onPressOut?.();
      }),
    press: () =>
      act(() => {
        if (pressable.props.disabled) return;
        pressable.props.onPressIn?.();
        pressable.props.onPressOut?.();
        pressable.props.onPress();
      }),
  };
}

const wait = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

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
      node.props.testID === testID && typeof node.props.onLayout === "function",
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
    "%s can be skipped a second in, by holding Hold to skip",
    async (_name, testID, render) => {
      const { renderer, onUncover, onDone } = await openReveal(testID, render);

      const skip = button(renderer);
      expect(skip).not.toBeNull();
      // Still animating, so it is Hold to skip, and it can be pressed.
      expect(skip!.text).toBe("Hold to skip");
      expect(skip!.disabled).toBe(false);
      // The dark that comes over the page as it's held is there, unseen.
      expect(
        renderer.root.findAll(
          (node: ReactTestInstance) =>
            typeof node.type === "string" && node.props.testID === "reveal-dim",
        ),
      ).toHaveLength(1);

      // A tap doesn't leave.
      skip!.press();
      wait(300);
      expect(onDone).not.toHaveBeenCalled();

      // Nor does letting go before the end.
      skip!.pressIn();
      wait(HOLD_TO_SKIP_MS - 100);
      skip!.pressOut();
      wait(300);
      expect(onDone).not.toHaveBeenCalled();
      // (Quick, so the page is still animating and it is still the hold.)
      expect(button(renderer)!.text).toBe("Hold to skip");
      expect(button(renderer)!.disabled).toBe(false);

      // Held all the way, the reveal closes.
      skip!.pressIn();
      wait(HOLD_TO_SKIP_MS);
      // It can't be pressed again while it closes.
      expect(button(renderer)!.disabled).toBe(true);
      wait(EXIT_TOTAL_MS);
      // The win box is uncovered, then given back, once.
      expect(onUncover).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledTimes(1);
      act(() => renderer.unmount());
    },
  );

  test("a second hold picks up from where the first one drained to", async () => {
    const [, testID, render] = REVEALS[0];
    const { renderer, onDone } = await openReveal(testID, render);
    const skip = button(renderer)!;

    // Held most of the way, then let go: it drains back, but not at once.
    skip.pressIn();
    wait(HOLD_TO_SKIP_MS * 0.8);
    skip.pressOut();
    wait(100);
    // Pressed again, what's left of the first hold still counts.
    skip.pressIn();
    wait(HOLD_TO_SKIP_MS * 0.5);
    expect(button(renderer)!.disabled).toBe(true);
    wait(EXIT_TOTAL_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  test("once the page is read, Continue leaves at once and a hold under way stops", async () => {
    const [, testID, render] = REVEALS[0];
    const { renderer, onDone } = await openReveal(testID, render);
    button(renderer)!.pressIn();

    // The chapter's page tells the reveal it has finished.
    const page = renderer.root.find(
      (node: ReactTestInstance) =>
        typeof node.type !== "string" &&
        typeof node.props.onRead === "function" &&
        node.props.chapterNumber === 1,
    );
    act(() => page.props.onRead());
    expect(button(renderer)!.text).toBe("Continue");
    // The hold is let go of: it doesn't close the reveal by itself.
    wait(HOLD_TO_SKIP_MS);
    expect(onDone).not.toHaveBeenCalled();

    button(renderer)!.press();
    wait(EXIT_TOTAL_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });
});
