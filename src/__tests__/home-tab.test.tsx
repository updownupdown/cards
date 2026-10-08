import { launchGame } from "@/components/common/GameLaunchOverlay";
import { DealMeAGame, swipeOpacity } from "@/components/Home/DealMeAGame";
import { HomeTab } from "@/components/Home/HomeTab";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { describe, expect, jest, test } from "@jest/globals";
import React from "react";
import { StyleSheet, Text } from "react-native";
import { State } from "react-native-gesture-handler";
import {
  fireGestureHandler,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";

// Mock factories are hoisted above the imports, so they can only use hoisted
// function declarations.
function mockGame(title: string, difficulty: number, tag: string) {
  return {
    title,
    tags: [tag],
    rating: { difficulty, complexity: 1 },
    gameColorDark: "#102030",
    gameColorPale: "#d0e0f0",
  };
}

// The mock leaves out layout animation config, which only needs to render.
jest.mock("react-native-reanimated", () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ...(require("react-native-reanimated/mock") as object),
  LayoutAnimationConfig: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock("@/data/games-registry", () => ({
  GAMES_DATA: {
    "/klondike": mockGame("Klondike", 2, "KlondikeFamily"),
    "/yukon": mockGame("Yukon", 3, "YukonFamily"),
    "/canfield": mockGame("Canfield", 4, "KlondikeFamily"),
    "/spider": mockGame("Spider", 5, "SpiderFamily"),
    "/golf": mockGame("Golf", 2, "Sports"),
    "/freecell": mockGame("FreeCell", 3, "FreeCellFamily"),
    "/pyramid": mockGame("Pyramid", 2, "PyramidFamily"),
  },
}));

// Stand-ins that only mark where each section sits.
jest.mock("@/components/Home/GameOfTheDaySection", () => {
  const { View } = require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  return { GameOfTheDaySection: () => <View testID="section gameOfTheDay" /> };
});

jest.mock("@/components/Home/HomeCardFact", () => ({
  HomeCardFact: () => null,
}));

jest.mock("@/hooks/useViewportDimensions", () => ({
  useViewportDimensions: () => ({ width: 420, height: 800 }),
}));

jest.mock("@/components/common/Text", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require("react-native") as typeof import("react-native");
  return {
    Text: ({ children }: { children?: React.ReactNode }) => (
      <Text>{children}</Text>
    ),
  };
});

jest.mock("@/components/Button/Button", () => {
  const { Pressable, Text } =
    require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    Button: ({ text, onPress }: { text: string; onPress: () => void }) => (
      <Pressable accessibilityLabel={`button ${text}`} onPress={onPress}>
        <Text>{text}</Text>
      </Pressable>
    ),
  };
});

jest.mock("@/components/common/GameLaunchOverlay", () => {
  const globals = require("@jest/globals") as typeof import("@jest/globals"); // eslint-disable-line @typescript-eslint/no-require-imports
  return { launchGame: globals.jest.fn() };
});

jest.mock("@/components/Home/HomeCard", () => {
  const { View } = require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    // The star is 40 wide, 12 in from the top right corner.
    homeCardStarReach: () => ({ fromRight: 52, fromTop: 52 }),
    HomeCard: ({
      path,
      size,
      campaign,
      style,
    }: {
      path: string;
      size: string;
      campaign?: boolean;
      style?: object;
    }) => (
      <View
        testID={`card ${path}`}
        accessibilityHint={`${size}${campaign ? " campaign" : ""}`}
        style={style}
      />
    ),
  };
});

// Shelves as stand-ins, one marker per card by path, like HomeCard's below.
jest.mock("@/components/Home/HomeArt", () => {
  const { View } = require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  const Shelf = ({ games }: { games: [string][] }) => (
    <View>
      {games.map(([path]) => (
        <View key={path} testID={`card ${path}`} />
      ))}
    </View>
  );
  const ShelfPlaceholder = ({ testID }: { testID: string }) => (
    <View testID={testID} />
  );
  return {
    ArtShelf: Shelf,
    ShelfPlaceholder,
    TILE_SIZE: 140,
  };
});

jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({
    spacing: (value: number) => value,
    font: (value: number) => value,
    ui: { contentMaxWidth: 420, isTablet: false },
  }),
}));

// Keys come back as-is, with options appended so interpolation is visible.
jest.mock("@/i18n", () => ({
  useDisplayLanguage: () => "en",
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key} ${JSON.stringify(options)}` : key,
  }),
}));

jest.mock("@/icons", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native") as typeof import("react-native");
  return { Icon: () => <View /> };
});

const entry = (
  path: string,
  difficulty: number,
  tag = "KlondikeFamily",
): HomeGameEntry =>
  [path, mockGame(path, difficulty, tag)] as unknown as HomeGameEntry;

/** Eleven games: two Yukon, one Sports, the rest Klondike. */
const GAMES: HomeGameEntry[] = [
  entry("/hard", 9),
  entry("/y1", 5, "YukonFamily"),
  entry("/y2", 6, "YukonFamily"),
  entry("/s1", 7, "Sports"),
  ...Array.from({ length: 7 }, (_, index) => entry(`/easy${index}`, index / 2)),
];

type HomeTabProps = React.ComponentProps<typeof HomeTab>;

function homeTabProps(overrides: Partial<HomeTabProps> = {}): HomeTabProps {
  return {
    allEnabledGames: GAMES,
    unplayedGamePaths: [],
    favorites: new Set<string>(),
    recentPaths: [],
    onToggleFavorite: jest.fn(),
    dataLoaded: true,
    contentPaddingTop: 0,
    contentPaddingBottom: 0,
    ...overrides,
  };
}

function renderHomeTab(overrides: Partial<HomeTabProps> = {}) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<HomeTab {...homeTabProps(overrides)} />);
  });
  return renderer;
}

type RenderedNode = {
  type: string;
  props: Record<string, unknown>;
  children: (RenderedNode | string)[] | null;
};

/** Section titles and stand-ins, top to bottom. */
const sections = (renderer: ReactTestRenderer) => {
  const found: string[] = [];
  const walk = (node: RenderedNode | RenderedNode[] | string | null): void => {
    if (!node || typeof node === "string") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const testID = node.props.testID;
    if (typeof testID === "string" && testID.startsWith("section ")) {
      found.push(testID.replace("section ", "sections."));
    }
    const text = (node.children ?? []).join("");
    if (node.type === "Text" && text.startsWith("sections.")) found.push(text);
    node.children?.forEach(walk);
  };
  walk(renderer.toJSON() as RenderedNode | RenderedNode[] | null);
  return found;
};

/** The placeholders standing in for an empty section. */
const placeholders = (
  renderer: ReactTestRenderer,
  section: "continue" | "favorites",
) =>
  renderer.root.findAll(
    (node) =>
      typeof node.type === "string" &&
      node.props.testID === `placeholder ${section}`,
  );

/** The paths of the cards in the section with the given title. */
const cardsUnder = (renderer: ReactTestRenderer, title: string) => {
  const isCard = (node: ReactTestInstance) =>
    typeof node.type !== "string" &&
    String(node.props.testID).startsWith("card ");
  let section = renderer.root.find(
    (node) =>
      node.type === Text &&
      React.Children.toArray(node.props.children).join("") === title,
  );
  while (section.findAll(isCard).length === 0) section = section.parent!;
  return section
    .findAll(isCard)
    .map((node) => String(node.props.testID).replace("card ", ""));
};

describe("Home tab", () => {
  test("with nothing played or favorited, offers the six easiest games first", () => {
    const renderer = renderHomeTab();
    expect(sections(renderer)).toEqual([
      "sections.easyGames",
      "sections.favorites",
      "sections.gameOfTheDay",
    ]);
    expect(cardsUnder(renderer, "sections.easyGames")).toEqual(
      Array.from({ length: 6 }, (_, index) => `/easy${index}`),
    );
  });

  test("shows none of the game sections until favorites and recent games are in", () => {
    const renderer = renderHomeTab({ dataLoaded: false });
    expect(sections(renderer)).toEqual(["sections.gameOfTheDay"]);
  });

  test("Continue is left out until a game is played; empty Favorites keep a placeholder", () => {
    const renderer = renderHomeTab();
    expect(sections(renderer)).not.toContain("sections.continue");
    expect(placeholders(renderer, "continue")).toHaveLength(0);
    expect(placeholders(renderer, "favorites")).toHaveLength(1);
  });

  test("the easy games show, above both, while either has no games", () => {
    expect(sections(renderHomeTab({ recentPaths: ["/yukon"] }))).toEqual([
      "sections.easyGames",
      "sections.continue",
      "sections.favorites",
      "sections.gameOfTheDay",
    ]);
    expect(
      sections(renderHomeTab({ favorites: new Set(["/klondike"]) })),
    ).toEqual([
      "sections.easyGames",
      "sections.favorites",
      "sections.gameOfTheDay",
    ]);
  });

  test("no easy games when both have games as Home opens", () => {
    const renderer = renderHomeTab({
      recentPaths: ["/yukon"],
      favorites: new Set(["/klondike"]),
    });
    expect(sections(renderer)).toEqual([
      "sections.continue",
      "sections.favorites",
      "sections.gameOfTheDay",
    ]);
  });

  test("sections never appear or vanish once loaded, whatever is starred", () => {
    const renderer = renderHomeTab({ recentPaths: ["/yukon"] });
    const before = sections(renderer);
    act(() =>
      renderer.update(
        <HomeTab
          {...homeTabProps({
            recentPaths: ["/yukon"],
            favorites: new Set(["/golf"]),
          })}
        />,
      ),
    );
    expect(sections(renderer)).toEqual(before);
    expect(placeholders(renderer, "favorites")).toHaveLength(0);
    // And unstarring the last one brings the placeholder back, not a gap.
    act(() =>
      renderer.update(
        <HomeTab {...homeTabProps({ recentPaths: ["/yukon"] })} />,
      ),
    );
    expect(sections(renderer)).toEqual(before);
    expect(placeholders(renderer, "favorites")).toHaveLength(1);
  });

  test("Favorites list the starred games by name, above Game of the Day", () => {
    const renderer = renderHomeTab({
      recentPaths: ["/yukon"],
      favorites: new Set(["/spider", "/canfield", "/no-such-game"]),
    });
    const order = sections(renderer);
    expect(order.indexOf("sections.favorites")).toBeLessThan(
      order.indexOf("sections.gameOfTheDay"),
    );
    expect(cardsUnder(renderer, "sections.favorites")).toEqual([
      "/canfield",
      "/spider",
    ]);
  });

  test("a game starred on Home shows under Favorites straight away", () => {
    const renderer = renderHomeTab({ recentPaths: ["/yukon"] });
    expect(placeholders(renderer, "favorites")).toHaveLength(1);
    act(() =>
      renderer.update(
        <HomeTab
          {...homeTabProps({
            recentPaths: ["/yukon"],
            favorites: new Set(["/golf"]),
          })}
        />,
      ),
    );
    expect(cardsUnder(renderer, "sections.favorites")).toEqual(["/golf"]);
  });

  test("Continue shows the six most recent games, skipping removed ones", () => {
    const renderer = renderHomeTab({
      recentPaths: [
        "/spider",
        "/no-such-game",
        "/klondike",
        "/golf",
        "/yukon",
        "/canfield",
        "/freecell",
        "/pyramid",
      ],
    });
    expect(cardsUnder(renderer, "sections.continue")).toEqual([
      "/spider",
      "/klondike",
      "/golf",
      "/yukon",
      "/canfield",
      "/freecell",
    ]);
  });
});

describe("Random Deal", () => {
  test("cards are fully opaque in the stack and fade out as they are swiped", () => {
    expect(swipeOpacity(0, 300)).toBe(1);
    expect(swipeOpacity(150, 300)).toBeCloseTo(0.5);
    expect(swipeOpacity(-150, 300)).toBeCloseTo(0.5);
    expect(swipeOpacity(300, 300)).toBe(0);
    // Flying out goes past the card's width.
    expect(swipeOpacity(-420, 300)).toBe(0);
  });

  test("stacked cards keep the home cards' usual drop shadow", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <DealMeAGame
          allEnabledGames={GAMES}
          unplayedGamePaths={[]}
          favorites={new Set()}
          onToggleFavorite={() => undefined}
          pageSidePadding={16}
          contentMaxWidth={420}
        />,
      );
    });
    // Cards wait for the stack's width.
    const stack = renderer.root.find(
      (node) =>
        typeof node.type === "string" &&
        typeof node.props.onLayout === "function",
    );
    act(() =>
      stack.props.onLayout({ nativeEvent: { layout: { width: 300 } } }),
    );

    const cards = renderer.root.findAll(
      (node) =>
        typeof node.type !== "string" &&
        String(node.props.testID).startsWith("card "),
    );
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      const style = StyleSheet.flatten(card.props.style);
      expect(style).not.toHaveProperty("boxShadow");
      expect(style).not.toHaveProperty("elevation");
    }
  });

  test("tapping the star stars the game; tapping elsewhere plays it", async () => {
    const onToggleFavorite = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <DealMeAGame
          allEnabledGames={GAMES.slice(0, 1)}
          unplayedGamePaths={[]}
          favorites={new Set()}
          onToggleFavorite={onToggleFavorite}
          pageSidePadding={16}
          contentMaxWidth={420}
        />,
      );
    });
    const stack = renderer.root.find(
      (node) =>
        typeof node.type === "string" &&
        typeof node.props.onLayout === "function",
    );
    act(() =>
      stack.props.onLayout({ nativeEvent: { layout: { width: 300 } } }),
    );
    // The handlers reach React through a microtask, as on the UI thread.
    const tapAt = (x: number, y: number) =>
      act(async () => {
        fireGestureHandler(getByGestureTestId("deal-tap /hard"), [
          { state: State.BEGAN, x, y },
          { state: State.ACTIVE, x, y },
          { state: State.END, x, y },
        ]);
      });

    await tapAt(280, 20);
    expect(onToggleFavorite).toHaveBeenCalledWith("/hard");
    expect(launchGame).not.toHaveBeenCalled();

    await tapAt(120, 100);
    expect(launchGame).toHaveBeenCalledWith("/hard");
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  });
});
