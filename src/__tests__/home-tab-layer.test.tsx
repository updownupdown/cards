import { afterEach, describe, expect, jest, test } from "@jest/globals";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { TabLayer } from "@/components/Home/Home";

// A tab that isn't shown must not take clicks or focus. On the web its
// fixed-position parts (the Search tab's search box) stay on screen when it
// is moved aside, and pointerEvents "none" only reaches a view's direct
// children there, so the hidden search box took the Campaign map's Play
// button taps and kept focus inside an aria-hidden tab. Only CSS visibility
// shuts out a whole tab on the web.

afterEach(() => {
  jest.restoreAllMocks();
});

async function renderLayer(state: "shown" | "preparing" | "away") {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <TabLayer state={state} onReady={() => {}}>
        <View testID="tab-child" />
      </TabLayer>,
    );
  });
  const layer = renderer.root.findAllByType(View)[0];
  return { props: layer.props, style: StyleSheet.flatten(layer.props.style) };
}

function onWeb() {
  jest.replaceProperty(Platform, "OS", "web");
}

describe("TabLayer", () => {
  test.each(["preparing", "away"] as const)(
    "a %s tab on the web is hidden from sight, clicks and focus",
    async (state) => {
      onWeb();
      const { props, style } = await renderLayer(state);
      expect((style as Record<string, unknown>).visibility).toBe("hidden");
      expect(style.pointerEvents).toBe("none");
      expect(props["aria-hidden"]).toBe(true);
    },
  );

  test("the shown tab on the web is visible and takes clicks", async () => {
    onWeb();
    const { props, style } = await renderLayer("shown");
    expect((style as Record<string, unknown>).visibility).toBeUndefined();
    expect(style.pointerEvents).toBe("box-none");
    expect(props["aria-hidden"]).toBe(false);
  });

  test("a tab moved away on a phone is only moved, not hidden", async () => {
    const { style } = await renderLayer("away");
    expect((style as Record<string, unknown>).visibility).toBeUndefined();
    expect(style.left).toBeGreaterThan(0);
  });
});
