import { Button } from "@/components/Button/Button";
import { CollectFrom } from "@/components/common/CollectFrom";
import { launchGame } from "@/components/common/GameLaunchOverlay";
import { DealMeAGame } from "@/components/Home/DealMeAGame";
import { FavButton } from "@/components/Home/FavButton";
import {
  ArtShelf,
  favCorner,
  TILE_SIZE,
  TILE_WIDTH,
} from "@/components/Home/HomeArt";
import { SURFACE_OPACITY } from "@/components/ui/FloatingBar";
import { Pill } from "@/components/ui/Nocturne";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { describe, expect, jest, test } from "@jest/globals";
import React from "react";
import { StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

// Mock factories are hoisted above the imports, so they can only use hoisted
// function declarations.
function mockGame(title: string) {
  return {
    title,
    tags: ["KlondikeFamily"],
    rating: { difficulty: 2, complexity: 1, luck: 1 },
    gameColorDark: "#102030",
    gameColorPale: "#d0e0f0",
    gameColorAccent: "#f0c040",
  };
}

jest.mock("@/data/games-registry", () => ({
  GAMES_DATA: { "/klondike": mockGame("Klondike") },
}));

jest.mock("@/data/campaign-progress", () => ({
  setLastPlayedGameDot: () => Promise.resolve(),
}));

// The games open on the map; a test may open more.
const mockUnlockedPaths = new Set<string>();
jest.mock("@/hooks/useCampaignProgress", () => ({
  useCampaignProgress: () => ({
    unlockedPaths: mockUnlockedPaths,
    isLoading: false,
  }),
}));

jest.mock("@/components/common/GameLaunchOverlay", () => {
  const globals = require("@jest/globals") as typeof import("@jest/globals"); // eslint-disable-line @typescript-eslint/no-require-imports
  return { launchGame: globals.jest.fn() };
});

// Only its props matter here.
jest.mock("@/components/Button/Button", () => ({
  Button: () => null,
}));

jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({
    spacing: (value: number) => value,
    font: (value: number) => value,
    ui: { contentMaxWidth: 420, isTablet: false },
  }),
}));

jest.mock("@/i18n", () => ({
  useDisplayLanguage: () => "en",
  useTranslation: () => ({
    t: (key: string, options?: { game?: string }) =>
      key === "winToCollect" ? `Win **${options?.game}** to collect` : key,
  }),
}));

jest.mock("@/i18n/content", () => ({
  localizeGameTitle: (game: { title: string }) => game.title,
}));

jest.mock("@/components/common/Text", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require("react-native") as typeof import("react-native");
  return {
    Text: ({
      children,
      textTransform,
      onPress,
      accessibilityRole,
    }: {
      children?: React.ReactNode;
      textTransform?: string;
      onPress?: () => void;
      accessibilityRole?: string;
    }) => (
      <Text
        onPress={onPress}
        accessibilityRole={accessibilityRole as "link"}
        accessibilityHint={textTransform}
      >
        {children}
      </Text>
    ),
  };
});

jest.mock("@/icons", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native") as typeof import("react-native");
  return { Icon: () => <View /> };
});

function render(element: React.ReactElement) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(element);
  });
  return renderer;
}

describe("floating surfaces", () => {
  test("pills are a plain, nearly opaque fill, with no blur", () => {
    expect(SURFACE_OPACITY).toBeGreaterThanOrEqual(0.8);
    expect(SURFACE_OPACITY).toBeLessThan(1);
    const renderer = render(
      <Pill label="All" selected={false} onPress={() => {}} />,
    );
    const filled = renderer.root.findAll(
      (node) =>
        typeof node.type === "string" &&
        String(
          StyleSheet.flatten(node.props.style)?.backgroundColor ?? "",
        ).endsWith(`, ${SURFACE_OPACITY})`),
    );
    expect(filled.length).toBeGreaterThan(0);
  });
});

describe("game cards", () => {
  test("the favourite star sits as far in from the top as from the right, on every card", () => {
    // Game of the Day's button and star, and a shelf tile's.
    const large = favCorner((value) => value, 40, 22);
    const small = favCorner((value) => value, 36, 20);
    expect(large.top).toBe(large.right);
    expect(small.top).toBe(small.right);
    // The star's own edge, inside its button, is the same distance in.
    const starInset = (corner: { top: number }, size: number, icon: number) =>
      corner.top + (size - icon) / 2;
    expect(starInset(large, 40, 22)).toBe(starInset(small, 36, 20));
    expect(starInset(large, 40, 22)).toBe(10);
  });

  test("every shelf card is the Favorites' height, at 4:3", () => {
    expect(TILE_WIDTH / TILE_SIZE).toBeCloseTo(4 / 3);
    const games = ["/a", "/b", "/c"].map(
      (path) => [path, mockGame(path)] as unknown as HomeGameEntry,
    );
    const renderer = render(
      <ArtShelf
        games={games}
        pageSidePadding={16}
        favorites={new Set()}
        onToggleFavorite={() => {}}
      />,
    );
    const cards = renderer.root.findAll(
      (node) =>
        typeof node.type === "string" &&
        StyleSheet.flatten(node.props.style)?.backgroundColor === "#102030",
    );
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      const style = StyleSheet.flatten(card.props.style);
      expect(style.width).toBe(TILE_WIDTH);
      expect(style.height).toBe(TILE_SIZE);
    }

    // No dark halo under the cards' stars.
    const stars = renderer.root.findAll((node) => node.type === FavButton);
    expect(stars).toHaveLength(3);
    for (const star of stars) expect(star.props.shadow).toBe(false);
  });
});

describe("Random Deal", () => {
  test("vertical swipes on a card scroll the page on the web", () => {
    const entry = (path: string) =>
      [path, mockGame(path)] as unknown as HomeGameEntry;
    const renderer = render(
      <DealMeAGame
        allEnabledGames={[entry("/klondike")]}
        unplayedGamePaths={[]}
        favorites={new Set()}
        onToggleFavorite={() => undefined}
        pageSidePadding={16}
        contentMaxWidth={420}
      />,
    );
    const stack = renderer.root.find(
      (node) => node.type === View && typeof node.props.onLayout === "function",
    );
    act(() =>
      stack.props.onLayout({ nativeEvent: { layout: { width: 300 } } }),
    );
    const detectors = renderer.root.findAll(
      (node) => node.type === GestureDetector,
    );
    expect(detectors.length).toBeGreaterThan(0);
    for (const detector of detectors) {
      expect(detector.props.touchAction).toBe("pan-y");
    }
  });
});

describe("Collect from", () => {
  test("a button, Win <game> to collect, with the game's name in bold, starts it", () => {
    const renderer = render(<CollectFrom path="/klondike" />);
    const button = renderer.root.findAllByType(
      Button as React.ComponentType,
    )[0];
    const [before, name, after] = button.props.text as [
      string,
      React.ReactElement<{ weight: number; children: string }>,
      string,
    ];
    expect(before).toBe("Win ");
    expect(name.props).toMatchObject({ weight: 600, children: "Klondike" });
    expect(after).toBe(" to collect");
    act(() => button.props.onPress());
    expect(launchGame).toHaveBeenCalledWith("/klondike");
  });

  test("for a quote or chapter, a game locked on the map has no button", () => {
    mockUnlockedPaths.clear();
    const renderer = render(<CollectFrom path="/klondike" campaign />);
    expect(
      renderer.root.findAllByType(Button as React.ComponentType),
    ).toHaveLength(0);
  });

  test("for a quote or chapter, an unlocked game starts in Campaign mode", () => {
    mockUnlockedPaths.add("/klondike");
    const renderer = render(<CollectFrom path="/klondike" campaign />);
    const button = renderer.root.findAllByType(
      Button as React.ComponentType,
    )[0];
    act(() => button.props.onPress());
    expect(launchGame).toHaveBeenCalledWith({
      pathname: "/klondike",
      params: { mode: "campaign" },
    });
    mockUnlockedPaths.clear();
  });
});
