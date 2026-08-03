import { render, screen } from "@testing-library/react-native";
import type { GameMenuInfo } from "@/data/games-data";
import { HomeTab } from "@/components/Home/HomeTab";
import { GAMES_DATA } from "@/data/games-registry";

const mockHomeCard = jest.fn((_props: any) => null);

function game(title: string) {
  return { title, tags: [] } as unknown as GameMenuInfo;
}

const mockGames = Object.fromEntries(
  Array.from({ length: 8 }, (_, index) => {
    const path = `/game-${index + 1}`;
    return [path, game(`Game ${index + 1}`)];
  }),
);

jest.mock("@/data/game-of-the-day", () => ({
  getGameOfTheDayPath: () => null,
}));
jest.mock("@/components/Home/HomeCard", () => ({
  HomeCard: (props: unknown) => mockHomeCard(props),
}));
jest.mock("@/components/Home/HomeSectionTitle", () => ({
  HomeSectionTitle: ({ title }: { title: string }) => {
    const { Text } = require("react-native");
    return <Text>{title}</Text>;
  },
}));
jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({
    ui: { contentMaxWidth: 420, isTablet: false },
    spacing: (value: number) => value,
  }),
}));
jest.mock("@/hooks/useViewportDimensions", () => ({
  useViewportDimensions: () => ({ width: 420 }),
}));

describe("HomeTab", () => {
  beforeEach(() => {
    mockHomeCard.mockClear();
    Object.assign(GAMES_DATA, mockGames);
  });

  test("renders the four most recent games separately from all favorites", async () => {
    await render(
      <HomeTab
        allEnabledGames={Object.entries(mockGames) as [string, GameMenuInfo][]}
        allEnabledGamePaths={Object.keys(mockGames)}
        favorites={new Set(Object.keys(mockGames).slice(1))}
        recentPaths={Object.keys(mockGames).slice(0, 5)}
        onToggleFavorite={jest.fn()}
        contentPaddingTop={0}
        contentPaddingBottom={0}
        onSelectTab={jest.fn()}
      />,
    );

    expect(screen.getByText("Jump Back In")).toBeTruthy();
    expect(screen.getByText("Favorites")).toBeTruthy();
    expect(mockHomeCard).toHaveBeenCalledTimes(11);
    expect(mockHomeCard.mock.calls.map(([props]) => props.path)).toEqual([
      "/game-1",
      "/game-2",
      "/game-3",
      "/game-4",
      "/game-2",
      "/game-3",
      "/game-4",
      "/game-5",
      "/game-6",
      "/game-7",
      "/game-8",
    ]);
  });
});
