import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import Home from "@/components/Home/Home";

const mockUseHomeData = jest.fn();
const mockScrollTo = jest.fn();

jest.mock("@/hooks/useHomeData", () => ({
  useHomeData: (refreshToken: number) => mockUseHomeData(refreshToken),
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

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { ScrollView } = require("react-native");
  return {
    ScrollView: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
      return React.createElement(ScrollView, props, props.children);
    }),
  };
});

jest.mock("@/components/common/LoadingOverlay", () => ({
  LoadingOverlay: () => null,
}));

jest.mock("@/components/Home/HomeHeader", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return {
    HomeHeader: ({ onOpenSearch, onOpenSettings }: any) =>
      React.createElement(
        View,
        null,
        React.createElement(
          Pressable,
          { testID: "open-search", onPress: onOpenSearch },
          React.createElement(Text, null, "Search"),
        ),
        React.createElement(
          Pressable,
          { testID: "open-settings", onPress: onOpenSettings },
          React.createElement(Text, null, "Settings"),
        ),
      ),
  };
});

jest.mock("@/components/Home/HomeTabBar", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return {
    HomeTabBar: ({ activeIndex, onSelectTab }: any) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, { testID: "active-tab" }, activeIndex),
        React.createElement(Pressable, {
          testID: "select-stats",
          onPress: () => onSelectTab(2),
        }),
      ),
  };
});

jest.mock("@/components/Home/HomeTab", () => ({ HomeTab: () => null }));
jest.mock("@/components/Home/DiscoverTab", () => ({
  DiscoverTab: () => null,
}));
jest.mock("@/components/Home/StatsTab", () => ({ StatsTab: () => null }));

jest.mock("@/components/Modals/SearchModal", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    SearchModal: ({ onClose }: any) =>
      React.createElement(
        Pressable,
        { testID: "search-modal", onPress: onClose },
        React.createElement(Text, null, "Search modal"),
      ),
  };
});

jest.mock("@/components/Modals/HomeModal", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return {
    HomeModal: ({ onClose, onHomeDataInvalidated }: any) =>
      React.createElement(
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
      ),
  };
});

describe("Home", () => {
  beforeEach(() => {
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

  test("coordinates modals, refreshes Home data, and navigates tabs", async () => {
    const view = await render(<Home />);

    await fireEvent.press(screen.getByTestId("open-search"));
    expect(screen.getByTestId("search-modal")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("search-modal"));
    expect(screen.queryByTestId("search-modal")).toBeNull();

    await fireEvent.press(screen.getByTestId("open-settings"));
    expect(screen.getByTestId("home-modal")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("invalidate-home"));
    expect(mockUseHomeData).toHaveBeenLastCalledWith(1);
    await fireEvent.press(screen.getByTestId("close-home-modal"));
    expect(screen.queryByTestId("home-modal")).toBeNull();

    await fireEvent.press(screen.getByTestId("select-stats"));
    expect(screen.getByTestId("active-tab").props.children).toBe(2);
    expect(mockScrollTo).toHaveBeenLastCalledWith({ x: 840, animated: true });
    await view.unmount();
  });
});
