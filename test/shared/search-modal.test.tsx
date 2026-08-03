import React from "react";
import { Pressable, Text, View } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SearchModal } from "@/components/Modals/SearchModal";
import { router } from "expo-router";

function mockText({ children }: any) {
  return React.createElement(Text, null, children);
}

function mockModalFull({ children }: any) {
  return React.createElement(View, null, children);
}

function mockHomeCard({ path, game, onOpen }: any) {
  return React.createElement(
    Pressable,
    { testID: `search-result-${path}`, onPress: onOpen },
    React.createElement(Text, null, game.title),
  );
}

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({
    spacing: (value: number) => value,
    font: (value: number) => value,
  }),
}));
jest.mock("@/icons", () => ({ Icon: () => null }));
jest.mock("@/components/common/Text", () => ({ Text: mockText }));
jest.mock("@/components/Modals/ModalFull", () => ({
  __esModule: true,
  default: mockModalFull,
}));
jest.mock("@/components/Home/HomeCard", () => ({ HomeCard: mockHomeCard }));

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
