import { EXIT_TOTAL_MS } from "@/components/common/RewardReveal";
import { QuoteReveal } from "@/components/QuoteReveal/QuoteReveal";
import { getQuote } from "@/data/collectibles";
import { QUOTE_IDS_BY_AUTHOR } from "@/data/quote-authors";
import { gamePalette, PaletteContext } from "@/styles/palette";
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
import { Path } from "react-native-svg";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const quoteId = QUOTE_IDS_BY_AUTHOR.get("William Shakespeare")![0];
const quote = getQuote(quoteId)!;
/** The game's own colours, which the reveal is drawn in. */
const palette = gamePalette("#223344", "#aaccee");

async function open(onUncover: () => void, onDone: () => void) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <PaletteContext.Provider value={palette}>
        <QuoteReveal
          quoteId={quoteId}
          background={1}
          overlayColor="#223344"
          onUncover={onUncover}
          onDone={onDone}
        />
      </PaletteContext.Provider>,
    );
  });
  const root = renderer.root.find(
    (node) =>
      node.props.testID === "quote-reveal" &&
      typeof node.props.onLayout === "function",
  );
  act(() => {
    root.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
    });
  });
  // The backdrop comes up, and the page opens on it.
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  await act(async () => {});
  return renderer;
}

function textsIn(renderer: ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map((node) => [node.props.children].flat().join(""));
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

describe("Quote reveal", () => {
  test("shows the quote as the Gallery does, in the game's colours, with a quiet Skip that gives the win box back", async () => {
    const onUncover = jest.fn();
    const onDone = jest.fn();
    const renderer = await open(onUncover, onDone);

    const texts = textsIn(renderer);
    expect(texts).toContain(`“${quote.text}”`);
    expect(texts).toContain(quote.source);
    expect(texts).toContain(quote.author);
    // The portrait's line is the game's accent, not the app's.
    const portrait = renderer.root.findAllByType(Path)[0];
    expect(portrait.props.stroke).toBe(palette.accent);

    const skip = button(renderer);
    expect(skip.text).toBe("Skip");
    expect(skip.fill).toBe(palette.night);
    expect(skip.ink).toBe(palette.accent);

    skip.press();
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(EXIT_TOTAL_MS);
    });
    expect(onUncover).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  test("turns Skip into the bright Continue once the author is drawn, and waits to be closed", async () => {
    const onUncover = jest.fn();
    const onDone = jest.fn();
    const renderer = await open(onUncover, onDone);

    act(() => {
      jest.advanceTimersByTime(20000);
    });
    // It never closes by itself.
    expect(onDone).not.toHaveBeenCalled();
    const next = button(renderer);
    expect(next.text).toBe("Continue");
    expect(next.fill).toBe(palette.accent);
    expect(next.ink).toBe(palette.accentInk);

    next.press();
    act(() => {
      jest.advanceTimersByTime(EXIT_TOTAL_MS);
    });
    expect(onUncover).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });
});
