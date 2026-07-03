import { Text } from "@/components/common/Text";
import {
  loadFavoriteGames,
  loadRecentlyPlayedGames,
  toggleFavoriteGame,
} from "@/data/game-menu";
import { GameCategory, GameMenuInfo, GAMES_DATA } from "@/data/games-data";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { Icon, type IconName } from "@/icons";
import { Colors, HomePadding, MaxContentWidth, rgba } from "@/styles/styles";
import { roundToPixel } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeCard } from "./HomeCard";
import { flexStyles } from "@/styles/flexStyles";
type CardVariant = "small" | "large";

export type HomeSectionKey = GameCategory | "favorites" | "recent" | "featured";

export type HomeSectionConfig = {
  key: HomeSectionKey;
  title: string;
  emptyMessage?: string;
  variant: CardVariant;
  firstCardLarge?: boolean;
  randomSample?: boolean;
  sampleSize?: number;
  gamePaths?: string[];
};

export type HomeTabConfig = {
  key: "home" | "classic" | "modern";
  title: string;
  iconName: IconName;
  sections: HomeSectionConfig[];
};

type GamesListProps = {
  tabs: HomeTabConfig[];
};

export const GamesList = ({ tabs }: GamesListProps) => {
  const insets = useSafeAreaInsets();
  const responsiveScale = useResponsiveScale();

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [pagerWidth, setPagerWidth] = useState(0);

  const sampledCategoryPaths = useMemo(() => {
    const allEntries = Object.entries(GAMES_DATA).filter(
      ([_, game]) => game.enabled !== false,
    ) as [string, GameMenuInfo][];

    const sampled: Partial<Record<GameCategory, string[]>> = {};

    (Object.values(GameCategory) as GameCategory[]).forEach((category) => {
      const categoryPaths = allEntries
        .filter(([_, game]) => game.category === category)
        .map(([path]) => path);

      const shuffled = [...categoryPaths];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      sampled[category] = shuffled;
    });

    return sampled;
  }, []);

  const pagerRef = useRef<ScrollView>(null);
  const isProgrammaticTabScrollRef = useRef(false);
  const programmaticTargetIndexRef = useRef<number | null>(null);

  const tabGap = roundToPixel(6 * responsiveScale);
  const tabWrapPadding = roundToPixel(Math.max(8, tabGap));

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadFavoriteGames(), loadRecentlyPlayedGames()]).then(
      ([loadedFavorites, loadedRecent]) => {
        if (!cancelled) {
          setFavorites(loadedFavorites);
          setRecentPaths(loadedRecent.map((entry) => entry.path));
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  async function onToggleFavorite(path: string) {
    const updated = await toggleFavoriteGame(path);
    setFavorites(new Set(updated));
  }

  const getGamesForSection = (section: HomeSectionConfig) => {
    const gameEntries = Object.entries(GAMES_DATA);
    let gameList: [string, GameMenuInfo][] = [];

    if (section.key === "recent") {
      gameList = recentPaths
        .map((path) => [path, GAMES_DATA[path]] as [string, GameMenuInfo])
        .filter(([_, game]) => !!game && game.enabled !== false)
        .slice(0, 3);
    } else if (section.key === "featured") {
      gameList = (section.gamePaths ?? [])
        .map((path) => [path, GAMES_DATA[path]] as [string, GameMenuInfo])
        .filter(([_, game]) => !!game && game.enabled !== false);
    } else if (section.key === "favorites") {
      gameList = gameEntries.filter(
        ([key, val]) => favorites.has(key) && val.enabled !== false,
      );
    } else {
      if (section.randomSample) {
        const sampleSize = section.sampleSize ?? 3;
        const sampledPaths: string[] = (
          sampledCategoryPaths[section.key] ?? []
        ).slice(0, sampleSize);

        gameList = sampledPaths
          .map(
            (path: string) =>
              [path, GAMES_DATA[path]] as [string, GameMenuInfo],
          )
          .filter(
            ([_, game]: [string, GameMenuInfo]) =>
              !!game && game.enabled !== false,
          );
      } else {
        gameList = gameEntries.filter(
          ([_, val]) => val.category === section.key && val.enabled !== false,
        );
      }
    }

    if (
      section.key !== "recent" &&
      section.key !== "featured" &&
      !section.randomSample
    ) {
      gameList.sort((a, b) => a[1].title.localeCompare(b[1].title));
    }

    return gameList;
  };

  const renderGamesCategory = (
    section: HomeSectionConfig,
    gameList: [string, GameMenuInfo][],
  ) => {
    if (gameList.length === 0 && section.emptyMessage === undefined) {
      return null;
    }

    return (
      <View
        key={`section-${section.key}`}
        style={[
          {
            width: "100%",
            maxWidth: roundToPixel(MaxContentWidth * responsiveScale),
            gap: roundToPixel(10 * responsiveScale),
          },
        ]}
      >
        {/* —— Category Title ————————————————————————————— */}
        <Text
          style={[
            {
              paddingTop: roundToPixel(HomePadding * 2 * responsiveScale),
              paddingBottom: roundToPixel(6 * responsiveScale),
              paddingHorizontal: roundToPixel(HomePadding * responsiveScale),
            },
          ]}
          weight={300}
          size="sm"
          textTransform={"uppercase"}
          color={Colors.K400}
        >
          {section.title}
        </Text>

        {/* —— Category Cards ————————————————————————————————— */}
        <View
          style={[
            {
              flexDirection: "column",
              gap: roundToPixel(14 * responsiveScale),
            },
          ]}
        >
          {gameList.length === 0 && (
            <View
              style={[
                flexStyles.colCentered,
                {
                  width: "100%",
                  alignItems: "center",
                  backgroundColor: Colors.K875,
                  borderRadius: roundToPixel(8 * responsiveScale),
                  paddingVertical: roundToPixel(24 * responsiveScale),
                },
              ]}
            >
              <Text size="sm" color={Colors.K500}>
                {section.emptyMessage}
              </Text>
            </View>
          )}

          {gameList.map(([path, game], index) => (
            <HomeCard
              key={path}
              path={path}
              game={game}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.has(path)}
              isLarge={
                section.variant === "large" ||
                (index === 0 && section.firstCardLarge)
              }
            />
          ))}
        </View>
      </View>
    );
  };

  const goToTab = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, tabs.length - 1));
    setActiveTabIndex((prev) => (prev === nextIndex ? prev : nextIndex));
    if (pagerWidth <= 0) return;

    isProgrammaticTabScrollRef.current = true;
    programmaticTargetIndexRef.current = nextIndex;

    pagerRef.current?.scrollTo({
      x: nextIndex * pagerWidth,
      y: 0,
      animated: true,
    });
  };

  const syncTabFromOffset = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
    isTerminalEvent = false,
  ): void => {
    if (pagerWidth <= 0) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const roundedIndex = Math.round(offsetX / pagerWidth);
    const nextIndex = Math.max(0, Math.min(roundedIndex, tabs.length - 1));

    if (isProgrammaticTabScrollRef.current) {
      const targetIndex = programmaticTargetIndexRef.current;

      // Keep the pressed tab selected while the pager animates to it.
      if (
        targetIndex != null &&
        nextIndex !== targetIndex &&
        !isTerminalEvent
      ) {
        return;
      }

      if (nextIndex === targetIndex || isTerminalEvent) {
        isProgrammaticTabScrollRef.current = false;
        programmaticTargetIndexRef.current = null;
      }
    }

    setActiveTabIndex((prev) => (prev === nextIndex ? prev : nextIndex));
  };

  const onContainerLayout = (event: LayoutChangeEvent): void => {
    const nextWidth = roundToPixel(event.nativeEvent.layout.width);
    if (!nextWidth || nextWidth === pagerWidth) return;

    setPagerWidth(nextWidth);

    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({
        x: activeTabIndex * nextWidth,
        y: 0,
        animated: false,
      });
    });
  };

  return (
    <View
      style={[{ flex: 1, overflow: "visible" }]}
      onLayout={onContainerLayout}
    >
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        onScroll={syncTabFromOffset}
        onMomentumScrollEnd={(event) => syncTabFromOffset(event, true)}
        onScrollEndDrag={(event) => syncTabFromOffset(event, true)}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* —— Tabs Content —————————————————————————————————— */}
        {tabs.map((tab) => (
          <ScrollView
            key={tab.key}
            style={[{ flex: 1, width: pagerWidth || "100%" }]}
            contentContainerStyle={[
              {
                paddingHorizontal: roundToPixel(HomePadding * responsiveScale),
                paddingTop: roundToPixel(HomePadding * 1.5 * responsiveScale),
                paddingBottom: roundToPixel(HomePadding * 2 * responsiveScale),
                flexGrow: 1,
                alignItems: "center",
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {tab.sections.map((section) =>
              renderGamesCategory(section, getGamesForSection(section)),
            )}
          </ScrollView>
        ))}
      </ScrollView>

      {/* —— Tab Bar —————————————————————————————————————— */}
      <View
        style={[
          {
            paddingTop: roundToPixel(tabWrapPadding * responsiveScale),
            paddingBottom: roundToPixel(
              (insets.bottom + tabWrapPadding) * responsiveScale,
            ),
            paddingHorizontal: roundToPixel(HomePadding * responsiveScale),
            width: "100%",
            flexDirection: "row",
            justifyContent: "center",
            backgroundColor: Colors.K900,
          },
        ]}
      >
        <View
          style={[
            {
              flexDirection: "row",
              width: "100%",
              maxWidth: roundToPixel(MaxContentWidth * responsiveScale),
            },
          ]}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTabIndex === index;
            return (
              <Pressable
                key={`tab-${tab.key}`}
                onPress={() => goToTab(index)}
                style={[
                  {
                    gap: roundToPixel(tabGap * responsiveScale),
                    paddingVertical: roundToPixel(tabGap * responsiveScale),
                    borderRadius: roundToPixel(tabGap * responsiveScale * 1.5),
                    flex: 1,
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    outline: "none",
                  },
                  isActive && { backgroundColor: rgba(Colors.K700, 0.4) },
                ]}
              >
                <Icon
                  name={tab.iconName}
                  size={roundToPixel(30 * responsiveScale)}
                  color={isActive ? Colors.K100 : Colors.K500}
                />
                <Text
                  size="xs"
                  weight={400}
                  color={isActive ? Colors.K100 : Colors.K500}
                  textTransform="uppercase"
                >
                  {tab.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};
