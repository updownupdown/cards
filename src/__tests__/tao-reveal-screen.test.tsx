import { EXIT_TOTAL_MS } from "@/components/common/RewardReveal";
import { TaoReveal } from "@/components/TaoReveal/TaoReveal";
import { theme } from "@/styles/styles";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import React from "react";
import { StyleSheet, Text } from "react-native";
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

async function open(onUncover: () => void, onDone: () => void) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <TaoReveal chapter={1} onUncover={onUncover} onDone={onDone} />,
    );
  });
  const root = renderer.root.find(
    (node) =>
      node.props.testID === "tao-reveal" &&
      typeof node.props.onLayout === "function",
  );
  act(() => {
    root.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
    });
  });
  // The sky comes up, and the page opens on it (and loads what it needs).
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  await act(async () => {});
  return renderer;
}

/** The reveal's one button: its label, colours and press. */
function button(renderer: ReactTestRenderer) {
  const pressable = renderer.root.findAll(
    (node: ReactTestInstance) =>
      typeof node.type !== "string" &&
      node.props.accessibilityRole === "button",
  )[0];
  const label = pressable.findAllByType(Text)[0];
  return {
    text: String(label.props.children),
    fill: StyleSheet.flatten(pressable.props.style).backgroundColor,
    ink: StyleSheet.flatten(label.props.style).color,
    press: () => act(() => pressable.props.onPress()),
  };
}

describe("Tao reveal", () => {
  test("offers a quiet Skip while the chapter is read, which asks for an attention span", async () => {
    const onUncover = jest.fn();
    const onDone = jest.fn();
    const renderer = await open(onUncover, onDone);

    const skip = button(renderer);
    expect(skip.text).toBe("Skip");
    expect(skip.fill).toBe(theme.night);
    expect(skip.ink).toBe(theme.accent);

    // Skipping has a price: the box asks for the attention span (dragging
    // it into the bin, and the leaving, are pinned by
    // reward-reveals-skippable).
    skip.press();
    expect(onDone).not.toHaveBeenCalled();
    expect(onUncover).not.toHaveBeenCalled();
    expect(
      renderer.root.findAll(
        (node: ReactTestInstance) =>
          typeof node.type === "string" &&
          node.props.testID === "attention-span-skip",
      ),
    ).toHaveLength(1);
    act(() => renderer.unmount());
  });

  test("turns into the bright Continue once the chapter is read, which gives the win box back", async () => {
    const onUncover = jest.fn();
    const onDone = jest.fn();
    const renderer = await open(onUncover, onDone);

    // Long enough for any chapter to be read out.
    act(() => {
      jest.advanceTimersByTime(120000);
    });
    expect(onDone).not.toHaveBeenCalled();
    const next = button(renderer);
    expect(next.text).toBe("Continue");
    expect(next.fill).toBe(theme.accent);
    expect(next.ink).toBe(theme.accentInk);

    next.press();
    // A second press while it closes does nothing more.
    button(renderer).press();
    act(() => {
      jest.advanceTimersByTime(EXIT_TOTAL_MS);
    });
    expect(onUncover).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });
});
