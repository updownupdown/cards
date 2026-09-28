import { ChapterText } from "@/components/TaoCollection/ChapterText";
import { fullDustCount } from "@/components/TaoCollection/figure";
import {
  STAR_TINTS,
  starTints,
  TINTED_SHARE,
} from "@/components/TaoReveal/timeline";
import { TAO_CHAPTER_COUNT } from "@/data/collectibles";
import { getTaoConstellation } from "@/data/tao-constellations";
import { describe, expect, jest, test } from "@jest/globals";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

describe("Tao collection geometry", () => {
  test("every chapter's figure has its minor stars", () => {
    for (let chapter = 1; chapter <= TAO_CHAPTER_COUNT; chapter++) {
      const constellation = getTaoConstellation(chapter)!;
      expect(fullDustCount(constellation)).toBeGreaterThan(0);
    }
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

  test("the colours stay pale, like real stars", () => {
    for (const hex of STAR_TINTS) {
      const channels = [1, 3, 5].map((at) =>
        parseInt(hex.slice(at, at + 2), 16),
      );
      expect(Math.min(...channels)).toBeGreaterThanOrEqual(0x88);
    }
  });
});

// --- Chapter text ---

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
