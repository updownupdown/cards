import { TaoCollectionModal } from "@/components/Modals/TaoCollectionModal";
import { ChapterText } from "@/components/TaoCollection/ChapterText";
import { ConstellationBloom } from "@/components/TaoCollection/ConstellationBloom";
import { figurePaths, fullDustCount } from "@/components/TaoCollection/figure";
import { adjacentChapter } from "@/components/TaoCollection/TaoChapterBar";
import { TaoChapterDetail } from "@/components/TaoCollection/TaoChapterDetail";
import {
  cameraOn,
  chapterAt,
  fitScale,
  initialScale,
  PITCH,
  TaoSky,
  type SkyArea,
} from "@/components/TaoCollection/TaoSky";
import { ConstellationFigure } from "@/components/TaoReveal/ConstellationFigure";
import {
  STAR_TINTS,
  starTints,
  TINTED_SHARE,
} from "@/components/TaoReveal/timeline";
import { TAO_CHAPTER_COUNT } from "@/data/collectibles";
import { getTaoConstellation } from "@/data/tao-constellations";
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
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import en from "@/locales/en/campaign.json";

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

const AREA: SkyArea = {
  width: 400,
  height: 800,
  left: 16,
  right: 384,
  top: 100,
  bottom: 780,
};
const GRID = 9 * PITCH;

describe("Tao collection geometry", () => {
  test("every chapter's figure draws as a handful of paths", () => {
    for (let chapter = 1; chapter <= TAO_CHAPTER_COUNT; chapter++) {
      const constellation = getTaoConstellation(chapter)!;
      const paths = figurePaths(constellation, 104, 110);
      expect(paths.lines).not.toBe("");
      expect(paths.stars.length).toBeGreaterThan(0);
      expect(paths.stars.length).toBeLessThanOrEqual(STAR_TINTS.length);
      expect(paths.dust.length).toBeGreaterThan(0);
      expect(paths.dust.length).toBeLessThanOrEqual(3);
      expect(fullDustCount(constellation)).toBeGreaterThan(0);
    }
  });

  test("the camera centres a chapter, with a cell's margin round the grid", () => {
    const spanX = GRID + 2 * PITCH;
    const worldLeft = (camera: { x: number; scale: number }) =>
      AREA.width / 2 + camera.x - (spanX * camera.scale) / 2;
    // Thanks to the margin, even a corner chapter can be centred...
    const corner = cameraOn(1, 0.8, AREA);
    expect(corner.x).toBeCloseTo(
      (AREA.left + AREA.right) / 2 -
        AREA.width / 2 -
        (1.5 * PITCH - spanX / 2) * 0.8,
    );
    // ...but zoomed out, the camera stops at the margin's edge.
    const far = cameraOn(1, 0.4, AREA);
    expect(worldLeft(far)).toBeCloseTo(AREA.left);
    const scale = 0.8;
    // A middle chapter can sit in the middle of the area.
    const middle = cameraOn(41, scale, AREA);
    expect(middle.x).toBeCloseTo((AREA.left + AREA.right) / 2 - 200);
    // Zoomed right out, the whole sky is centred whatever the chapter.
    const fit = fitScale(AREA);
    expect(cameraOn(1, fit, AREA)).toEqual(cameraOn(81, fit, AREA));
    expect(initialScale(AREA)).toBeGreaterThanOrEqual(fit);
  });

  test("a tap finds the chapter under it, and nothing off the grid", () => {
    const scale = 0.8;
    const camera = cameraOn(11, scale, AREA);
    const centreX = (AREA.left + AREA.right) / 2;
    const centreY = (AREA.top + AREA.bottom) / 2;
    expect(chapterAt(centreX, centreY, camera, AREA)).toBe(11);
    // One cell to the right, and one down.
    expect(chapterAt(centreX + PITCH * scale, centreY, camera, AREA)).toBe(12);
    expect(chapterAt(centreX, centreY + PITCH * scale, camera, AREA)).toBe(20);
    // The margin round the grid holds no chapter.
    const topLeft = cameraOn(1, scale, AREA);
    expect(chapterAt(AREA.left + 2, AREA.top + 2, topLeft, AREA)).toBeNull();
  });
});

describe("Star colours", () => {
  test("at most a quarter of any constellation's stars are coloured", () => {
    let tinted = 0;
    for (let chapter = 1; chapter <= TAO_CHAPTER_COUNT; chapter++) {
      const constellation = getTaoConstellation(chapter)!;
      const tints = starTints(constellation);
      expect(tints).toHaveLength(constellation.stars.length);
      const coloured = tints.filter((tint) => tint > 0).length;
      expect(coloured).toBeLessThanOrEqual(
        Math.floor(constellation.stars.length * TINTED_SHARE),
      );
      tints.forEach((tint) => {
        expect(tint).toBeGreaterThanOrEqual(0);
        expect(tint).toBeLessThan(STAR_TINTS.length);
      });
      tinted += coloured;
    }
    // The sky as a whole does get some colour.
    expect(tinted).toBeGreaterThan(0);
  });

  test("a chapter's colours never change", () => {
    const constellation = getTaoConstellation(7)!;
    expect(starTints(constellation)).toEqual(starTints({ ...constellation }));
  });

  test("the colours stay close to white", () => {
    for (const hex of STAR_TINTS) {
      const channels = [1, 3, 5].map((at) =>
        parseInt(hex.slice(at, at + 2), 16),
      );
      expect(Math.min(...channels)).toBeGreaterThanOrEqual(0xa0);
    }
  });
});

describe("Chapter navigation", () => {
  test("steps through collected chapters only, round the ends", () => {
    const collected = [3, 11, 40, 81];
    expect(adjacentChapter(collected, 11, 1)).toBe(40);
    expect(adjacentChapter(collected, 11, -1)).toBe(3);
    expect(adjacentChapter(collected, 81, 1)).toBe(3);
    expect(adjacentChapter(collected, 3, -1)).toBe(81);
  });

  test("a single chapter leads back to itself, and none to nothing", () => {
    expect(adjacentChapter([5], 5, 1)).toBe(5);
    expect(adjacentChapter([5], 5, -1)).toBe(5);
    expect(adjacentChapter([], 5, 1)).toBeUndefined();
  });
});

// --- The modal ------------------------------------------------------------------

/** The strings on screen, one per drawn text (host nodes only). */
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

function pressable(
  renderer: ReactTestRenderer,
  match: (node: ReactTestInstance) => boolean,
) {
  return renderer.root.find(
    (node) =>
      typeof node.type !== "string" &&
      typeof node.props.onPress === "function" &&
      match(node),
  );
}

function pressByLabel(renderer: ReactTestRenderer, label: string) {
  const button = pressable(
    renderer,
    (node) => node.props.accessibilityLabel === label,
  );
  act(() => button.props.onPress());
}

function pressByText(renderer: ReactTestRenderer, text: string) {
  const button = pressable(
    renderer,
    (node) =>
      node.props.accessibilityRole === "button" &&
      node.findAll((child) => child.props.children === text).length > 0,
  );
  act(() => button.props.onPress());
}

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

function renderModal(collected: number[], onClose = () => {}) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <TaoCollectionModal
        collectedIds={new Set(collected)}
        onClose={onClose}
      />,
    );
  });
  // The modal measures itself, then its header, before laying out the sky.
  const root = renderer.root.findAll(
    (node) => typeof node.props.onLayout === "function",
  );
  act(() => {
    root[0].props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
    });
  });
  act(() => {
    renderer.root
      .findAll((node) => typeof node.props.onLayout === "function")
      .forEach((node) =>
        node.props.onLayout({
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 90 } },
        }),
      );
  });
  // Rows of the sky mount a frame at a time, each after a render.
  for (let frame = 0; frame < 20; frame++) advance(20);
  advance(1000);
  return renderer;
}

describe("Tao collection modal", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // React Native's test setup runs frames on real timers; run them on the
    // fake clock, so the sky's rows mount as time is advanced.
    jest
      .spyOn(global, "requestAnimationFrame")
      .mockImplementation((callback) =>
        Number(setTimeout(() => callback(Date.now()), 16)),
      );
    jest
      .spyOn(global, "cancelAnimationFrame")
      .mockImplementation((id) => clearTimeout(id));
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test("with nothing collected, it explains how to collect, and shows no sky", () => {
    const renderer = renderModal([]);
    const texts = textsIn(renderer);
    expect(texts).toContain(en.tao.empty);
    expect(texts).toContain(en.tao.about);
    expect(allOf(renderer, TaoSky)).toHaveLength(0);
    expect(allOf(renderer, TaoChapterDetail)).toHaveLength(0);
  });

  test("shows all 81 chapter numbers, collected or not, and the note below", () => {
    const renderer = renderModal([1, 11]);
    const texts = textsIn(renderer);
    for (let chapter = 1; chapter <= TAO_CHAPTER_COUNT; chapter++) {
      expect(texts).toContain(String(chapter));
    }
    expect(texts).toContain(en.tao.about);
    expect(texts).not.toContain(en.tao.empty);
    expect(texts).toContain("2/81 collected chapters");
  });

  test("draws collected chapters in full, the rest as faint dust", () => {
    const renderer = renderModal([1, 11]);
    const figures = allOf(renderer, ConstellationFigure);
    expect(figures).toHaveLength(TAO_CHAPTER_COUNT);
    const full = figures
      .filter((figure) => !figure.props.dustOnly)
      .map((figure) => figure.props.constellation.chapter);
    expect(full.sort((a: number, b: number) => a - b)).toEqual([1, 11]);
    // Only those can be opened: taps elsewhere do nothing.
    const openable = oneOf(renderer, TaoSky).props.viewableIds;
    expect([...openable].sort((a: number, b: number) => a - b)).toEqual([
      1, 11,
    ]);
  });

  test("opens a chapter, steps through the collected ones and goes back", () => {
    const renderer = renderModal([1, 11, 40]);
    act(() => oneOf(renderer, TaoSky).props.onSelect(11));
    advance(1000);

    const detail = () => allOf(renderer, TaoChapterDetail);
    expect(detail()).toHaveLength(1);
    expect(detail()[0].props.chapterNumber).toBe(11);
    expect(textsIn(renderer)).toContain("Chapter 11");
    expect(allOf(renderer, ConstellationBloom)).toHaveLength(1);

    pressByLabel(renderer, en.tao.next);
    advance(1000);
    expect(detail()[0].props.chapterNumber).toBe(40);

    // Round the end, back to the first collected chapter.
    pressByLabel(renderer, en.tao.next);
    advance(1000);
    expect(detail()[0].props.chapterNumber).toBe(1);

    pressByLabel(renderer, en.tao.previous);
    advance(1000);
    expect(detail()[0].props.chapterNumber).toBe(40);

    pressByText(renderer, en.tao.viewAll);
    advance(1000);
    expect(detail()).toHaveLength(0);
    expect(oneOf(renderer, TaoSky).props.interactive).toBe(true);
  });

  test("each landing plays the chapter afresh", () => {
    const renderer = renderModal([5]);
    act(() => oneOf(renderer, TaoSky).props.onSelect(5));
    advance(1000);
    const first = allOf(renderer, ConstellationBloom)[0];

    // With one chapter, "next" lands on it again: a new drawing, not the old.
    pressByLabel(renderer, en.tao.next);
    advance(1000);
    const second = allOf(renderer, ConstellationBloom)[0];
    expect(second.props.constellation.chapter).toBe(5);
    expect(second).not.toBe(first);
  });

  test("the sky can't be panned or tapped while a chapter is open", () => {
    const renderer = renderModal([1, 11]);
    expect(oneOf(renderer, TaoSky).props.interactive).toBe(true);
    act(() => oneOf(renderer, TaoSky).props.onSelect(11));
    advance(1000);
    expect(oneOf(renderer, TaoSky).props.interactive).toBe(false);
  });

  test("the back button returns to the sky first, then closes", () => {
    const onClose = jest.fn();
    const renderer = renderModal([1, 11], onClose);
    const back = () => act(() => oneOf(renderer, Modal).props.onRequestClose());

    act(() => oneOf(renderer, TaoSky).props.onSelect(1));
    advance(1000);
    back();
    advance(1000);
    expect(allOf(renderer, TaoChapterDetail)).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();

    back();
    advance(1000);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("the close button closes it", () => {
    const onClose = jest.fn();
    const renderer = renderModal([1], onClose);
    pressByLabel(renderer, "close");
    advance(1000);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Chapter text", () => {
  test("is read out word by word", () => {
    jest.useFakeTimers();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <ChapterText
          text={"The Tao that can be told\nis not the eternal Tao."}
          fontSize={18}
          timing={{ openedAt: Date.now(), startMs: 0 }}
        />,
      );
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    const words = textsIn(renderer);
    expect(words).toEqual([
      "The",
      "Tao",
      "that",
      "can",
      "be",
      "told",
      "is",
      "not",
      "the",
      "eternal",
      "Tao.",
    ]);
    jest.useRealTimers();
  });

  test("tells when the last word has appeared", () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    act(() => {
      create(
        <ChapterText
          text="Be still."
          fontSize={18}
          timing={{ openedAt: Date.now(), startMs: 500 }}
          onDone={onDone}
        />,
      );
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
