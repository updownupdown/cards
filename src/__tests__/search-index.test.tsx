import { describe, expect, jest, test } from "@jest/globals";
import React from "react";
import { StyleSheet, View } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StickyIndexLetters } from "@/components/Home/SearchTab";
import type { HomeGameEntry } from "@/hooks/useHomeData";

jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({
    spacing: (value: number) => value,
    font: (value: number) => value,
    ui: { contentMaxWidth: 420 },
  }),
}));

const games = (count: number) =>
  Array.from(
    { length: count },
    () => ["/game", {}] as unknown as HomeGameEntry,
  );

function render(sections: { key: string; data: HomeGameEntry[] }[]) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<StickyIndexLetters sections={sections} />);
  });
  return renderer;
}

const boxStyle = (renderer: ReactTestRenderer, key: string) =>
  StyleSheet.flatten(
    renderer.root.find(
      (node) => node.type === View && node.props.testID === `index ${key}`,
    ).props.style,
  );

describe("Search index on the web", () => {
  test("each letter's box spans its section's rows", () => {
    const renderer = render([
      { key: "A", data: games(6) },
      { key: "B", data: games(2) },
      { key: "C", data: games(3) },
    ]);
    // Rows are 52 tall.
    expect(boxStyle(renderer, "A")).toMatchObject({ top: 0, height: 312 });
    expect(boxStyle(renderer, "B")).toMatchObject({ top: 312, height: 104 });
    expect(boxStyle(renderer, "C")).toMatchObject({ top: 416, height: 156 });
  });

  test("letters stick to the top of the list, so the browser scrolls them", () => {
    const renderer = render([{ key: "A", data: games(3) }]);
    const box = renderer.root.find(
      (node) => node.type === View && node.props.testID === "index A",
    );
    const letter = box.findAll((node) => node.type === View)[1];
    expect(StyleSheet.flatten(letter.props.style)).toMatchObject({
      position: "sticky",
      top: 0,
    });
  });

  test("the index takes no room in the list, and lets taps through", () => {
    const renderer = render([{ key: "A", data: games(3) }]);
    const outer = renderer.root.findAll((node) => node.type === View)[0];
    expect(StyleSheet.flatten(outer.props.style)).toMatchObject({
      height: 0,
      pointerEvents: "none",
    });
  });
});
