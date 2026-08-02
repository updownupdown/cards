import { fireEvent, render, screen } from "@testing-library/react-native";
import { SearchModal } from "@/components/Modals/SearchModal";
import { router } from "expo-router";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({
    spacing: (value: number) => value,
    font: (value: number) => value,
  }),
}));
jest.mock("@/icons", () => ({ Icon: () => null }));
jest.mock("@/components/common/Text", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Text: ({ children }: any) => React.createElement(Text, null, children),
  };
});
jest.mock("@/components/Modals/ModalFull", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children }: any) => React.createElement(View, null, children),
  };
});
jest.mock("@/components/Home/HomeCard", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    HomeCard: ({ path, game, onOpen }: any) =>
      React.createElement(
        Pressable,
        { testID: `search-result-${path}`, onPress: onOpen },
        React.createElement(Text, null, game.title),
      ),
  };
});

const games = [
  ["/alpha", { path: "/alpha", title: "Alpha", gameColorPale: "#ffffff" }],
  ["/alpine", { path: "/alpine", title: "Alpine", gameColorPale: "#ffffff" }],
  ["/beta", { path: "/beta", title: "Beta", gameColorPale: "#ffffff" }],
] as any;

const mockPush = jest.mocked(router.push);

describe("SearchModal", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  test("filters results and reports controlled input changes", async () => {
    const onQueryChange = jest.fn();
    const props = {
      allEnabledGames: games,
      favorites: new Set<string>(),
      onToggleFavorite: jest.fn(),
      query: "alp",
      onQueryChange,
      onClose: jest.fn(),
    };
    const view = await render(<SearchModal {...props} />);

    expect(screen.getByTestId("search-result-/alpha")).toBeTruthy();
    expect(screen.getByTestId("search-result-/alpine")).toBeTruthy();
    expect(screen.queryByTestId("search-result-/beta")).toBeNull();

    await fireEvent.changeText(screen.getByPlaceholderText("Search..."), "z");
    expect(onQueryChange).toHaveBeenCalledWith("z");

    await view.rerender(<SearchModal {...props} query="zzz" />);
    expect(screen.getByText("No games found")).toBeTruthy();
    await view.unmount();
  });

  test("uses arrow keys and submit to open the highlighted result", async () => {
    const onClose = jest.fn();
    const view = await render(
      <SearchModal
        allEnabledGames={games}
        favorites={new Set()}
        onToggleFavorite={jest.fn()}
        query="alp"
        onQueryChange={jest.fn()}
        onClose={onClose}
      />,
    );
    const input = screen.getByPlaceholderText("Search...");

    await fireEvent(input, "keyPress", { nativeEvent: { key: "ArrowDown" } });
    await fireEvent(input, "submitEditing");

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/alpine");
    await view.unmount();
  });
});
