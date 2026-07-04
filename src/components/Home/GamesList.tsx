import { Text } from "@/components/common/Text";
import { flexStyles } from "@/styles/flexStyles";
import {
  loadGameSettingsMap,
  loadFavoriteGames,
  loadRecentlyPlayedGames,
  toggleFavoriteGame,
} from "@/data/game-menu";
import { GameMenuInfo, GAMES_DATA, GameTag } from "@/data/games-data";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { Icon, type IconName } from "@/icons";
import { Colors, HomePadding, MaxContentWidth } from "@/styles/styles";
import { roundToPixel } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DiscoverFilters } from "@/components/Home/DiscoverFilters";
import { Button } from "@/components/Button/Button";
import { HomeCard } from "./HomeCard";
import { router, type Href } from "expo-router";

type CardSize = "small" | "medium" | "large";

export type HomeSectionKey = "favorites" | "recent" | "featured" | "discover";

export type HomeSectionConfig = {
  key: HomeSectionKey;
  title: string;
  variant: CardSize;
  gamePaths?: string[];
  iconName: IconName;
};

type GamesListProps = {
  sections: HomeSectionConfig[];
  header?: ReactNode;
};

export const GamesList = ({ sections, header }: GamesListProps) => {
  const listRef = useRef<ScrollView>(null);
  const hasMountedRef = useRef(false);
  const insets = useSafeAreaInsets();
  const scale = useResponsiveScale();
  const { width: viewportWidth } = useViewportDimensions();
  const { settings, updateSettings } = useGlobalSettings();

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [playedFrequentlyPaths, setPlayedFrequentlyPaths] = useState<
    Set<string>
  >(new Set());
  const [attemptsByPath, setAttemptsByPath] = useState<Record<string, number>>(
    {},
  );
  const [hasLoadedGameSettings, setHasLoadedGameSettings] = useState(false);
  const [selectedTag, setSelectedTag] = useState<GameTag | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const discoverCardSize: CardSize = settings.discoverCardSize ?? "large";

  const pageSidePadding = roundToPixel(HomePadding * scale);
  const contentMaxWidth = roundToPixel(MaxContentWidth * scale);
  const renderedContentWidth = Math.min(contentMaxWidth, viewportWidth);
  const centeredContentOffset = Math.max(
    0,
    roundToPixel((viewportWidth - contentMaxWidth) / 2),
  );
  const sectionEdgePadding = pageSidePadding + centeredContentOffset;
  const sectionTopPadding = roundToPixel(14 * scale);
  const discoverCardGap = roundToPixel(12 * scale);
  const discoverRowInnerWidth = Math.max(
    0,
    renderedContentWidth - pageSidePadding * 2,
  );
  const discoverMediumCardWidth = Math.max(
    0,
    roundToPixel((discoverRowInnerWidth - discoverCardGap) / 2),
  );
  const horizontalCardWidth = discoverMediumCardWidth;
  const hasDiscoverFilters =
    selectedTag != null || searchQuery.trim().length > 0;

  const allEnabledGames = useMemo(
    () =>
      (Object.entries(GAMES_DATA) as [string, GameMenuInfo][])
        .filter(([_, game]) => game.enabled !== false)
        .sort((a, b) => a[1].title.localeCompare(b[1].title)),
    [],
  );

  const filteredDiscoverGames = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return allEnabledGames.filter(([_, game]) => {
      const matchesTag = selectedTag ? game.tags?.includes(selectedTag) : true;
      const matchesSearch = normalizedQuery
        ? game.title.toLowerCase().includes(normalizedQuery) ||
          game.cardDescription.toLowerCase().includes(normalizedQuery)
        : true;
      return matchesTag && matchesSearch;
    });
  }, [allEnabledGames, searchQuery, selectedTag]);

  const allEnabledGamePaths = useMemo(
    () => allEnabledGames.map(([path]) => path),
    [allEnabledGames],
  );

  const unplayedEnabledGamePaths = useMemo(
    () =>
      allEnabledGamePaths.filter((path) => (attemptsByPath[path] ?? 0) === 0),
    [allEnabledGamePaths, attemptsByPath],
  );

  const tagResultCounts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const counts: Partial<Record<GameTag, number>> = {};

    (Object.values(GameTag) as GameTag[]).forEach((tag) => {
      counts[tag] = 0;
    });

    allEnabledGames.forEach(([_, game]) => {
      const matchesSearch = normalizedQuery
        ? game.title.toLowerCase().includes(normalizedQuery) ||
          game.cardDescription.toLowerCase().includes(normalizedQuery)
        : true;

      if (!matchesSearch) return;

      (game.tags ?? []).forEach((tag) => {
        counts[tag] = (counts[tag] ?? 0) + 1;
      });
    });

    return counts;
  }, [allEnabledGames, searchQuery]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [loadedFavorites, loadedRecent, loadedGameSettings] =
          await Promise.all([
            loadFavoriteGames(),
            loadRecentlyPlayedGames(),
            loadGameSettingsMap(),
          ]);

        if (cancelled) return;

        setFavorites(loadedFavorites);
        setRecentPaths(loadedRecent.map((entry) => entry.path));

        const frequentlyPlayed = new Set<string>();
        const loadedAttemptsByPath: Record<string, number> = {};

        Object.entries(loadedGameSettings).forEach(([path, gameSettings]) => {
          const attempts = gameSettings.stats?.attempts ?? 0;
          loadedAttemptsByPath[path] = attempts;

          if (attempts >= 3) {
            frequentlyPlayed.add(path);
          }
        });

        setAttemptsByPath(loadedAttemptsByPath);
        setPlayedFrequentlyPaths(frequentlyPlayed);
      } finally {
        if (!cancelled) {
          setHasLoadedGameSettings(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    listRef.current?.scrollTo({ y: 0, animated: true });
  }, [selectedTag, searchQuery]);

  async function onToggleFavorite(path: string) {
    const updated = await toggleFavoriteGame(path);
    setFavorites(new Set(updated));
  }

  const getRandomPath = (paths: string[]) => {
    if (paths.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * paths.length);
    return paths[randomIndex];
  };

  const onPlayRandomAllGames = () => {
    const randomPath = getRandomPath(allEnabledGamePaths);
    if (!randomPath) return;
    router.push(randomPath as Href);
  };

  const onPlayRandomUnplayedGames = () => {
    const randomPath = getRandomPath(unplayedEnabledGamePaths);
    if (!randomPath) return;
    router.push(randomPath as Href);
  };

  const getGamesForSection = (section: HomeSectionConfig) => {
    const gameEntries = Object.entries(GAMES_DATA) as [string, GameMenuInfo][];

    if (section.key === "recent") {
      return recentPaths
        .map((path) => [path, GAMES_DATA[path]] as [string, GameMenuInfo])
        .filter(([_, game]) => !!game && game.enabled !== false)
        .slice(0, 3);
    }

    if (section.key === "featured") {
      if (!hasLoadedGameSettings) {
        return [] as [string, GameMenuInfo][];
      }

      return (section.gamePaths ?? [])
        .map((path) => [path, GAMES_DATA[path]] as [string, GameMenuInfo])
        .filter(
          ([path, game]) =>
            !!game &&
            game.enabled !== false &&
            !playedFrequentlyPaths.has(path),
        );
    }

    if (section.key === "favorites") {
      return gameEntries
        .filter(([key, val]) => favorites.has(key) && val.enabled !== false)
        .sort((a, b) => a[1].title.localeCompare(b[1].title));
    }

    if (section.key === "discover") {
      return filteredDiscoverGames;
    }

    return [] as [string, GameMenuInfo][];
  };

  const onSelectDiscoverSize = (size: CardSize) => {
    if (discoverCardSize === size) return;
    updateSettings({ discoverCardSize: size });
  };

  const renderSectionTitle = (section: HomeSectionConfig, key: string) => (
    <View
      key={key}
      style={{
        width: "100%",
        maxWidth: contentMaxWidth,
        alignSelf: "center",
      }}
    >
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          {
            gap: roundToPixel(8 * scale),
            paddingHorizontal: pageSidePadding,
          },
        ]}
      >
        <Icon
          name={section.iconName}
          size={roundToPixel(24 * scale)}
          color={Colors.K400}
        />

        <Text
          style={[flexStyles.flex1]}
          weight={300}
          size="sm"
          textTransform="uppercase"
          color={Colors.K400}
          lineHeight={1}
        >
          {section.title}
        </Text>
      </View>
    </View>
  );

  const renderHorizontalSection = (
    section: HomeSectionConfig,
    gameList: [string, GameMenuInfo][],
  ) => {
    if (gameList.length === 0) {
      return null;
    }

    return (
      <View
        key={`section-${section.key}`}
        style={{
          width: "100%",
        }}
      >
        {renderSectionTitle(section, `title-${section.key}`)}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingLeft: sectionEdgePadding,
            paddingRight: sectionEdgePadding,
            gap: roundToPixel(12 * scale),
            paddingTop: sectionTopPadding,
            paddingBottom: roundToPixel(40 * scale),
            alignItems: "stretch",
          }}
        >
          {gameList.map(([path, game]) => (
            <HomeCard
              key={path}
              path={path}
              game={game}
              size={section.variant}
              responsiveScale={scale}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.has(path)}
              style={{ width: horizontalCardWidth, flexShrink: 0 }}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderDiscoverCards = (
    section: HomeSectionConfig,
    gameList: [string, GameMenuInfo][],
  ) => {
    if (gameList.length === 0) {
      return null;
    }

    const cardSize =
      section.key === "discover"
        ? (settings.discoverCardSize ?? "medium")
        : section.variant;
    const isMediumLayout = cardSize === "medium";

    return (
      <View
        key="section-discover"
        style={{
          width: "100%",
          maxWidth: contentMaxWidth,
          alignSelf: "center",
        }}
      >
        {!hasDiscoverFilters && (
          <View
            style={[
              flexStyles.rowCentered,
              flexStyles.fullWidth,
              {
                paddingHorizontal: pageSidePadding,
                paddingTop: sectionTopPadding * 2,
                paddingBottom: sectionTopPadding,
                gap: roundToPixel(24 * scale),
              },
            ]}
          >
            <Text
              size="md"
              weight={300}
              color={Colors.K200}
              style={{ flex: 1 }}
            >
              Play random:
            </Text>

            <Button
              text="All games"
              uppercase={false}
              size="md"
              onPress={onPlayRandomAllGames}
              textOnly
            />

            <Button
              text="Unplayed games"
              uppercase={false}
              size="md"
              onPress={onPlayRandomUnplayedGames}
              disabled={
                !hasLoadedGameSettings || unplayedEnabledGamePaths.length === 0
              }
              textOnly
            />
          </View>
        )}

        <View
          style={{
            width: "100%",
            paddingHorizontal: pageSidePadding,
            paddingTop: sectionTopPadding,
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            rowGap: isMediumLayout ? roundToPixel(12 * scale) : undefined,
            gap: isMediumLayout ? undefined : roundToPixel(12 * scale),
          }}
        >
          {gameList.map(([path, game]) => (
            <HomeCard
              key={path}
              path={path}
              game={game}
              size={cardSize}
              responsiveScale={scale}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.has(path)}
              style={{
                width: isMediumLayout ? discoverMediumCardWidth : "100%",
                flexGrow: isMediumLayout ? 0 : 1,
              }}
            />
          ))}
        </View>
      </View>
    );
  };

  const scrollChildren: ReactNode[] = [];

  if (header) {
    scrollChildren.push(header);
  }

  sections.forEach((section) => {
    if (section.key !== "discover") {
      if (hasDiscoverFilters) {
        return;
      }

      scrollChildren.push(
        renderHorizontalSection(section, getGamesForSection(section)),
      );
      return;
    }

    const discoverGames = getGamesForSection(section);
    if (discoverGames.length === 0) {
      return;
    }

    scrollChildren.push(renderSectionTitle(section, "discover-title"));
    scrollChildren.push(renderDiscoverCards(section, discoverGames));
  });

  return (
    <View style={{ flex: 1, overflow: "visible" }}>
      <ScrollView
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 0,
          paddingBottom: roundToPixel(
            (insets.bottom + HomePadding * 10) * scale,
          ),
          flexGrow: 1,
          alignItems: "stretch",
        }}
        showsVerticalScrollIndicator={false}
      >
        {scrollChildren}
      </ScrollView>

      <DiscoverFilters
        scale={scale}
        pageSidePadding={pageSidePadding}
        contentMaxWidth={contentMaxWidth}
        resultCount={filteredDiscoverGames.length}
        tagResultCounts={tagResultCounts}
        selectedTag={selectedTag}
        searchQuery={searchQuery}
        discoverCardSize={discoverCardSize}
        onSelectedTagChange={setSelectedTag}
        onSearchQueryChange={setSearchQuery}
        onDiscoverCardSizeChange={onSelectDiscoverSize}
      />
    </View>
  );
};
