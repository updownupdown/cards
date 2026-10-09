import {
  NARROW_AWARD_SCREEN_WIDTH,
  NARROW_HEADLINE_SCREEN_WIDTH,
  pickPersonas,
  StatsList,
  type StatsRow,
  type StatsTab,
} from "@/components/Home/StatsList";
import { Colors, rgba, theme } from "@/styles/styles";
import type { GameSettingsMap, GameStats } from "@/data/game-menu";
import { QUOTE_COUNT, TAO_CHAPTER_COUNT } from "@/data/collectibles";
import { afterEach, describe, expect, jest, test } from "@jest/globals";
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
  GAME_DEFINITIONS: [],
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

jest.mock("@/components/Home/HomeArt", () => {
  const { Pressable } =
    require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    GameTile: ({
      path,
      size,
      isFavorite,
      onToggleFavorite,
      onOpen,
    }: {
      path: string;
      size: number;
      isFavorite: boolean;
      onToggleFavorite: (path: string) => void;
      onOpen?: () => void;
    }) => (
      <Pressable
        accessibilityLabel={`card ${path}`}
        style={{ width: size }}
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

// Earned achievements are read and written through storage, which would
// finish after the test and render into a torn-down environment.
jest.mock("@/data/earned-achievements", () => ({
  // Never settles: none are saved here, and a late update would be outside act.
  loadEarnedAchievements: () => new Promise(() => {}),
  subscribeToEarnedAchievements: () => () => {},
  recordEarnedAchievements: () => Promise.resolve(new Set()),
}));

jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({
    spacing: (value: number) => value,
    font: (value: number) => value,
    textScale: 1,
    ui: { contentMaxWidth: 420 },
  }),
}));

let mockDailyWins = new Set<string>();
jest.mock("@/hooks/useDailyWins", () => ({
  useDailyWins: () => mockDailyWins,
}));

let mockCollected = { quotes: 0, tao: 0 };
jest.mock("@/hooks/useCampaignProgress", () => ({
  useCampaignProgress: () => ({
    collectedQuoteIds: new Set(
      Array.from({ length: mockCollected.quotes }, (_, index) => index + 1),
    ),
    collectedTaoIds: new Set(
      Array.from({ length: mockCollected.tao }, (_, index) => index + 1),
    ),
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

const placeholders = (renderer: ReactTestRenderer) =>
  renderer.root.findAll(
    (node) =>
      typeof node.type !== "string" &&
      node.props.testID === "persona placeholder",
  );

const renderers: ReactTestRenderer[] = [];

afterEach(() => {
  // Unmount before the environment goes, so nothing async renders into it.
  act(() => {
    renderers.splice(0).forEach((renderer) => renderer.unmount());
  });
});

const renderList = (
  map = settingsMap,
  onOpenGame = jest.fn(),
  onToggleFavorite = jest.fn(),
  tab: StatsTab = "games",
) => {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <StatsList
        tab={tab}
        settingsMap={map}
        favorites={new Set(["/bravo"])}
        onToggleFavorite={onToggleFavorite}
        onOpenGame={onOpenGame}
        contentPaddingTop={0}
        contentPaddingBottom={0}
      />,
    );
  });
  renderers.push(renderer);
  return renderer;
};

describe("StatsList", () => {
  test("the games table shows the empty state when nothing has been played", () => {
    const renderer = renderList({} as GameSettingsMap);
    expect(texts(renderer)).toContain("statsTab.empty.title");
    expect(byType(renderer, ScrollView)).toHaveLength(0);
  });

  test("progress and personas are there before anything is played", () => {
    const empty = {} as GameSettingsMap;
    const progress = texts(renderList(empty, jest.fn(), jest.fn(), "progress"));
    expect(progress).toContain("statsTab.achievements.title");
    expect(progress).not.toContain("statsTab.empty.title");
    const personas = renderList(empty, jest.fn(), jest.fn(), "personas");
    expect(placeholders(personas)).toHaveLength(6);
  });

  test("each tab shows only its own part", () => {
    const progress = texts(
      renderList(settingsMap, jest.fn(), jest.fn(), "progress"),
    );
    expect(progress).toContain("statsTab.streaks.title");
    expect(progress).not.toContain("statsTab.total");
    expect(progress).not.toContain("statsTab.personas.comfort.title");

    const personas = texts(
      renderList(settingsMap, jest.fn(), jest.fn(), "personas"),
    );
    expect(personas).toContain("statsTab.personas.comfort.title");
    expect(personas).not.toContain("statsTab.total");
    expect(personas).not.toContain("statsTab.achievements.title");

    const games = texts(renderList());
    expect(games).toContain("statsTab.total");
    expect(games).not.toContain("statsTab.achievements.title");
    expect(games).not.toContain("statsTab.personas.comfort.title");
  });

  test("headline totals count every played game", () => {
    const renderer = renderList(settingsMap, jest.fn(), jest.fn(), "progress");
    const all = texts(renderer);
    // 12 + 5 + 4 + 2 plays, 11 wins, 11 of 21 decided games won.
    expect(all).toEqual(expect.arrayContaining(["23", "11", "52%", "4 / 5"]));
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

    const awards = renderList(settingsMap, onOpenGame, jest.fn(), "personas");
    act(() => findByLabel(awards, "card /alpha").props.onPress());
    expect(launchCalls.at(-1)).toEqual(["/alpha"]);
    expect(onOpenGame).toHaveBeenCalledTimes(2);
  });

  test("awards show their name and rule separately, with no heading", () => {
    const all = texts(
      renderList(settingsMap, jest.fn(), jest.fn(), "personas"),
    );
    expect(all).toContain("statsTab.personas.comfort.title");
    expect(all).toContain("statsTab.personas.comfort.subtitle");
    expect(all.some((text) => text.includes("personas.title"))).toBe(false);
  });

  test("each award shows the game's tile, which can be favourited", () => {
    const onToggleFavorite = jest.fn();
    const renderer = renderList(
      settingsMap,
      jest.fn(),
      onToggleFavorite,
      "personas",
    );
    // Awards: Bravo (comfort), Alpha (nemesis), Charlie (whale).
    const bravo = findByLabel(renderer, "card /bravo");
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

  test("the table header only casts a shadow while it's pinned", () => {
    const renderer = renderList();
    const [scrollView] = byType(renderer, ScrollView);
    const header = () =>
      renderer.root.findAll(
        (node) =>
          typeof node.props.onLayout === "function" &&
          node.props.style?.backgroundColor === theme.surface,
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
    const renderAtWidth = (width: number, tab: StatsTab) => {
      mockViewportWidth = width;
      try {
        return renderList(settingsMap, jest.fn(), jest.fn(), tab);
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
      expect(
        awardCardWidth(renderAtWidth(NARROW_AWARD_SCREEN_WIDTH, "personas")),
      ).toBe(120);
      expect(
        awardCardWidth(
          renderAtWidth(NARROW_AWARD_SCREEN_WIDTH - 1, "personas"),
        ),
      ).toBe(104);
    });

    test("headline stats become a 2x2 grid", () => {
      const wide = headlineTileStyle(
        renderAtWidth(NARROW_HEADLINE_SCREEN_WIDTH, "progress"),
      );
      expect(wide.flex).toBe(1);
      expect(wide.width).toBeUndefined();

      const narrow = headlineTileStyle(
        renderAtWidth(NARROW_HEADLINE_SCREEN_WIDTH - 1, "progress"),
      );
      expect(narrow.width).toBe("50%");
      expect(narrow.flex).toBeUndefined();
    });
  });
});

describe("Stats: Personas", () => {
  test("every award not yet held keeps its place, with what it takes", () => {
    const renderer = renderList(settingsMap, jest.fn(), jest.fn(), "personas");
    // Held: Bravo (comfort), Alpha (nemesis), Charlie (whale).
    expect(placeholders(renderer)).toHaveLength(3);
    const all = texts(renderer);
    expect(all).toContain("statsTab.personas.faithful.requirement");
    expect(all).toContain("statsTab.personas.rivalry.requirement");
    expect(all).toContain("statsTab.personas.natural.requirement");
    expect(all).not.toContain("statsTab.personas.comfort.requirement");
    expect(all).toContain("statsTab.personasNote");
  });

  test("awards and placeholders keep the awards' order", () => {
    const all = texts(
      renderList(settingsMap, jest.fn(), jest.fn(), "personas"),
    );
    const titles = all.filter((text) =>
      /^statsTab\.personas\.\w+\.title$/.test(text),
    );
    expect(titles).toEqual([
      "statsTab.personas.comfort.title",
      "statsTab.personas.nemesis.title",
      "statsTab.personas.whale.title",
      "statsTab.personas.faithful.title",
      "statsTab.personas.rivalry.title",
      "statsTab.personas.natural.title",
    ]);
  });
});

describe("Stats: Progress", () => {
  const renderProgress = () =>
    renderList(settingsMap, jest.fn(), jest.fn(), "progress");

  test("shows the current and longest Game of the Day streaks", () => {
    const today = new Date();
    const key = (daysAgo: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    };
    // Yesterday and the day before; and four days in a row a while ago.
    mockDailyWins = new Set([1, 2, 10, 11, 12, 13].map(key));
    try {
      const all = texts(renderProgress());
      expect(all).toContain('statsTab.streaks.days {"count":2}');
      expect(all).toContain('statsTab.streaks.days {"count":4}');
    } finally {
      mockDailyWins = new Set();
    }
  });

  test("achievements list the done ones first, then by name, with a count", () => {
    // Two quotes short of all of them; Tao chapters all collected.
    mockCollected = { quotes: QUOTE_COUNT - 2, tao: TAO_CHAPTER_COUNT };
    try {
      const all = texts(renderProgress());
      const titles = all.filter((text) =>
        /^statsTab\.achievements\.\w+\.title$/.test(text),
      );
      // Keys come back as-is, so "by name" is by key here.
      expect(titles).toEqual([
        "statsTab.achievements.allTao.title",
        "statsTab.achievements.allQuotes.title",
        "statsTab.achievements.mastery.title",
        "statsTab.achievements.triedAll.title",
        // Numbers in names sort by value.
        "statsTab.achievements.wins50.title",
        "statsTab.achievements.wins100.title",
        "statsTab.achievements.wins500.title",
        "statsTab.achievements.wonAll.title",
      ]);
      expect(all).toContain("1/8");
      // How far along the rest are.
      expect(all).toContain(`${QUOTE_COUNT - 2}/${QUOTE_COUNT}`);
      expect(all).toContain("11/50");
      expect(all).toContain("4/5");
    } finally {
      mockCollected = { quotes: 0, tao: 0 };
    }
  });
});
