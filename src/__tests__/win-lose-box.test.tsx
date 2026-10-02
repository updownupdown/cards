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
import { GameCollectibleIcons } from "@/components/ui/GameCollectibleIcons";
import { ActionButton } from "@/components/ui/Nocturne";

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
        title="Klondike"
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
  test("a win shows its time, with the best time beside it", async () => {
    const shown = texts(await render(true));
    expect(shown).toEqual(
      expect.arrayContaining(["YOU WON", "3:05", "TIME", "1:32", "BEST TIME"]),
    );
  });

  test("a loss shows no time", async () => {
    const shown = texts(await render(false));
    expect(shown).toContain("YOU LOST");
    expect(shown).not.toContain("3:05");
    expect(shown.some((text) => text.startsWith("Best"))).toBe(false);
  });

  test("the loss undo button hides its label and keeps its accessible name", async () => {
    const box = await render(false, { handleUndo: () => {} });
    const undoButton = box.root
      .findAllByType(ActionButton)
      .find((button) => button.props.iconName === "undo");

    expect(undoButton?.props.label).toBe("");
    expect(undoButton?.props.accessibilityLabel).toBeTruthy();
  });

  test("campaign collectibles appear in the header and glow when newly earned", async () => {
    const rewards = [
      { type: "tao" as const, id: 1 },
      { type: "quote" as const, id: 1 },
    ];
    const box = await render(true, {
      isCampaignMode: true,
      collectibleRewards: rewards,
      collectedTaoIds: new Set([1]),
      collectedQuoteIds: new Set([1]),
      newlyEarnedReward: rewards[1],
    });
    const collectibleIcons = box.root.findAll(
      (node) => node.type === GameCollectibleIcons,
    );

    expect(collectibleIcons).toHaveLength(1);
    expect(collectibleIcons[0]?.props.rewards).toEqual(rewards);
    expect(collectibleIcons[0]?.props.glowingReward).toEqual(rewards[1]);
  });

  test("hidden actions can't be pressed", async () => {
    const hidden = await render(true, { actionsHidden: true });
    const buttons = hidden.root.findAll((node) => node.type === ActionButton);
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button.props.disabled).toBe(true);
  });
});
