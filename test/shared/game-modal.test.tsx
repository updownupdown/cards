import React from "react";
import { Pressable, Text, View } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import GameModal from "@/components/Modals/GameModal";

const mockUpdateSettings = jest.fn();
const mockUseGameSpecificSettings = jest.fn();
let mockNextSettingValue = "hard";
function mockModalFull({ onClose, children }: any) {
  return React.createElement(
    View,
    null,
    React.createElement(Pressable, { testID: "modal-close", onPress: onClose }),
    children,
  );
}

function mockSettingControl({ onChange }: any) {
  return React.createElement(Pressable, {
    testID: "setting-control",
    onPress: () => onChange(mockNextSettingValue),
  });
}

function mockText({ children }: any) {
  return React.createElement(Text, null, children);
}

jest.mock("expo-router", () => ({
  usePathname: () => "/lobo",
}));

jest.mock("@/hooks/useGameSettings", () => ({
  useGameSettings: () => ({
    settings: {
      isFavorite: false,
      loboMode: "easy",
      stats: { wins: 0, losses: 0, highestScore: null },
    },
    updateSettings: mockUpdateSettings,
    isLoading: false,
  }),
  useGameSpecificSettings: () => mockUseGameSpecificSettings(),
}));

jest.mock("@/data/game-menu", () => ({
  calculateWinRate: () => 0,
  normalizeGamePath: (path: string) => path,
  getGameInfo: () => ({
    title: "Lobo",
    gameColorDark: "#222222",
    gameColorPale: "#eeeeee",
  }),
}));

jest.mock("@/data/game-settings", () => ({
  getSettingApplyBehaviorText: () => "",
}));

jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({ spacing: (value: number) => value }),
}));

jest.mock("@/styles/modalStyles", () => ({
  useModalStyles: () => ({}),
}));

jest.mock("@/styles/flexStyles", () => ({ flexStyles: {} }));

jest.mock("@/styles/styles", () => ({
  Colors: { white: "#ffffff", accentBlue: "#0088ff" },
  rgba: () => "#000000",
}));

jest.mock("@/utils/utils", () => ({
  darkenHexColor: (color: string) => color,
  lightenHexColor: (color: string) => color,
}));

jest.mock("@/data/game-creators", () => ({
  CREATOR_LINKS: {},
  isValidLink: () => false,
}));

jest.mock("@/components/Modals/ModalFull", () => ({
  __esModule: true,
  default: mockModalFull,
  ModalHeading: () => null,
}));

jest.mock("@/components/common/SettingControl", () => ({
  SettingControl: mockSettingControl,
}));

jest.mock("@/components/common/Text", () => ({ Text: mockText }));

jest.mock("@/components/common/RichText", () => ({ RichText: () => null }));
jest.mock("@/components/Button/Button", () => ({ Button: () => null }));
jest.mock("@/components/Home/FavButton", () => ({ FavButton: () => null }));
jest.mock("@/components/Home/RatingBars", () => ({ RatingsBars: () => null }));

describe("GameModal reload behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNextSettingValue = "hard";
    mockUseGameSpecificSettings.mockReturnValue([
      {
        key: "loboMode",
        label: "Difficulty",
        type: "radio",
        options: [],
        applyBehavior: "next-game",
      },
    ]);
  });

  test("reloads exactly once when a changed next-game setting closes", async () => {
    const onClose = jest.fn();
    const onReloadGame = jest.fn();
    const screen = await render(
      <GameModal
        onClose={onClose}
        onReloadGame={onReloadGame}
        showRulesModal={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId("setting-control"));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ loboMode: "hard" });

    await fireEvent.press(screen.getByTestId("modal-close"));
    await fireEvent.press(screen.getByTestId("modal-close"));

    expect(onReloadGame).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onReloadGame.mock.invocationCallOrder[0]).toBeLessThan(
      onClose.mock.invocationCallOrder[0],
    );
    await screen.unmount();
  });

  test.each([
    ["immediate", "hard"],
    ["next-game", "easy"],
  ])(
    "does not reload for %s behavior with value %s",
    async (applyBehavior, value) => {
      mockNextSettingValue = value;
      mockUseGameSpecificSettings.mockReturnValue([
        {
          key: "loboMode",
          label: "Difficulty",
          type: "radio",
          options: [],
          applyBehavior,
        },
      ]);
      const onClose = jest.fn();
      const onReloadGame = jest.fn();
      const screen = await render(
        <GameModal
          onClose={onClose}
          onReloadGame={onReloadGame}
          showRulesModal={jest.fn()}
        />,
      );

      await fireEvent.press(screen.getByTestId("setting-control"));
      await fireEvent.press(screen.getByTestId("modal-close"));

      expect(onReloadGame).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
      await screen.unmount();
    },
  );
});
