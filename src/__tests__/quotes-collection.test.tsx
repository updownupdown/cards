import { CampaignWinRewardPreview } from "@/components/Campaign/CampaignWinRewardPreview";
import { QuotesCollectionModal } from "@/components/Modals/QuotesCollectionModal";
import { QuoteReveal } from "@/components/QuoteReveal/QuoteReveal";
import { QuoteGallery } from "@/components/QuotesCollection/QuoteGallery";
import { QuoteGalleryBar } from "@/components/QuotesCollection/QuoteGalleryBar";
import {
  cellLine,
  galleryAuthors,
  LINE_Y,
  PORTRAIT_FOCUS,
} from "@/components/QuotesCollection/quote-gallery";
import type { CampaignWinResult } from "@/data/campaign-progress";
import { getQuote, QUOTE_COUNT } from "@/data/collectibles";
import { QUOTE_AUTHORS, QUOTE_IDS_BY_AUTHOR } from "@/data/quote-authors";
import en from "@/locales/en/campaign.json";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import React from "react";
import { Modal } from "react-native";
import { Path } from "react-native-svg";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// The home starfield is an image with a shooting star; not needed here.
jest.mock("@/components/Home/HomeStarfieldBackground", () => ({
  HomeStarfieldBackground: () => null,
}));

jest.mock("@/components/Button/Button", () => {
  const { Pressable } =
    require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    Button: ({ onPress }: { onPress: () => void }) => (
      <Pressable accessibilityLabel="close" onPress={onPress} />
    ),
  };
});

jest.mock("@/data/games-registry", () => ({
  GAMES_DATA: { "/unlocked": { title: "Unlocked game" } },
}));

const SHAKESPEARE = "William Shakespeare";
const shakespeareIds = QUOTE_IDS_BY_AUTHOR.get(SHAKESPEARE)!;
const shakespeareIndex = QUOTE_AUTHORS.findIndex(
  (author) => author.name === SHAKESPEARE,
);

function textsIn(renderer: ReactTestRenderer) {
  return renderer.root
    .findAll(
      (node) =>
        typeof node.type === "string" &&
        ["string", "number"].includes(typeof node.props.children),
    )
    .map((node) => String(node.props.children));
}

/** Instances of a component, memoised or not. */
function allOf(renderer: ReactTestRenderer, component: unknown) {
  const inner = (component as { type?: unknown }).type;
  return renderer.root.findAll(
    (node) => node.type === component || (!!inner && node.type === inner),
  );
}

function oneOf(renderer: ReactTestRenderer, component: unknown) {
  const found = allOf(renderer, component);
  expect(found).toHaveLength(1);
  return found[0];
}

function button(renderer: ReactTestRenderer, label: string) {
  return renderer.root.find(
    (node: ReactTestInstance) =>
      typeof node.type !== "string" &&
      node.props.accessibilityRole === "button" &&
      node.props.accessibilityLabel === label,
  );
}

function press(renderer: ReactTestRenderer, label: string) {
  const target = button(renderer, label);
  act(() => target.props.onPress?.());
}

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

function layout(node: ReactTestInstance, width: number, height: number) {
  node.props.onLayout({
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });
}

function renderModal(collected: number[], onClose = () => {}) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <QuotesCollectionModal
        collectedIds={new Set(collected)}
        onClose={onClose}
      />,
    );
  });
  // The modal measures itself, then its header, before laying out the gallery.
  const withLayout = () =>
    renderer.root.findAll((node) => typeof node.props.onLayout === "function");
  act(() => layout(withLayout()[0], 400, 800));
  act(() => withLayout().forEach((node) => layout(node, 400, 90)));
  advance(3000);
  return renderer;
}

function position(renderer: ReactTestRenderer) {
  return oneOf(renderer, QuoteGallery).props.position;
}

describe("Quotes collection modal", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test("with nothing collected, it explains how to collect, with no gallery or bar", () => {
    const renderer = renderModal([]);
    const texts = textsIn(renderer);
    expect(texts).toContain(
      en.quotes.empty
        .replace("{{quotes}}", String(QUOTE_COUNT))
        .replace("{{authors}}", String(QUOTE_AUTHORS.length)),
    );
    expect(texts).toContain(en.quotes.about);
    expect(allOf(renderer, QuoteGallery)).toHaveLength(0);
    expect(allOf(renderer, QuoteGalleryBar)).toHaveLength(0);
  });

  test("shows the title, the count, and every author with their years and how many are theirs", () => {
    const renderer = renderModal([shakespeareIds[0], shakespeareIds[1]]);
    const texts = textsIn(renderer);
    expect(texts).toContain(en.quotes.title);
    expect(texts).toContain(`2/${QUOTE_COUNT} collected quotes`);
    for (const author of QUOTE_AUTHORS) expect(texts).toContain(author.name);
    expect(texts).toContain("1819–1892");
    expect(texts).toContain("c. 563–483 BC");
    expect(texts).toContain(`2/${shakespeareIds.length}`);
    expect(texts).toContain(
      `0/${QUOTE_IDS_BY_AUTHOR.get(QUOTE_AUTHORS[0].name)!.length}`,
    );
  });

  test("draws collected authors' portraits in full, and wavy lines for the rest", () => {
    const renderer = renderModal([shakespeareIds[0]]);
    const authors = galleryAuthors(new Set([shakespeareIds[0]]));
    // Each author's stretch of the line runs along the bottom of its cell.
    const lines = renderer.root
      .findAll(
        (node) =>
          node.type === Path && String(node.props.d).startsWith(`M0 ${LINE_Y}`),
      )
      .map((node) => node.props.d as string);
    expect(lines).toHaveLength(QUOTE_AUTHORS.length);
    authors.forEach((author, index) =>
      expect(lines[index]).toBe(cellLine(author)),
    );
    expect(lines[shakespeareIndex]).toContain(
      QUOTE_AUTHORS[shakespeareIndex].portrait.slice(1),
    );
  });

  test("opens on the first author collected, their portrait in view, and lists only their collected quotes", () => {
    const renderer = renderModal([shakespeareIds[0], shakespeareIds[2]]);
    expect(position(renderer)).toEqual({
      author: shakespeareIndex,
      quote: PORTRAIT_FOCUS,
    });
    const texts = textsIn(renderer);
    expect(texts).toContain(getQuote(shakespeareIds[0])!.text);
    expect(texts).toContain(getQuote(shakespeareIds[2])!.text);
    expect(texts).not.toContain(getQuote(shakespeareIds[1])!.text);
  });

  test("the bar steps down the quotes and back up to the portrait, stopping at the ends", () => {
    const renderer = renderModal([shakespeareIds[0], shakespeareIds[2]]);
    const disabled = (label: string) =>
      !!button(renderer, label).props.accessibilityState?.disabled;

    expect(disabled(en.quotes.previousQuote)).toBe(true);
    expect(disabled(en.quotes.nextQuote)).toBe(false);
    press(renderer, en.quotes.nextQuote);
    expect(position(renderer).quote).toBe(0);
    expect(disabled(en.quotes.previousQuote)).toBe(false);
    press(renderer, en.quotes.nextQuote);
    expect(position(renderer).quote).toBe(1);
    expect(disabled(en.quotes.nextQuote)).toBe(true);
    press(renderer, en.quotes.nextQuote);
    expect(position(renderer).quote).toBe(1);
    press(renderer, en.quotes.previousQuote);
    press(renderer, en.quotes.previousQuote);
    expect(position(renderer).quote).toBe(PORTRAIT_FOCUS);
  });

  test("the bar goes through every author, collected or not, round the ends", () => {
    const first = QUOTE_IDS_BY_AUTHOR.get(QUOTE_AUTHORS[0].name)![0];
    const renderer = renderModal([first]);
    expect(position(renderer).author).toBe(0);
    press(renderer, en.quotes.previousAuthor);
    expect(position(renderer)).toEqual({
      author: QUOTE_AUTHORS.length - 1,
      quote: PORTRAIT_FOCUS,
    });
    // An author with nothing collected: nowhere to go up or down.
    expect(
      button(renderer, en.quotes.nextQuote).props.accessibilityState.disabled,
    ).toBe(true);
    press(renderer, en.quotes.nextAuthor);
    expect(position(renderer).author).toBe(0);
    press(renderer, en.quotes.nextAuthor);
    expect(position(renderer).author).toBe(1);
  });

  test("swipes do what the arrows do", () => {
    const renderer = renderModal([shakespeareIds[0]]);
    const swipe = (action: string) =>
      act(() => oneOf(renderer, QuoteGallery).props.onAction(action));
    swipe("nextQuote");
    expect(position(renderer)).toEqual({ author: shakespeareIndex, quote: 0 });
    swipe("previousQuote");
    expect(position(renderer).quote).toBe(PORTRAIT_FOCUS);
    swipe("nextAuthor");
    expect(position(renderer).author).toBe(shakespeareIndex + 1);
    swipe("previousAuthor");
    expect(position(renderer).author).toBe(shakespeareIndex);
  });

  test("the close button and the back button close it", () => {
    const onClose = jest.fn();
    const renderer = renderModal([shakespeareIds[0]], onClose);
    const close = renderer.root.find(
      (node) =>
        typeof node.type !== "string" &&
        node.props.accessibilityLabel === "close",
    );
    act(() => close.props.onPress());
    advance(1000);
    expect(onClose).toHaveBeenCalledTimes(1);

    const onBack = jest.fn();
    const other = renderModal([shakespeareIds[0]], onBack);
    act(() => oneOf(other, Modal).props.onRequestClose());
    advance(1000);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("Reward announcement", () => {
  const result = (
    awardedReward: CampaignWinResult["awardedReward"],
    newlyUnlockedPaths: string[] = [],
  ): CampaignWinResult => ({
    progress: {} as CampaignWinResult["progress"],
    awardedReward,
    newlyUnlockedPaths,
    duplicate: false,
  });

  test("names a quote by its author, and the games it unlocked", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <CampaignWinRewardPreview
          result={result({ type: "quote", id: shakespeareIds[0] }, ["/unlocked"])}
        />,
      );
    });
    const texts = textsIn(renderer);
    expect(texts).toContain(`A quote by ${SHAKESPEARE}`);
    const unlocked = renderer.root.findAll(
      (node) =>
        Array.isArray(node.props.children) &&
        node.props.children.includes("Unlocked game"),
    );
    expect(unlocked).not.toHaveLength(0);
    // The quote itself is kept for the reveal.
    expect(texts).not.toContain(getQuote(shakespeareIds[0])!.text);
  });

  test("names a Tao chapter by number, and nothing when there is no reward", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <CampaignWinRewardPreview result={result({ type: "tao", id: 11 })} />,
      );
    });
    expect(textsIn(renderer)).toContain("Tao Te Ching: Chapter 11");
    act(() => {
      renderer.update(<CampaignWinRewardPreview result={result(undefined)} />);
    });
    expect(renderer.toJSON()).toBeNull();
  });
});

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
