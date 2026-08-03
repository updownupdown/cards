import React from "react";
import { Text } from "react-native";
import { act, render, screen } from "@testing-library/react-native";
import HomeScreen from "@/app/index";
import DynamicGameRoute from "@/app/[game]";
import { loadLastGameSession } from "@/data/game-menu";
import { getGameComponentByPath } from "@/data/games-router";
import { router } from "expo-router";

let mockGameParam: string | undefined;
let mockGlobalSettings = { resumeLastGame: true };
let mockGlobalSettingsLoading = false;
let mockIsDev = false;
function mockHomeScreen() {
  return React.createElement(Text, null, "Home screen");
}

function mockRedirect({ href }: { href: string }) {
  return React.createElement(Text, { testID: "redirect" }, href);
}

jest.mock("@/components/Home/Home", () => mockHomeScreen);

jest.mock("@/hooks/useGlobalSettings", () => ({
  useGlobalSettings: () => ({
    settings: mockGlobalSettings,
    isLoading: mockGlobalSettingsLoading,
  }),
}));

jest.mock("@/utils/utils", () => ({
  isLocalDevEnvironment: () => mockIsDev,
}));

jest.mock("@/data/game-menu", () => ({
  loadLastGameSession: jest.fn(),
}));

jest.mock("@/data/games-router", () => ({
  getGameComponentByPath: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ game: mockGameParam }),
  Redirect: mockRedirect,
}));

const mockLoadLastGameSession = jest.mocked(loadLastGameSession);
const mockGetGameComponentByPath = jest.mocked(getGameComponentByPath);
const mockReplace = jest.mocked(router.replace);

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("routing", () => {
  beforeEach(() => {
    mockGameParam = undefined;
    mockGlobalSettings = { resumeLastGame: true };
    mockGlobalSettingsLoading = false;
    mockIsDev = false;
    mockLoadLastGameSession.mockReset().mockResolvedValue(null);
    mockGetGameComponentByPath.mockReset().mockReturnValue(null);
    mockReplace.mockReset();
  });

  test("resumes a saved game exactly once after global settings load", async () => {
    mockGlobalSettingsLoading = true;
    mockLoadLastGameSession.mockResolvedValue({
      version: 3,
      sessionId: "session-1",
      path: "/alpha",
      savedAt: Date.now(),
      state: { turn: 4 },
    });

    const view = await render(<HomeScreen />);
    expect(screen.getByText("Home screen")).toBeTruthy();
    expect(mockLoadLastGameSession).not.toHaveBeenCalled();

    mockGlobalSettingsLoading = false;
    await view.rerender(<HomeScreen />);
    await flushEffects();

    expect(mockLoadLastGameSession).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/alpha");

    await view.rerender(<HomeScreen />);
    await flushEffects();
    expect(mockLoadLastGameSession).toHaveBeenCalledTimes(1);
    await view.unmount();
  });

  test("does not load a resume session when disabled or in development", async () => {
    mockGlobalSettings = { resumeLastGame: false };
    const disabledView = await render(<HomeScreen />);
    await flushEffects();
    expect(mockLoadLastGameSession).not.toHaveBeenCalled();
    await disabledView.unmount();

    mockGlobalSettings = { resumeLastGame: true };
    mockIsDev = true;
    const devView = await render(<HomeScreen />);
    await flushEffects();
    expect(mockLoadLastGameSession).not.toHaveBeenCalled();
    await devView.unmount();
  });

  test("renders the component resolved for a valid dynamic route", async () => {
    mockGameParam = "alpha";
    mockGetGameComponentByPath.mockReturnValue(() => <Text>Alpha game</Text>);

    const view = await render(<DynamicGameRoute />);

    expect(screen.getByText("Alpha game")).toBeTruthy();
    expect(mockGetGameComponentByPath).toHaveBeenCalledWith("alpha");
    expect(screen.queryByTestId("redirect")).toBeNull();
    await view.unmount();
  });

  test("redirects missing and unknown dynamic routes to home", async () => {
    mockGameParam = "unknown";
    mockGetGameComponentByPath.mockReturnValue(null);

    const view = await render(<DynamicGameRoute />);
    expect(mockGetGameComponentByPath).toHaveBeenCalledWith("unknown");
    expect(screen.getByTestId("redirect").props.children).toBe("/");

    mockGameParam = undefined;
    await view.rerender(<DynamicGameRoute />);
    expect(mockGetGameComponentByPath).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("redirect").props.children).toBe("/");
    await view.unmount();
  });
});
