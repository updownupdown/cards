import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  canBypassToday,
  getWildCardsStatus,
  hasWildPass,
  loadWildCardsProgress,
  recordWildBypass,
  resetWildCardsProgress,
  unlockWildGame,
  WILD_BYPASS_TAPS,
  WILD_GAMES,
} from "@/data/wild-cards";
import { WILD_CARDS_STORAGE_KEY } from "@/data/storage-keys";

const mockPush = jest.fn();
const mockToast = jest.fn();
let mockWonCount = 0;

// The locking itself, as it will ship (WILD_CARDS_LOCKED is off for now).
jest.mock("@/data/wild-cards", () => ({
  ...(jest.requireActual("@/data/wild-cards") as object),
  WILD_CARDS_LOCKED: true,
}));

jest.mock("expo-router", () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock("@/components/common/Toast", () => ({
  useToast: () => (message: string) => mockToast(message),
}));

jest.mock("@/hooks/useCampaignProgress", () => ({
  useCampaignProgress: () => ({
    wonPaths: new Set(Array.from({ length: mockWonCount }, (_, i) => `/game${i}`)),
    isLoading: false,
  }),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPush.mockClear();
  mockToast.mockClear();
});

describe("Wild Cards credits", () => {
  test("every ten campaign wins buy one game", () => {
    expect(getWildCardsStatus(0, 0)).toEqual({ credits: 0, winsNeeded: 10, allUnlocked: false });
    expect(getWildCardsStatus(5, 0)).toEqual({ credits: 0, winsNeeded: 5, allUnlocked: false });
    // 32 wins with one game unlocked: two more to spend.
    expect(getWildCardsStatus(32, 1)).toEqual({ credits: 2, winsNeeded: 0, allUnlocked: false });
    expect(getWildCardsStatus(25, 2)).toEqual({ credits: 0, winsNeeded: 5, allUnlocked: false });
  });

  test("with every game unlocked, nothing more is owed or counted", () => {
    const all = WILD_GAMES.length;
    expect(getWildCardsStatus(200, all)).toEqual({ credits: 0, winsNeeded: 0, allUnlocked: true });
    // Never more credits than games left to unlock.
    expect(getWildCardsStatus(200, all - 1).credits).toBe(1);
  });
});

describe("Wild Cards progress", () => {
  test("unlocks are saved and never lost, except by a reset", async () => {
    await unlockWildGame("hat-trick");
    await unlockWildGame("hat-trick");
    expect((await loadWildCardsProgress()).unlockedIds).toEqual(["hat-trick"]);
    await resetWildCardsProgress();
    expect((await loadWildCardsProgress()).unlockedIds).toEqual([]);
  });

  test("a locked game can be played once a day", async () => {
    const today = new Date(2026, 8, 30, 10);
    const tomorrow = new Date(2026, 9, 1, 9);
    expect(canBypassToday(await loadWildCardsProgress(), "architect", today)).toBe(true);
    await recordWildBypass("architect", today);
    const progress = await loadWildCardsProgress();
    expect(canBypassToday(progress, "architect", today)).toBe(false);
    expect(canBypassToday(progress, "shuffleboard", today)).toBe(true);
    expect(canBypassToday(progress, "architect", tomorrow)).toBe(true);
  });

  test("a damaged save loads as empty, and unknown games are dropped", async () => {
    await AsyncStorage.setItem(WILD_CARDS_STORAGE_KEY, "{not json");
    expect((await loadWildCardsProgress()).unlockedIds).toEqual([]);
    await AsyncStorage.setItem(
      WILD_CARDS_STORAGE_KEY,
      JSON.stringify({ unlockedIds: ["architect", "pinball"], bypassDay: 3 }),
    );
    expect(await loadWildCardsProgress()).toEqual({
      unlockedIds: ["architect"],
      bypassDay: "",
      bypassedIds: [],
    });
  });
});

describe("Wild Cards shelf", () => {
  // Imported late, after the mocks above are in place.
  const { WildCardsSection } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@/components/Home/WildCardsSection") as typeof import("@/components/Home/WildCardsSection");

  let mounted: ReactTestRenderer | null = null;
  afterEach(() => {
    act(() => mounted?.unmount());
    mounted = null;
  });

  async function render() {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <WildCardsSection shelfPadding={20} pageSidePadding={20} contentMaxWidth={600} />,
      );
    });
    mounted = renderer;
    return renderer;
  }

  const tile = (renderer: ReactTestRenderer, title: string) =>
    renderer.root.find(
      (node) =>
        typeof node.props.accessibilityLabel === "string" &&
        node.props.accessibilityLabel.startsWith(title) &&
        typeof node.props.onPress === "function",
    );

  const texts = (renderer: ReactTestRenderer) =>
    renderer.root
      .findAll((node) => typeof node.props.children === "string")
      .map((node) => node.props.children as string);

  const tap = async (renderer: ReactTestRenderer, title: string, times = 1) => {
    for (let i = 0; i < times; i++) {
      await act(async () => {
        tile(renderer, title).props.onPress();
        // Saving is asynchronous: let it finish.
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
  };

  test("with too few wins, it says how many more are needed", async () => {
    mockWonCount = 4;
    const renderer = await render();
    expect(texts(renderer)).toContain("0 of 6 unlocked");
    expect(texts(renderer)).toContain("6 more wins needed to unlock the next game");
  });

  test("a credit is spent by tapping a locked game, which then opens", async () => {
    mockWonCount = 32;
    const renderer = await render();
    expect(texts(renderer)).toContain("Tap a game to unlock! (3 credits left)");
    await tap(renderer, "Hat Trick");
    expect((await loadWildCardsProgress()).unlockedIds).toEqual(["hat-trick"]);
    expect(texts(renderer)).toContain("Tap a game to unlock! (2 credits left)");
    expect(mockPush).not.toHaveBeenCalled();
    await tap(renderer, "Hat Trick");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/wild/[game]",
      params: { game: "hat-trick" },
    });
  });

  test("twelve taps on a locked game open it once; the next time, not today", async () => {
    mockWonCount = 0;
    const renderer = await render();
    await tap(renderer, "Architect", WILD_BYPASS_TAPS - 1);
    expect(mockPush).not.toHaveBeenCalled();
    await tap(renderer, "Architect");
    expect(mockToast).toHaveBeenCalledWith("Fine, just this once.");
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(hasWildPass("architect")).toBe(true);

    await tap(renderer, "Architect", WILD_BYPASS_TAPS);
    expect(mockToast).toHaveBeenLastCalledWith("Not today!");
    expect(mockPush).toHaveBeenCalledTimes(1);
    // Still locked.
    expect((await loadWildCardsProgress()).unlockedIds).toEqual([]);
  });

  test("once all are unlocked, no count of wins is shown", async () => {
    mockWonCount = 80;
    for (const game of WILD_GAMES) await unlockWildGame(game.id);
    const renderer = await render();
    expect(texts(renderer)).toContain("6 of 6 unlocked");
    expect(texts(renderer).some((text) => text.includes("needed"))).toBe(false);
    expect(texts(renderer).some((text) => text.includes("credit"))).toBe(false);
  });
});
