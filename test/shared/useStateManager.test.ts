import { useStateManager } from "@/hooks/useStateManager";
import { act, renderHook } from "@testing-library/react-native";
import { loadLastGameSession, saveLastGameSession } from "@/data/game-menu";

let mockResumeLastGame = false;

jest.mock("expo-router", () => ({
  usePathname: () => "/test-game",
}));

jest.mock("@/hooks/useGlobalSettings", () => ({
  useGlobalSettings: () => ({
    settings: { resumeLastGame: mockResumeLastGame },
    isLoading: false,
  }),
}));

jest.mock("@/data/game-menu", () => ({
  isGamePath: () => true,
  normalizeGamePath: (pathname: string) => pathname,
  loadLastGameSession: jest.fn(),
  saveLastGameSession: jest.fn(),
}));

jest.mock("@/utils/utils", () => ({
  isLocalDevEnvironment: () => false,
}));

type TestState = { turn: number };

const mockLoadLastGameSession = jest.mocked(loadLastGameSession);
const mockSaveLastGameSession = jest.mocked(saveLastGameSession);

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useStateManager", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockResumeLastGame = false;
    mockLoadLastGameSession.mockReset().mockResolvedValue(null);
    mockSaveLastGameSession.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("runs the first deal and delays the loaded flag", async () => {
    const resetAndSetup = jest.fn().mockResolvedValue(undefined);
    const postSetupAction = jest.fn().mockResolvedValue(undefined);
    const { result, unmount } = await renderHook(() =>
      useStateManager<TestState>({
        gameStateInitial: { turn: 0 },
        resetAndSetup,
        postSetupAction,
      }),
    );

    await flushEffects();

    expect(resetAndSetup).toHaveBeenCalledTimes(1);
    expect(postSetupAction).toHaveBeenCalledTimes(1);
    expect(result.current.isSettingUp).toBe(false);
    expect(result.current.isLoaded).toBe(false);

    await act(async () => jest.advanceTimersByTimeAsync(150));
    expect(result.current.isLoaded).toBe(true);
    await unmount();
  });

  test("hydrates a matching resume session and debounces persistence", async () => {
    mockResumeLastGame = true;
    mockLoadLastGameSession.mockResolvedValue({
      version: 2,
      path: "/test-game",
      savedAt: Date.now(),
      state: { turn: 7 },
    });
    const resetAndSetup = jest.fn().mockResolvedValue(undefined);
    const { result, unmount } = await renderHook(() =>
      useStateManager<TestState>({
        gameStateInitial: { turn: 0 },
        resetAndSetup,
      }),
    );

    await flushEffects();

    expect(result.current.game).toEqual({ turn: 7 });
    expect(result.current.isSettingUp).toBe(false);
    expect(resetAndSetup).not.toHaveBeenCalled();

    await act(async () => {
      result.current.setGame((draft) => {
        draft.turn = 8;
      });
    });
    await act(async () => jest.advanceTimersByTimeAsync(349));
    expect(mockSaveLastGameSession).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(mockSaveLastGameSession).toHaveBeenCalledWith("/test-game", {
      turn: 8,
    });
    await unmount();
  });

  test("restores undo state and reset clears history and transient state", async () => {
    const resetNonGameStates = jest.fn();
    const resetAndSetup = jest.fn().mockResolvedValue(undefined);
    const { result, unmount } = await renderHook(() =>
      useStateManager<TestState>({
        gameStateInitial: { turn: 0 },
        resetAndSetup,
        resetNonGameStates,
      }),
    );
    await flushEffects();

    await act(async () => {
      result.current.saveUndoState({ turn: 0 });
      result.current.setGame({ turn: 1 });
    });
    expect(result.current.canUndo).toBe(true);

    await act(async () => result.current.undo());
    expect(result.current.game).toEqual({ turn: 0 });
    expect(result.current.canUndo).toBe(false);
    expect(resetNonGameStates).toHaveBeenCalledTimes(1);

    await act(async () => result.current.saveUndoState({ turn: 0 }));
    await act(async () => result.current.reset());
    expect(result.current.canUndo).toBe(false);
    expect(resetAndSetup).toHaveBeenCalledTimes(2);
    expect(resetNonGameStates).toHaveBeenCalledTimes(2);
    await unmount();
  });

  test("always releases the animation lock", async () => {
    const { result, unmount } = await renderHook(() =>
      useStateManager<TestState>({
        gameStateInitial: { turn: 0 },
        resetAndSetup: jest.fn().mockResolvedValue(undefined),
      }),
    );
    await flushEffects();

    await expect(
      result.current.withAnimation(async () => {
        expect(result.current.isAnimatingRef.current).toBe(true);
        throw new Error("animation failed");
      }),
    ).rejects.toThrow("animation failed");
    expect(result.current.isAnimatingRef.current).toBe(false);
    await unmount();
  });
});
