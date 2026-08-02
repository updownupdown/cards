import { fireEvent, render, screen } from "@testing-library/react-native";
import { HomeModal } from "@/components/Modals/HomeModal";
import {
  clearLastGameSession,
  DEFAULT_GLOBAL_SETTINGS,
  resetAllSettings,
} from "@/data/game-menu";

const mockUpdateSettings = jest.fn();
let mockSettingsLoading = false;

jest.mock("@/hooks/useGlobalSettings", () => ({
  useGlobalSettings: () => ({
    settings: {
      discoverCardSize: "large",
      dismissHomeInstallPrompt: false,
      resumeLastGame: true,
    },
    updateSettings: mockUpdateSettings,
    isLoading: mockSettingsLoading,
  }),
}));

jest.mock("@/data/game-menu", () => ({
  clearLastGameSession: jest.fn(),
  resetAllSettings: jest.fn(),
  DEFAULT_GLOBAL_SETTINGS: {
    discoverCardSize: "large",
    dismissHomeInstallPrompt: false,
    resumeLastGame: true,
  },
}));

jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({ spacing: (value: number) => value }),
}));
jest.mock("@/styles/modalStyles", () => ({ useModalStyles: () => ({}) }));
jest.mock("@/styles/flexStyles", () => ({ flexStyles: {} }));
jest.mock("@/components/common/AddToHomeScreenNotice", () => ({
  AddToHomeScreenNotice: () => null,
}));
jest.mock("@/components/Modals/GameCreators", () => ({
  GameCreators: () => null,
}));
jest.mock("@/components/common/Text", () => ({ Text: () => null }));

jest.mock("@/components/Modals/ModalFull", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  return {
    __esModule: true,
    default: ({ onClose, children }: any) =>
      React.createElement(
        View,
        { testID: "home-settings-modal" },
        React.createElement(Pressable, {
          testID: "close-home-settings",
          onPress: onClose,
        }),
        children,
      ),
  };
});

jest.mock("@/components/common/SettingControl", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return {
    SettingControl: ({ onChange }: any) =>
      React.createElement(Pressable, {
        testID: "resume-setting",
        onPress: () => onChange(false),
      }),
  };
});

jest.mock("@/components/Button/Button", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    Button: ({ text, onPress, disabled }: any) =>
      React.createElement(
        Pressable,
        { testID: `button-${text}`, onPress, disabled },
        React.createElement(Text, null, text),
      ),
  };
});

const mockClearLastGameSession = jest.mocked(clearLastGameSession);
const mockResetAllSettings = jest.mocked(resetAllSettings);

describe("HomeModal", () => {
  beforeEach(() => {
    mockSettingsLoading = false;
    mockUpdateSettings.mockReset().mockResolvedValue(undefined);
    mockClearLastGameSession.mockReset().mockResolvedValue(undefined);
    mockResetAllSettings.mockReset().mockResolvedValue(undefined);
  });

  test("renders nothing while settings load", async () => {
    mockSettingsLoading = true;
    const view = await render(
      <HomeModal onClose={jest.fn()} onHomeDataInvalidated={jest.fn()} />,
    );

    expect(screen.queryByTestId("home-settings-modal")).toBeNull();
    await view.unmount();
  });

  test("disabling resume clears the saved session and close refreshes Home", async () => {
    const onClose = jest.fn();
    const onHomeDataInvalidated = jest.fn();
    const view = await render(
      <HomeModal
        onClose={onClose}
        onHomeDataInvalidated={onHomeDataInvalidated}
      />,
    );

    await fireEvent.press(screen.getByTestId("resume-setting"));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ resumeLastGame: false });
    expect(mockClearLastGameSession).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId("close-home-settings"));
    expect(onHomeDataInvalidated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    await view.unmount();
  });

  test("confirms a full reset and invalidates Home data", async () => {
    const onHomeDataInvalidated = jest.fn();
    const view = await render(
      <HomeModal
        onClose={jest.fn()}
        onHomeDataInvalidated={onHomeDataInvalidated}
      />,
    );

    await fireEvent.press(screen.getByTestId("button-Reset all game data"));
    expect(screen.getByTestId("button-Confirm reset")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("button-Confirm reset"));

    expect(mockUpdateSettings).toHaveBeenCalledWith(DEFAULT_GLOBAL_SETTINGS);
    expect(mockResetAllSettings).toHaveBeenCalledTimes(1);
    expect(onHomeDataInvalidated).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("button-Reset all game data")).toBeTruthy();
    await view.unmount();
  });
});
