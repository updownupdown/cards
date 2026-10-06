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
import { UfoNote } from "@/components/common/UfoNote";

jest.mock("@/hooks/useGamePath", () => ({ useGamePath: () => "/klondike" }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-linear-gradient", () => ({ LinearGradient: () => null }));

const mockToasts: string[] = [];
jest.mock("@/components/common/Toast", () => ({
  useToast: () => (message: string) => mockToasts.push(message),
}));

const mockShareWin = jest.fn<
  (share: { text: string; url: string }) => Promise<string>
>(async () => "shared");
jest.mock("@/utils/share-win", () => ({
  ...jest.requireActual<object>("@/utils/share-win"),
  shareWin: (share: { text: string; url: string }) => mockShareWin(share),
}));

beforeEach(() => {
  jest.useFakeTimers();
  mockToasts.length = 0;
  mockShareWin.mockClear();
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
        gameEnded
        headerBottom={0}
        won={won}
        title="Klondike"
        winTimes={{ timeMs: 185_000, bestMs: 92_000 }}
        score={120}
        message="All four suits are complete!"
        reset={() => {}}
        {...extra}
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
      expect.arrayContaining([
        "KLONDIKE",
        "You won!",
        "3:05",
        "TIME",
        "1:32",
        "BEST TIME",
      ]),
    );
  });

  test("the UFO's note shows above the box, apart from its message", async () => {
    const note = "The UFO helped with this one, so the win doesn't count.";
    const box = await render(true, { ufoNote: note });
    const [shownNote] = box.root.findAll((node) => node.type === UfoNote);
    expect(shownNote.props.text).toBe(note);
    const shown = texts(box);
    expect(shown).toContain(note);
    expect(shown).toContain("All four suits are complete!");
    // First in the column: above the box.
    expect(shown.indexOf(note)).toBeLessThan(shown.indexOf("You won!"));
  });

  test("no note without the UFO's help", async () => {
    expect(
      (await render(true)).root.findAll((node) => node.type === UfoNote),
    ).toHaveLength(0);
  });

  test("a loss shows no time", async () => {
    const shown = texts(await render(false));
    expect(shown).toContain("You lost.");
    expect(shown).not.toContain("3:05");
    expect(shown.some((text) => text.startsWith("Best"))).toBe(false);
  });

  test("the loss undo button hides its label and keeps its accessible name", async () => {
    const box = await render(false, { handleUndo: () => {} });
    const undoButton = box.root
      .findAll((node) => node.type === ActionButton)
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

  const shareButton = (renderer: ReactTestRenderer) =>
    renderer.root.findAll(
      (node) =>
        node.props.testID === "share-win" &&
        typeof node.props.onPress === "function",
    )[0];

  test("a win can be shared; a loss can't", async () => {
    expect(shareButton(await render(true))).toBeDefined();
    expect(shareButton(await render(false))).toBeUndefined();
  });

  test("sharing a win sends the game, its time and its page", async () => {
    const box = await render(true);
    await act(async () => {
      await shareButton(box)!.props.onPress();
    });
    expect(mockShareWin).toHaveBeenCalledWith({
      text: "I won Klondike in 3:05! Try it in Solitarius.",
      url: "https://solitarius.app/klondike",
    });
    expect(mockToasts).toEqual([]);
  });

  test("a win without a time is shared without one", async () => {
    const box = await render(true, { winTimes: null });
    await act(async () => {
      await shareButton(box)!.props.onPress();
    });
    expect(mockShareWin.mock.calls[0][0].text).toBe(
      "I won Klondike! Try it in Solitarius.",
    );
  });

  test("a win copied to the clipboard says so", async () => {
    mockShareWin.mockResolvedValueOnce("copied");
    const box = await render(true);
    await act(async () => {
      await shareButton(box)!.props.onPress();
    });
    expect(mockToasts).toEqual(["Copied to the clipboard"]);
  });

  test("disabled actions can't be pressed", async () => {
    const hidden = await render(true, { actionsDisabled: true });
    const buttons = hidden.root.findAll((node) => node.type === ActionButton);
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button.props.disabled).toBe(true);
  });
});
