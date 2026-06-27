import { Text } from "@/components/common/Text";
import {
  loadFavoriteGames,
  loadRecentlyPlayedGames,
  toggleFavoriteGame,
} from "@/data/game-menu";
import {
  GameCategory,
  GameCategoryNames,
  GameMenuInfo,
  GAMES_DATA,
} from "@/data/games-data";
import { Icon, type IconName } from "@/icons";
import { Colors, HomePadding } from "@/styles/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LargeHomeCard, SmallHomeCard } from "./HomeCards";

type CardVariant = "small" | "large";

export type HomeSectionKey = GameCategory | "favorites" | "recent";

export type HomeSectionConfig = {
  key: HomeSectionKey;
  title: string;
  variant: CardVariant;
  firstCardLarge?: boolean;
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
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [pagerWidth, setPagerWidth] = useState(0);

  const pagerRef = useRef<ScrollView>(null);
  const isProgrammaticTabScrollRef = useRef(false);
  const programmaticTargetIndexRef = useRef<number | null>(null);

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
    } else if (section.key === "favorites") {
      gameList = gameEntries.filter(
        ([key, val]) => favorites.has(key) && val.enabled !== false,
      );
    } else {
      gameList = gameEntries.filter(
        ([key, val]) => val.category === section.key && val.enabled !== false,
      );
    }

    if (section.key !== "recent") {
      gameList.sort((a, b) => a[1].title.localeCompare(b[1].title));
    }

    return gameList;
  };

  const tabsWithVisibleSections = useMemo(
    () =>
      tabs.map((tab) => {
        const sections = tab.sections
          .map((section) => ({
            section,
            gameList: getGamesForSection(section),
          }))
          .filter((entry) => entry.gameList.length > 0);
        return {
          ...tab,
          sections,
        };
      }),
    [favorites, recentPaths, tabs],
  );

  const renderGamesCategory = (
    section: HomeSectionConfig,
    gameList: [string, GameMenuInfo][],
  ) => {
    if (gameList.length === 0) return null;

    return (
      <View key={`section-${section.key}`} style={[{ gap: 10 }]}>
        <Text
          style={[
            {
              alignItems: "flex-start",
              paddingLeft: HomePadding,
              paddingTop: HomePadding * 1.5,
              paddingBottom: 6,
            },
          ]}
          weight={300}
          size="sm"
          textTransform={"uppercase"}
          color={Colors.K500}
        >
          {section.title}
        </Text>

        {section.variant === "small" ? (
          <View style={styles.smallCardGrid}>
            {gameList.map(([path, game], index) => {
              if (index === 0 && section.firstCardLarge) {
                return (
                  <LargeHomeCard
                    key={path}
                    path={path}
                    game={game}
                    onToggleFavorite={onToggleFavorite}
                    isFavorite={favorites.has(path)}
                  />
                );
              }
              return (
                <SmallHomeCard
                  key={path}
                  path={path}
                  game={game}
                  onToggleFavorite={onToggleFavorite}
                  isFavorite={favorites.has(path)}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.cardList}>
            {gameList.map(([path, game]) => (
              <LargeHomeCard
                key={path}
                path={path}
                game={game}
                onToggleFavorite={onToggleFavorite}
                isFavorite={favorites.has(path)}
              />
            ))}
          </View>
        )}
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
    const nextWidth = Math.round(event.nativeEvent.layout.width);
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
    <View style={styles.container} onLayout={onContainerLayout}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        onScroll={syncTabFromOffset}
        onMomentumScrollEnd={(event) => syncTabFromOffset(event, true)}
        onScrollEndDrag={(event) => syncTabFromOffset(event, true)}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {tabsWithVisibleSections.map((tab) => (
          <ScrollView
            key={tab.key}
            style={[styles.page, { width: pagerWidth || "100%" }]}
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            {tab.sections.length === 0 ? (
              <View style={styles.emptySection}>
                <Text size="sm" color={Colors.K500}>
                  {tab.key === "home"
                    ? "No recent or favorite games yet."
                    : "No games available in this section yet."}
                </Text>
              </View>
            ) : (
              tab.sections.map(({ section, gameList }) =>
                renderGamesCategory(section, gameList),
              )
            )}
          </ScrollView>
        ))}
      </ScrollView>

      <View style={styles.tabBarWrap}>
        <View style={styles.tabBar}>
          {tabsWithVisibleSections.map((tab, index) => {
            const isActive = activeTabIndex === index;
            return (
              <Pressable
                key={`tab-${tab.key}`}
                onPress={() => goToTab(index)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
              >
                <Icon
                  name={tab.iconName}
                  size={28}
                  color={isActive ? Colors.K100 : Colors.K500}
                />
                <Text
                  size="xs"
                  weight={500}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: HomePadding,
    paddingBottom: HomePadding,
  },
  emptySection: {
    paddingTop: HomePadding * 2,
    alignItems: "center",
  },
  smallCardGrid: {
    flexDirection: "column",
    alignItems: "stretch",
    rowGap: 10,
  },
  cardList: {
    gap: 26,
  },
  tabBarWrap: {
    paddingHorizontal: HomePadding,
    paddingBottom: HomePadding,
    paddingTop: HomePadding * 0.5,
    backgroundColor: Colors.background,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.K875,
    borderRadius: 16,
    padding: 6,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: Colors.K800,
  },
});
