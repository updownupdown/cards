import "../../jest/game-mocks";
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
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { renderGame, card } from "../../jest/game-harness";
import { BoardButtonsContext, Button } from "@/components/Button/Button";
import Baroness from "@/components/Games/Baroness";
import RogueRun from "@/components/Games/RogueRun";
import {
  MIN_LABEL_CONTRAST,
  boardButtonColors,
  contrastRatio,
} from "@/styles/button-colors";
import { Icon } from "@/icons";
import { Colors, theme } from "@/styles/styles";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

/** A rendered button's fill and the colour of its label (or icon). */
function colorsOf(button: ReactTestInstance) {
  const pressable = button.findAll(
    (node) => node.props.accessibilityRole === "button",
  )[0];
  const [label] = button.findAllByType(Text);
  return {
    fill: StyleSheet.flatten(pressable.props.style).backgroundColor as string,
    label: label
      ? (StyleSheet.flatten(label.props.style).color as string)
      : (button.findAllByType(Icon as React.ComponentType)[0].props
          .color as string),
  };
}

function renderButton(themeName: string, onBoard: boolean) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <BoardButtonsContext.Provider value={onBoard}>
        <Button text="Deal" theme={themeName} onPress={() => undefined} />
      </BoardButtonsContext.Provider>,
    );
  });
  return colorsOf(renderer.root);
}

describe("Button colours", () => {
  test("on a game's board, a button keeps the colour the game gives it", () => {
    // Baroness's Deal button: deep red, not the quiet see-through button.
    expect(renderButton("#80262e", true)).toEqual({
      fill: "#80262e",
      label: "#ffffff",
    });
    expect(renderButton("green", true).fill).toBe(
      boardButtonColors(Colors.buttonGreen).fill,
    );
  });

  test("off the board, buttons follow the app's theme", () => {
    expect(renderButton("#80262e", false).fill).not.toBe("#80262e");
    expect(renderButton("green", false)).toEqual({
      fill: theme.accent,
      label: theme.accentInk,
    });
  });

  test.each([
    ...(["red", "orange", "green", "blue", "purple", "pink"] as const).map(
      (name) => [
        name,
        Colors[
          `button${name[0].toUpperCase()}${name.slice(1)}` as keyof typeof Colors
        ],
      ],
    ),
    ["Baroness", "#80262e"],
    ["pale grey", Colors.K200],
    ["white", "#ffffff"],
    ["yellow", "#f5d442"],
  ])("labels read on %s", (_, fill) => {
    const colors = boardButtonColors(fill as string);
    expect(contrastRatio(colors.content, colors.fill)).toBeGreaterThanOrEqual(
      MIN_LABEL_CONTRAST,
    );
  });

  test("a colour white already reads on is left as it is", () => {
    expect(boardButtonColors("#80262e").fill).toBe("#80262e");
    expect(boardButtonColors(Colors.buttonRed).fill).toBe(Colors.buttonRed);
  });

  test("Rogue Run's buttons are in their colours, with readable labels", async () => {
    const renderer = await renderGame("/rogue-run", RogueRun, {
      draw: [card("2", "spades")],
      discard: [],
      roomCards: [
        card("5", "hearts"),
        card("4", "diamonds"),
        card("9", "clubs"),
        card("3", "spades"),
      ],
      roomNum: 1,
      weaponCard: card("7", "diamonds"),
      weaponUsedOn: [],
      health: 20,
      lastRoomNumRanFrom: null,
      isRunning: false,
      roomsSkipped: 0,
      ended: false,
      won: false,
    });
    const buttons = renderer.root.findAllByType(Button as React.ComponentType);
    const fills = new Set<string>();
    for (const button of buttons) {
      const { fill, label } = colorsOf(button);
      fills.add(fill);
      expect({
        text: button.props.text,
        contrast: contrastRatio(fill, label) >= MIN_LABEL_CONTRAST,
      }).toEqual({ text: button.props.text, contrast: true });
    }
    // Heal, equip, both fights and Run, each in its own colour.
    expect(fills.size).toBe(5);
  });

  test("Baroness deals from a deep red button", async () => {
    const renderer = await renderGame("/baroness", Baroness, {
      piles: Array.from({ length: 5 }, () => [card("5", "hearts")]),
      draw: [card("2", "clubs")],
      discard: [],
      ended: false,
      won: false,
    });
    const deal = renderer.root
      .findAllByType(Button as React.ComponentType)
      .find((button) => button.props.theme === "#80262e")!;
    expect(colorsOf(deal)).toEqual({ fill: "#80262e", label: "#ffffff" });
  });
});
