import React, { forwardRef as mockForwardRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import Home from "@/components/Home/Home";
import { setActiveHomeTab } from "@/components/Home/home-view-state";

const mockUseHomeData = jest.fn();
const mockUpdateSettings = jest.fn();
const mockScrollTo = jest.fn();
function mockGestureHandlerScrollView(props: any, ref: any) {
  React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
  return React.createElement(ScrollView, props, props.children);
}

function mockHomeHeader({ onOpenSettings }: any) {
  return React.createElement(
    View,
    null,
    React.createElement(
      Pressable,
      { testID: "open-settings", onPress: onOpenSettings },
      React.createElement(Text, null, "Settings"),
    ),
  );
}

function mockHomeTabBar({ activeIndex, onSelectTab }: any) {
  return React.createElement(
    View,
    null,
    React.createElement(Text, { testID: "active-tab" }, activeIndex),
    React.createElement(Pressable, {
      testID: "select-stats",
      onPress: () => onSelectTab(4),
    }),
  );
}

function mockHomeModal({ onClose, onHomeDataInvalidated }: any) {
  return React.createElement(
    View,
    { testID: "home-modal" },
    React.createElement(
      Pressable,
      { testID: "invalidate-home", onPress: onHomeDataInvalidated },
      React.createElement(Text, null, "Invalidate"),
    ),
    React.createElement(Pressable, {
      testID: "close-home-modal",
      onPress: onClose,
    }),
  );
}

jest.mock("@/hooks/useHomeData", () => ({
  useHomeData: (refreshToken: number) => mockUseHomeData(refreshToken),
}));

jest.mock("@/hooks/useGlobalSettings", () => ({
  useGlobalSettings: () => ({
    settings: { discoverCardSize: "large" },
    updateSettings: mockUpdateSettings,
  }),
}));

jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({
    ui: { contentMaxWidth: 420, gameHeaderHeight: 56 },
    spacing: (value: number) => value,
  }),
}));

jest.mock("@/hooks/useViewportDimensions", () => ({
  useViewportDimensions: () => ({ width: 420, height: 800 }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("react-native-gesture-handler", () => ({
  ScrollView: mockForwardRef(mockGestureHandlerScrollView),
}));

jest.mock("@/components/common/LoadingOverlay", () => ({
  LoadingOverlay: () => null,
}));

jest.mock("@/components/Home/HomeHeader", () => ({
  HomeHeader: mockHomeHeader,
}));

jest.mock("@/components/Home/HomeTabBar", () => ({
  HomeTabBar: mockHomeTabBar,
}));

jest.mock("@/components/Home/HomeTab", () => ({ HomeTab: () => null }));
jest.mock("@/components/Home/ExploreTab", () => ({ ExploreTab: () => null }));
jest.mock("@/components/Home/SearchTab", () => ({ SearchTab: () => null }));
jest.mock("@/components/Home/RandomTab", () => ({ RandomTab: () => null }));
jest.mock("@/components/Home/HomeCardSizeControl", () => ({
  HomeCardSizeControl: () => null,
}));
jest.mock("@/components/Home/StatsTab", () => ({ StatsTab: () => null }));

jest.mock("@/components/Modals/HomeModal", () => ({
  HomeModal: mockHomeModal,
}));

describe("Home", () => {
  beforeEach(() => {
    setActiveHomeTab(0);
    mockScrollTo.mockClear();
    mockUseHomeData.mockReset().mockReturnValue({
      favorites: new Set(),
      recentPaths: [],
      settingsMap: {},
      attemptsByPath: {},
      allEnabledGames: [],
      allEnabledGamePaths: [],
      toggleFavorite: jest.fn(),
    });
  });

  test("coordinates settings, refreshes Home data, and navigates tabs", async () => {
    const view = await render(<Home />);

    await fireEvent.press(screen.getByTestId("open-settings"));
    expect(screen.getByTestId("home-modal")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("invalidate-home"));
    expect(mockUseHomeData).toHaveBeenLastCalledWith(1);
    await fireEvent.press(screen.getByTestId("close-home-modal"));
    expect(screen.queryByTestId("home-modal")).toBeNull();

    await fireEvent.press(screen.getByTestId("select-stats"));
    expect(screen.getByTestId("active-tab").props.children).toBe(4);
    expect(mockScrollTo).toHaveBeenLastCalledWith({ x: 1680, animated: true });
    await view.unmount();
  });

  test("restores the active tab after remounting", async () => {
    let view = await render(<Home />);

    await fireEvent.press(screen.getByTestId("select-stats"));
    await view.unmount();

    view = await render(<Home />);

    expect(screen.getByTestId("active-tab").props.children).toBe(4);
    expect(mockScrollTo).toHaveBeenLastCalledWith({ x: 1680, animated: false });
    await view.unmount();
  });
});
