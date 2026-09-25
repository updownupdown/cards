import {
  NARROW_AWARD_SCREEN_WIDTH,
  NARROW_HEADLINE_SCREEN_WIDTH,
  pickPersonas,
  StatsList,
  winRateColor,
  type StatsRow,
} from "@/components/Home/StatsList";
import { Colors, rgba } from "@/styles/styles";
import type { GameSettingsMap, GameStats } from "@/data/game-menu";
import { describe, expect, jest, test } from "@jest/globals";
import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

// Mock factories are hoisted above the imports, so they can only use hoisted
// function declarations.
function mockGame(title: string, gameColorPale = "#d0e0f0") {
  return { title, gameColorDark: "#102030", gameColorPale };
}

function mockLaunchGame(...args: unknown[]) {
  launchCalls.push(args);
}
const launchCalls: unknown[][] = [];

jest.mock("@/data/games-registry", () => ({
  GAMES_DATA: {
    "/alpha": mockGame("Alpha"),
    "/bravo": mockGame("Bravo", "#aabbcc"),
    "/charlie": mockGame("Charlie"),
    "/delta": mockGame("Delta"),
    "/unplayed": mockGame("Unplayed"),
  },
}));

jest.mock("@/components/common/GameLaunchOverlay", () => ({
  launchGame: mockLaunchGame,
}));

jest.mock("@/components/common/Text", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require("react-native") as typeof import("react-native");
  return {
    getScaledTextSize: () => 11,
    Text: ({
      children,
      color,
    }: {
      children?: React.ReactNode;
      color?: string;
    }) => <Text style={{ color }}>{children}</Text>,
  };
});

jest.mock("@/components/Button/Button", () => {
  const { Pressable } =
    require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    Button: ({
      accessibilityLabel,
      onPress,
    }: {
      accessibilityLabel: string;
      onPress: () => void;
    }) => (
      <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress} />
    ),
  };
});

jest.mock("@/components/Home/HomeCard", () => {
  const { Pressable } =
    require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    HomeCard: ({
      path,
      size,
      style,
      isFavorite,
      onToggleFavorite,
      onOpen,
    }: {
      path: string;
      size: string;
      style: object;
      isFavorite: boolean;
      onToggleFavorite: (path: string) => void;
      onOpen?: () => void;
    }) => (
      <Pressable
        accessibilityLabel={`card ${path}`}
        accessibilityHint={size}
        style={style}
        accessibilityState={{ selected: isFavorite }}
        onLongPress={() => onToggleFavorite(path)}
        onPress={() => {
          onOpen?.();
          mockLaunchGame(path);
        }}
      />
    ),
  };
});

jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({
    spacing: (value: number) => value,
    textScale: 1,
    ui: { contentMaxWidth: 420 },
  }),
}));

let mockViewportWidth = 400;
jest.mock("@/hooks/useViewportDimensions", () => ({
  useViewportDimensions: () => ({ width: mockViewportWidth, height: 800 }),
}));

// Keys come back as-is, with options appended so interpolation is visible.
jest.mock("@/i18n", () => ({
  useDisplayLanguage: () => "en",
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) =>
      options ? `${key} ${JSON.stringify(options)}` : key,
  }),
}));

jest.mock("@/i18n/content", () => ({
  localizeGameTitle: (gameInfo: { title: string }) => gameInfo.title,
}));

jest.mock("@/i18n/format", () => ({
  formatPercent: (fraction: number) => `${Math.round(fraction * 100)}%`,
}));

jest.mock("@/icons", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native") as typeof import("react-native");
  return { Icon: () => <View /> };
});

const stats = (
  attempts: number,
  wins: number,
  losses: number,
  extra: Partial<GameStats> = {},
): GameStats => ({
  attempts,
  wins,
  losses,
  highestScore: null,
  fastestTimeMs: null,
  ...extra,
});

const row = (path: string, gameStats: GameStats): StatsRow => ({
  path,
  title: path,
  stats: gameStats,
});

const awards = (rows: StatsRow[]) =>
  Object.fromEntries(
    pickPersonas(rows).map((persona) => [persona.key, persona.row.path]),
  );

describe("pickPersonas", () => {
  test("win rate awards need 3 wins, so one lucky or unlucky game can't win", () => {
    expect(
      awards([
        row("/lucky", stats(1, 1, 0)),
        row("/unlucky", stats(1, 0, 1)),
        row("/steady", stats(10, 5, 5)),
        row("/good", stats(10, 8, 2)),
      ]),
    ).toMatchObject({ comfort: "/good", nemesis: "/steady" });
  });

  test("a game you've never lost has a 100% win rate", () => {
    expect(
      awards([row("/perfect", stats(5, 5, 0)), row("/other", stats(8, 4, 4))]),
    ).toMatchObject({ comfort: "/perfect", nemesis: "/other" });
  });

  test("highest and lowest win rate need two games with different rates", () => {
    const result = awards([
      row("/a", stats(6, 3, 3)),
      row("/b", stats(12, 6, 6)),
    ]);
    expect(result.comfort).toBeUndefined();
    expect(result.nemesis).toBeUndefined();
  });

  test("the White Whale is the most played game with no wins and 3+ losses", () => {
    expect(
      awards([
        row("/barely", stats(9, 0, 2)),
        row("/whale", stats(6, 0, 4)),
        row("/bigger-whale", stats(8, 0, 3)),
      ]),
    ).toMatchObject({ whale: "/bigger-whale" });
  });

  test("the Rivalry must be within 40-60% with 3+ wins and 3+ losses", () => {
    expect(
      awards([
        row("/lopsided", stats(10, 7, 3)),
        row("/close", stats(10, 4, 6)),
        row("/closest", stats(10, 5, 5)),
      ]).rivalry,
    ).toBe("/closest");
    expect(awards([row("/lopsided", stats(10, 7, 3))]).rivalry).toBeUndefined();
  });

  test("the Natural reached 3+ wins in the fewest plays", () => {
    expect(
      awards([
        row("/best", stats(10, 9, 1)),
        row("/slow", stats(20, 3, 17)),
        row("/natural", stats(4, 3, 1)),
      ]).natural,
    ).toBe("/natural");
  });

  test("a game wins at most one award, and a taken award is skipped", () => {
    // /only is the top pick for every award it qualifies for.
    const personas = pickPersonas([
      row("/only", stats(10, 5, 5)),
      row("/rare", stats(1, 0, 1)),
    ]);
    const paths = personas.map((persona) => persona.row.path);
    expect(new Set(paths).size).toBe(paths.length);
    // Old Faithful goes first to /only, so the Rivalry and the Natural,
    // whose top pick is also /only, are skipped rather than handed down.
    expect(
      Object.fromEntries(
        personas.map((persona) => [persona.key, persona.row.path]),
      ),
    ).toEqual({ faithful: "/only" });
  });
});

const settingsMap = {
  "/alpha": { stats: stats(12, 6, 6, { highestScore: 300 }) },
  "/bravo": { stats: stats(5, 5, 0, { fastestTimeMs: 65_000 }) },
  "/charlie": { stats: stats(4, 0, 4) },
  "/delta": { stats: stats(2, 0, 0) },
} as unknown as GameSettingsMap;

// Flattens nested Text, e.g. a bold award name inside its line.
const textOf = (children: React.ReactNode): string =>
  React.Children.toArray(children)
    .map((child) =>
      React.isValidElement<{ children?: React.ReactNode }>(child)
        ? textOf(child.props.children)
        : String(child),
    )
    .join("");

const byType = (renderer: ReactTestRenderer, type: unknown) =>
  renderer.root.findAll((node) => node.type === type);

const texts = (renderer: ReactTestRenderer) =>
  byType(renderer, Text).map((text) => textOf(text.props.children));

// Pressable renders a few nested instances with the same props; take the
// outermost one that handles presses.
const pressables = (
  renderer: ReactTestRenderer,
  predicate: (props: Record<string, unknown>) => boolean,
) =>
  renderer.root.findAll(
    (node) => typeof node.props.onPress === "function" && predicate(node.props),
  );

const findByLabel = (renderer: ReactTestRenderer, label: string) => {
  const [match] = pressables(
    renderer,
    (props) => props.accessibilityLabel === label,
  );
  if (!match) throw new Error(`No pressable labelled ${label}`);
  return match;
};

// Award labels are "award: game", so they're left out.
const tableRowTitles = (renderer: ReactTestRenderer) => [
  ...new Set(
    pressables(renderer, (props) => props.accessibilityRole === "link")
      .map((node) => node.props.accessibilityLabel as string)
      .filter((label) => !label.includes(":")),
  ),
];

const renderList = (
  map = settingsMap,
  onOpenGame = jest.fn(),
  onToggleFavorite = jest.fn(),
) => {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <StatsList
        settingsMap={map}
        favorites={new Set(["/bravo"])}
        onToggleFavorite={onToggleFavorite}
        onOpenGame={onOpenGame}
        contentPaddingTop={0}
        contentPaddingBottom={0}
      />,
    );
  });
  return renderer;
};

describe("winRateColor", () => {
  test("runs from red at 0% through yellow at 50% to green at 100%", () => {
    expect(winRateColor(0, 4)).toBe(Colors.cardSelectRed);
    expect(winRateColor(3, 3)).toBe(Colors.cardSelectYellow);
    expect(winRateColor(5, 0)).toBe(Colors.cardSelectGreen);
  });

  test("blends between the stops", () => {
    const quarter = winRateColor(1, 3);
    expect(quarter).toMatch(/^#[0-9a-f]{6}$/);
    expect(quarter).not.toBe(Colors.cardSelectRed);
    expect(quarter).not.toBe(Colors.cardSelectYellow);
  });

  test("is dim when no game was won or lost", () => {
    expect(winRateColor(0, 0)).toBe(Colors.K700);
  });
});

describe("StatsList", () => {
  test("shows the empty state when nothing has been played", () => {
    const renderer = renderList({} as GameSettingsMap);
    expect(texts(renderer)).toContain("statsTab.empty.title");
    expect(byType(renderer, ScrollView)).toHaveLength(0);
  });

  test("headline totals count every played game", () => {
    const renderer = renderList();
    const all = texts(renderer);
    // 12 + 5 + 4 + 2 plays, 11 wins, 11 of 21 decided games won.
    expect(all).toEqual(expect.arrayContaining(["23", "11", "52%", "4/5"]));
  });

  test("only played games are listed, and an unbeaten game shows 100%", () => {
    const renderer = renderList();
    expect(tableRowTitles(renderer)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
      "Delta",
    ]);
    expect(texts(renderer)).toContain("100%");
  });

  test("sorting by win rate puts an unbeaten game first and undecided games last", () => {
    const renderer = renderList();
    const header = findByLabel(
      renderer,
      'statsTab.sortBy {"column":"statsTab.columnNames.winPercent"}',
    );
    act(() => header.props.onPress());
    expect(tableRowTitles(renderer)).toEqual([
      "Bravo",
      "Alpha",
      "Charlie",
      "Delta",
    ]);
    act(() => header.props.onPress());
    expect(tableRowTitles(renderer)).toEqual([
      "Charlie",
      "Alpha",
      "Bravo",
      "Delta",
    ]);
  });

  test("the total row has a cell for every column", () => {
    const renderer = renderList();
    const [totalLabel] = byType(renderer, Text).filter(
      (node) => node.props.children === "statsTab.total",
    );
    // Text mock -> Text wrapper; its parent is the row.
    const totalRow = totalLabel.parent!.parent!;
    const headerRow = findByLabel(
      renderer,
      'statsTab.sortBy {"column":"statsTab.columnNames.game"}',
    ).parent!;
    expect(React.Children.toArray(totalRow.props.children)).toHaveLength(
      React.Children.toArray(headerRow.props.children).length,
    );
  });

  test("the table header is the sticky child of the scroll view", () => {
    const renderer = renderList();
    const [scrollView] = byType(renderer, ScrollView);
    const [stickyIndex] = scrollView.props.stickyHeaderIndices as number[];
    const children = React.Children.toArray(scrollView.props.children);
    expect((children[stickyIndex] as React.ReactElement).key).toContain(
      "tableHeader",
    );
  });

  test("tapping a row or an award opens the game and closes the modal", () => {
    const onOpenGame = jest.fn();
    const renderer = renderList(settingsMap, onOpenGame);

    act(() => findByLabel(renderer, "Charlie").props.onPress());
    expect(launchCalls.at(-1)).toEqual(["/charlie"]);

    act(() => findByLabel(renderer, "card /alpha").props.onPress());
    expect(launchCalls.at(-1)).toEqual(["/alpha"]);
    expect(onOpenGame).toHaveBeenCalledTimes(2);
  });

  test("awards show their name and rule separately, with no heading", () => {
    const all = texts(renderList());
    expect(all).toContain("statsTab.personas.comfort.title");
    expect(all).toContain("statsTab.personas.comfort.subtitle");
    expect(all.some((text) => text.includes("personas.title"))).toBe(false);
  });

  test("each award uses a medium home card that can be favourited", () => {
    const onToggleFavorite = jest.fn();
    const renderer = renderList(settingsMap, jest.fn(), onToggleFavorite);
    // Awards: Bravo (comfort), Alpha (nemesis), Charlie (whale).
    const bravo = findByLabel(renderer, "card /bravo");
    expect(bravo.props.accessibilityHint).toBe("medium");
    expect(bravo.props.accessibilityState).toEqual({ selected: true });
    expect(
      findByLabel(renderer, "card /charlie").props.accessibilityState,
    ).toEqual({ selected: false });

    act(() => bravo.props.onLongPress());
    expect(onToggleFavorite).toHaveBeenCalledWith("/bravo");
  });

  test("the Top button appears after scrolling and scrolls back up", () => {
    const renderer = renderList();
    const [scrollView] = byType(renderer, ScrollView);
    const scrollTo = jest.fn();
    (
      scrollView as unknown as { instance: { scrollTo: typeof scrollTo } }
    ).instance.scrollTo = scrollTo;

    expect(
      renderer.root.findAll(
        (node) => node.props.accessibilityLabel === "statsTab.backToTop",
      ),
    ).toHaveLength(0);

    act(() =>
      scrollView.props.onScroll({ nativeEvent: { contentOffset: { y: 500 } } }),
    );
    act(() => findByLabel(renderer, "statsTab.backToTop").props.onPress());
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });

    act(() =>
      scrollView.props.onScroll({ nativeEvent: { contentOffset: { y: 0 } } }),
    );
    expect(
      renderer.root.findAll(
        (node) => node.props.accessibilityLabel === "statsTab.backToTop",
      ),
    ).toHaveLength(0);
  });

  test("game titles in the table are white, not the game's colour", () => {
    const renderer = renderList();
    const colorsOf = (title: string) =>
      byType(renderer, Text)
        .filter((node) => node.props.children === title)
        .map((node) => node.props.style.color);
    expect(colorsOf("Bravo")).toEqual([Colors.white]);
    expect(colorsOf("Delta")).toEqual([Colors.white]);
  });

  test("win % cells are colour coded, and the Total row too", () => {
    const renderer = renderList();
    const colorsOf = (value: string) =>
      byType(renderer, Text)
        .filter((node) => node.props.children === value)
        .map((node) => node.props.style.color);
    // Bravo 5-0, Charlie 0-4, Alpha 6-6; the total is 11 of 21.
    expect(colorsOf("100%")).toContain(Colors.cardSelectGreen);
    expect(colorsOf("0%")).toContain(Colors.cardSelectRed);
    expect(colorsOf("50%")).toContain(Colors.cardSelectYellow);
    expect(colorsOf("52%")).toContain(winRateColor(11, 10));
    // Delta has no decided games, so its "-" stays dim.
    expect(colorsOf("-")).not.toContain(Colors.cardSelectRed);
  });

  test("the table header only casts a shadow while it's pinned", () => {
    const renderer = renderList();
    const [scrollView] = byType(renderer, ScrollView);
    const header = () =>
      renderer.root.findAll(
        (node) =>
          typeof node.props.onLayout === "function" &&
          node.props.style?.backgroundColor === Colors.K875,
      )[0];

    act(() => header().props.onLayout({ nativeEvent: { layout: { y: 300 } } }));
    act(() =>
      scrollView.props.onScroll({ nativeEvent: { contentOffset: { y: 100 } } }),
    );
    expect(header().props.style.boxShadow).toBeUndefined();

    act(() =>
      scrollView.props.onScroll({ nativeEvent: { contentOffset: { y: 400 } } }),
    );
    expect(header().props.style.boxShadow).toContain(
      rgba(Colors.black, 0.1875),
    );

    act(() =>
      scrollView.props.onScroll({ nativeEvent: { contentOffset: { y: 0 } } }),
    );
    expect(header().props.style.boxShadow).toBeUndefined();
  });

  describe("narrow screens", () => {
    const renderAtWidth = (width: number) => {
      mockViewportWidth = width;
      try {
        return renderList();
      } finally {
        mockViewportWidth = 400;
      }
    };

    const awardCardWidth = (renderer: ReactTestRenderer) =>
      StyleSheet.flatten(findByLabel(renderer, "card /bravo").props.style)
        .width;

    // The headline tile holding the "games played" total (23).
    const headlineTileStyle = (renderer: ReactTestRenderer) => {
      const [value] = byType(renderer, Text).filter(
        (node) => node.props.children === "23",
      );
      return StyleSheet.flatten(value.parent!.parent!.props.style);
    };

    test("award cards get narrower so their stats have room", () => {
      expect(awardCardWidth(renderAtWidth(NARROW_AWARD_SCREEN_WIDTH))).toBe(
        161,
      );
      expect(awardCardWidth(renderAtWidth(NARROW_AWARD_SCREEN_WIDTH - 1))).toBe(
        135,
      );
    });

    test("headline stats become a 2x2 grid", () => {
      const wide = headlineTileStyle(
        renderAtWidth(NARROW_HEADLINE_SCREEN_WIDTH),
      );
      expect(wide.flex).toBe(1);
      expect(wide.width).toBeUndefined();

      const narrow = headlineTileStyle(
        renderAtWidth(NARROW_HEADLINE_SCREEN_WIDTH - 1),
      );
      expect(narrow.width).toBe("50%");
      expect(narrow.flex).toBeUndefined();
    });
  });
});
