import React from "react";
import { Animated, View } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { GameWrapper } from "@/components/common/GameWrapper";
import { recordAttempt, recordResult } from "@/data/game-menu";

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
}));

jest.mock("@/hooks/useGameSettings", () => ({
  useGameSettings: () => ({
    settings: {
      stats: { attempts: 1, wins: 1, losses: 0, highestScore: null },
    },
    isLoading: false,
  }),
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
jest.mock("@/components/common/WinLoseBox", () => ({
  WinLoseBox: () => null,
}));
jest.mock("@/components/common/TipsBox", () => ({ TipsBox: () => null }));
jest.mock("@/components/common/ResetButton", () => ({
  ResetButton: () => null,
}));
jest.mock("@/components/Modals/GameModal", () => () => null);
jest.mock("@/components/Modals/RulesModal", () => ({
  RulesModal: () => null,
}));
jest.mock("@/components/Button/Button", () => ({ Button: () => null }));

const mockRecordAttempt = jest.mocked(recordAttempt);
const mockRecordResult = jest.mocked(recordResult);

describe("GameWrapper result recording", () => {
  beforeEach(() => {
    mockShowAnimations = true;
    mockRecordAttempt.mockClear();
    mockRecordResult.mockClear();
  });

  test("records one attempt and only the first terminal result", async () => {
    const reset = jest.fn();
    const view = await render(
      <GameWrapper ended={false} won={false} reset={reset} score={10}>
        <View />
      </GameWrapper>,
    );

    expect(mockRecordAttempt).toHaveBeenCalledTimes(1);
    expect(mockRecordAttempt).toHaveBeenCalledWith("/test-game");
    expect(mockRecordResult).not.toHaveBeenCalled();

    await view.rerender(
      <GameWrapper ended won reset={reset} score={42}>
        <View />
      </GameWrapper>,
    );
    expect(mockRecordResult).toHaveBeenCalledWith("/test-game", true, 42);

    await view.rerender(
      <GameWrapper ended won={false} reset={reset} score={99}>
        <View />
      </GameWrapper>,
    );
    expect(mockRecordResult).toHaveBeenCalledTimes(1);
    expect(mockRecordAttempt).toHaveBeenCalledTimes(1);
  });

  test("does not render background animations when disabled", async () => {
    mockShowAnimations = false;
    const view = await render(
      <GameWrapper ended={false} won={false} reset={jest.fn()}>
        <View />
      </GameWrapper>,
    );

    expect(screen.queryByTestId("background-animation")).toBeNull();
    await view.unmount();
  });
});
