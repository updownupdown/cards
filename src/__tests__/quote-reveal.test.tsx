import { QuoteReveal } from "@/components/QuoteReveal/QuoteReveal";
import { getQuote } from "@/data/collectibles";
import { QUOTE_IDS_BY_AUTHOR } from "@/data/quote-authors";
import { describe, expect, jest, test } from "@jest/globals";
import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const shakespeareIds = QUOTE_IDS_BY_AUTHOR.get("William Shakespeare")!;

function textsIn(renderer: ReactTestRenderer) {
  return renderer.root
    .findAll(
      (node) =>
        typeof node.type === "string" &&
        ["string", "number"].includes(typeof node.props.children),
    )
    .map((node) => String(node.props.children));
}

function layout(node: ReactTestInstance, width: number, height: number) {
  node.props.onLayout({
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });
}

describe("Quote reveal", () => {
  test("covers the game, writes the quote, names the author and source, and finishes", async () => {
    const quote = getQuote(shakespeareIds[0])!;
    const onUncover = jest.fn();
    const onDone = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <QuoteReveal
          text={quote.text}
          author={quote.author}
          source={quote.source}
          background={1}
          overlayColor="#223344"
          onUncover={onUncover}
          onDone={onDone}
        />,
      );
    });
    const root = renderer.root.find(
      (node) => node.props.testID === "quote-reveal",
    );
    // It swallows every touch, so the game is locked beneath it.
    expect(root.props.onStartShouldSetResponder()).toBe(true);
    act(() => layout(root, 400, 800));

    const texts = textsIn(renderer);
    expect(texts).toContain(quote.author);
    expect(texts).toContain(quote.source);
    // The quote is drawn, not set in type.
    expect(texts).not.toContain(quote.text);
    // Timing is left to Reanimated, which the tests run to the end at once.
    await act(async () => {});
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
