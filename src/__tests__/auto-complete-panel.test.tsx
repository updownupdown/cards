import { describe, expect, jest, test } from "@jest/globals";
import React from "react";
import { Animated, Text } from "react-native";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { AutoCompletePanel } from "@/components/common/AutoCompletePanel";
import { getCachedGlobalSettings } from "@/data/game-menu";

jest.mock("expo-linear-gradient", () => ({ LinearGradient: () => null }));

async function render() {
  const offer = { start: jest.fn(), dismiss: jest.fn() };
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <AutoCompletePanel
        offer={offer}
        active
        opacity={new Animated.Value(1)}
        top={0}
        backgroundColor="#1d3b2a"
        color="#cfe8d6"
        buttonTheme="#2f7a4b"
      />,
    );
  });
  return { renderer, offer };
}

function texts(renderer: ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map((node) => [node.props.children].flat().join(""));
}

/** The pressable with the given label, or around the given text. */
function pressable(renderer: ReactTestRenderer, label: string) {
  const matches = (node: ReactTestInstance) =>
    typeof node.props.onPress === "function" &&
    (node.props.accessibilityLabel === label ||
      node.findAllByType(Text).some((text) => text.props.children === label));
  return renderer.root.findAll(matches)[0];
}

async function press(renderer: ReactTestRenderer, label: string) {
  await act(async () => {
    await pressable(renderer, label).props.onPress();
  });
}

describe("AutoCompletePanel", () => {
  test("the Auto-complete button starts it", async () => {
    const { renderer, offer } = await render();
    await press(renderer, "Auto-complete");
    expect(offer.start).toHaveBeenCalledTimes(1);
    expect(offer.dismiss).not.toHaveBeenCalled();
  });

  test("the X closes it without starting", async () => {
    const { renderer, offer } = await render();
    await press(renderer, "Close");
    expect(offer.dismiss).toHaveBeenCalledTimes(1);
    expect(offer.start).not.toHaveBeenCalled();
  });

  test("the settings icon shows the choices, which change the setting and leave the panel open", async () => {
    const { renderer, offer } = await render();
    expect(texts(renderer)).not.toContain("Always");

    await press(renderer, "Auto-complete settings");
    expect(texts(renderer)).toEqual(
      expect.arrayContaining(["Ask", "Always", "Never"]),
    );

    await press(renderer, "Always");
    expect(getCachedGlobalSettings()?.autoComplete).toBe("always");
    expect(texts(renderer)).toContain("Always");
    expect(offer.start).not.toHaveBeenCalled();
    expect(offer.dismiss).not.toHaveBeenCalled();
  });
});
