import React from "react";
import { Animated, View } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { GameWrapper } from "@/components/common/GameWrapper";
import {
  recordAttempt,
  recordResult,
  undoRecordedLoss,
} from "@/data/game-menu";

jest.unmock("@/components/common/GameWrapper");

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/test-game",
}));

jest.mock("@/data/game-menu", () => ({
  clearLastGameSession: jest.fn().mockResolvedValue(undefined),
  normalizeGamePath: (pathname: string) => pathname,
  getGameInfo: () => ({
    title: "Test Game",
    gameColorDark: "#111111",
    gameColorPale: "#ffffff",
  }),
  recordAttempt: jest.fn().mockResolvedValue(undefined),
  recordResult: jest.fn().mockResolvedValue(undefined),
  undoRecordedLoss: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/hooks/useGameSettings", () => ({
  useGameSettings: () => ({
    settings: {
      stats: { attempts: 1, wins: 1, losses: 0, highestScore: null },
    },
    isLoading: false,
  }),
}));

let mockSessionId = "session-1";
jest.mock("@/hooks/useStateManager", () => ({
  getActiveGameSessionId: () => mockSessionId,
}));

let mockShowAnimations = true;
function mockUseFade() {
  return { isRendered: false, opacity: new Animated.Value(1) };
}

function mockBackgroundAnimation() {
  return <View testID="background-animation" />;
}

jest.mock("@/hooks/useGlobalSettings", () => ({
  useGlobalSettings: () => ({
    settings: { showAnimations: mockShowAnimations },
  }),
}));

jest.mock("@/hooks/useViewportDimensions", () => ({
  useViewportDimensions: () => ({ width: 390, height: 844 }),
}));

jest.mock("@/hooks/useResponsiveLayout", () => ({
  useResponsiveUiLayoutFromWidth: () => ({
    scale: 1,
    contentMaxWidth: 420,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/hooks/useFade", () => ({ useFade: mockUseFade }));

jest.mock("@/animations/BackgroundAnimation", () => ({
  BackgroundAnimation: mockBackgroundAnimation,
}));

jest.mock("@/components/common/LoadingOverlay", () => ({
  LoadingOverlay: () => null,
}));
const mockWinLoseBox = jest.fn((_props: any) => null);
jest.mock("@/components/common/WinLoseBox", () => ({
  WinLoseBox: (props: any) => mockWinLoseBox(props),
}));
jest.mock("@/components/common/TipsBox", () => ({ TipsBox: () => null }));
jest.mock("@/components/common/ResetButton", () => ({
  ResetButton: () => null,
}));
jest.mock("@/components/Modals/GameModal", () => () => null);
jest.mock("@/components/Modals/RulesModal", () => ({
  RulesModal: () => null,
}));
const mockButton = jest.fn((_props: any) => null);
jest.mock("@/components/Button/Button", () => ({
  Button: (props: any) => mockButton(props),
}));

const mockRecordAttempt = jest.mocked(recordAttempt);
const mockRecordResult = jest.mocked(recordResult);
const mockUndoRecordedLoss = jest.mocked(undoRecordedLoss);

describe("GameWrapper result recording", () => {
  beforeEach(() => {
    mockSessionId = "session-1";
    mockShowAnimations = true;
    mockRecordAttempt.mockClear();
    mockRecordResult.mockClear();
    mockUndoRecordedLoss.mockClear();
    mockWinLoseBox.mockClear();
    mockButton.mockClear();
  });

  test("records each result once when ended transitions to true", async () => {
    const reset = jest.fn();
    const view = await render(
      <GameWrapper outcome="playing" reset={reset} score={10}>
        <View />
      </GameWrapper>,
    );

    expect(mockRecordAttempt).toHaveBeenCalledTimes(1);
    expect(mockRecordAttempt).toHaveBeenCalledWith("/test-game");
    expect(mockRecordResult).not.toHaveBeenCalled();

    await view.rerender(
      <GameWrapper outcome="won" reset={reset} score={42}>
        <View />
      </GameWrapper>,
    );
    expect(mockRecordResult).toHaveBeenCalledWith(
      "/test-game",
      true,
      42,
      "session-1",
    );

    await view.rerender(
      <GameWrapper outcome="lost" reset={reset} score={99}>
        <View />
      </GameWrapper>,
    );
    expect(mockRecordResult).toHaveBeenCalledTimes(1);

    await view.rerender(
      <GameWrapper outcome="playing" reset={reset} score={99}>
        <View />
      </GameWrapper>,
    );
    mockSessionId = "session-2";
    await view.rerender(
      <GameWrapper outcome="lost" reset={reset} score={25}>
        <View />
      </GameWrapper>,
    );

    expect(mockRecordResult).toHaveBeenCalledTimes(2);
    expect(mockRecordResult).toHaveBeenLastCalledWith(
      "/test-game",
      false,
      25,
      "session-2",
    );
    expect(mockRecordAttempt).toHaveBeenCalledTimes(1);
  });

  test("does not record an already-ended restored game", async () => {
    await render(
      <GameWrapper outcome="won" reset={jest.fn()} score={42}>
        <View />
      </GameWrapper>,
    );

    expect(mockRecordResult).not.toHaveBeenCalled();
  });

  test("undoes a recorded loss before restoring game state", async () => {
    const undo = jest.fn();
    const view = await render(
      <GameWrapper outcome="playing" reset={jest.fn()} canUndo undo={undo}>
        <View />
      </GameWrapper>,
    );
    await view.rerender(
      <GameWrapper outcome="lost" reset={jest.fn()} canUndo undo={undo}>
        <View />
      </GameWrapper>,
    );

    const overlayProps = mockWinLoseBox.mock.calls.at(-1)![0];
    await overlayProps.handleUndo();

    expect(mockUndoRecordedLoss).toHaveBeenCalledWith(
      "/test-game",
      "session-1",
    );
    expect(undo).toHaveBeenCalledTimes(1);
  });

  test("does not support undo after a win", async () => {
    await render(
      <GameWrapper outcome="won" reset={jest.fn()} canUndo undo={jest.fn()}>
        <View />
      </GameWrapper>,
    );

    const overlayProps = mockWinLoseBox.mock.calls.at(-1)![0];
    const headerUndoProps = mockButton.mock.calls
      .map(([props]) => props)
      .find((props) => props.iconName === "undo")!;

    expect(overlayProps.handleUndo).toBeUndefined();
    expect(headerUndoProps.disabled).toBe(true);
  });

  test("does not render background animations when disabled", async () => {
    mockShowAnimations = false;
    const view = await render(
      <GameWrapper outcome="playing" reset={jest.fn()}>
        <View />
      </GameWrapper>,
    );

    expect(screen.queryByTestId("background-animation")).toBeNull();
    await view.unmount();
  });
});
