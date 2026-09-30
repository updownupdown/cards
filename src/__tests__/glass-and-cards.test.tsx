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
import {
  GlassTargetContext,
  GlassView,
  hasNativeGlass,
} from "@/components/ui/Glass";
import { Pill } from "@/components/ui/Nocturne";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { describe, expect, jest, test } from "@jest/globals";
import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
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

jest.mock("@/hooks/useCampaignProgress", () => ({
  useCampaignProgress: () => ({ unlockedPaths: new Set<string>() }),
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

describe("frosted glass", () => {
  test("blurs natively on iOS, on Android 12+ with a target, never on the web", () => {
    expect(hasNativeGlass("ios", "17.0", false)).toBe(true);
    expect(hasNativeGlass("android", 31, true)).toBe(true);
    expect(hasNativeGlass("android", 34, true)).toBe(true);
    // Nothing to blur, or too slow to blur: the plain tint.
    expect(hasNativeGlass("android", 34, false)).toBe(false);
    expect(hasNativeGlass("android", 30, true)).toBe(false);
    // The web blurs with CSS.
    expect(hasNativeGlass("web", 0, true)).toBe(false);
  });

  test("native glass draws its tint over a blur, under its content", () => {
    const renderer = render(
      <GlassView fill="rgba(1, 2, 3, 0.8)" radius={20}>
        <Text>content</Text>
      </GlassView>,
    );
    // The glass itself (the View holding the content) is clear; its tint is
    // drawn over the blur instead.
    const glass = renderer.root.find(
      (node) =>
        node.type === View &&
        node.findAll((child) => child.props.children === "content").length >
          0 &&
        StyleSheet.flatten(node.props.style)?.borderRadius === 20,
    );
    expect(StyleSheet.flatten(glass.props.style).backgroundColor).toBe(
      "transparent",
    );
    // The blur waits a render for its target, then comes first.
    expect(renderer.root.findAllByType(BlurView)).toHaveLength(1);
    const tint = renderer.root.findAll(
      (node) =>
        typeof node.type === "string" &&
        StyleSheet.flatten(node.props.style)?.backgroundColor ===
          "rgba(1, 2, 3, 0.8)",
    );
    expect(tint.length).toBeGreaterThan(0);
  });

  test("pills are frosted glass too", () => {
    const renderer = render(
      <Pill label="All" selected={false} onPress={() => {}} />,
    );
    expect(renderer.root.findAllByType(BlurView)).toHaveLength(1);
  });

  test("on iOS glass blurs with no target at all, as in a modal", () => {
    const renderer = render(
      <GlassTargetContext.Provider value={null}>
        <GlassView fill="red" radius={4} />
      </GlassTargetContext.Provider>,
    );
    expect(renderer.root.findAllByType(BlurView)).toHaveLength(1);
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
});
