import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import React from "react";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { WinLoseBox } from "@/components/common/WinLoseBox";

jest.mock("@/hooks/useGamePath", () => ({ useGamePath: () => "/klondike" }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-linear-gradient", () => ({ LinearGradient: () => null }));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

async function render(
  won: boolean,
  extra: Partial<React.ComponentProps<typeof WinLoseBox>> = {},
) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <WinLoseBox
        {...extra}
        gameEnded
        headerBottom={0}
        won={won}
        winTimes={{ timeMs: 185_000, bestMs: 92_000 }}
        score={120}
        message="All four suits are complete!"
        reset={() => {}}
      />,
    );
  });
  return renderer;
}

function texts(renderer: ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map((node) => [node.props.children].flat().join(""));
}

describe("WinLoseBox", () => {
  test("a win shows its time, with the best time under it", async () => {
    const shown = texts(await render(true));
    expect(shown).toEqual(
      expect.arrayContaining(["You won!", "3:05", "Best: 1:32"]),
    );
  });

  test("a loss shows no time", async () => {
    const shown = texts(await render(false));
    expect(shown).toContain("You lost");
    expect(shown).not.toContain("3:05");
    expect(shown.some((text) => text.startsWith("Best"))).toBe(false);
  });

  test("hidden buttons are left out, and the top panel sits above", async () => {
    const renderer = await render(true, {
      actionsHidden: true,
      topPanel: <Text>Chapter 21</Text>,
    });
    const shown = texts(renderer);
    expect(shown).toContain("Chapter 21");
    expect(shown.indexOf("Chapter 21")).toBeLessThan(shown.indexOf("You won!"));
    expect(shown).not.toContain("Play again");

    const withButtons = texts(await render(true));
    expect(withButtons).toContain("Play again");
  });
});
