import { Text } from "@/components/common/Text";
import { flexStyles } from "@/styles/flexStyles";
import {
  loadGameSettingsMap,
  loadFavoriteGames,
  loadRecentlyPlayedGames,
  toggleFavoriteGame,
} from "@/data/game-menu";
import {
  GameMenuInfo,
  GAMES_DATA,
  GameTag,
  isGameEnabled,
} from "@/data/games-data";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { Icon, type IconName } from "@/icons";
import { Colors, HomePadding } from "@/styles/styles";
import { roundToPixel } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DiscoverFilters } from "@/components/Home/DiscoverFilters";
import { Button } from "@/components/Button/Button";
import { AddToHomeScreenNotice } from "@/components/common/AddToHomeScreenNotice";
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
  refreshToken?: number;
};

export const GamesList = ({
  sections,
  header,
  refreshToken,
}: GamesListProps) => {
  const listRef = useRef<ScrollView>(null);
  const hasMountedRef = useRef(false);
  const insets = useSafeAreaInsets();
  const { ui, spacing } = useResponsiveMetrics();
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
  const shouldShowHomeInstallNotice = !settings.dismissHomeInstallPrompt;

  const scale = ui.scale;
  const pageSidePadding = roundToPixel(spacing(HomePadding));
  const contentMaxWidth = roundToPixel(ui.contentMaxWidth);
  const renderedContentWidth = Math.min(contentMaxWidth, viewportWidth);
  const centeredContentOffset = Math.max(
    0,
    roundToPixel((viewportWidth - contentMaxWidth) / 2),
  );
  const sectionEdgePadding = pageSidePadding + centeredContentOffset;
  const sectionTopPadding = roundToPixel(spacing(14));
  const discoverCardGap = roundToPixel(spacing(12));
  const discoverRowInnerWidth = Math.max(
    0,
    renderedContentWidth - pageSidePadding * 2,
  );
  const discoverMediumCardWidth = Math.max(
    0,
    roundToPixel(
      (discoverRowInnerWidth - discoverCardGap) / (ui.isTablet ? 3 : 2),
    ),
  );
  const horizontalCardWidth = discoverMediumCardWidth;
  const hasDiscoverFilters =
    selectedTag != null || searchQuery.trim().length > 0;

  const allEnabledGames = useMemo(
    () =>
      (Object.entries(GAMES_DATA) as [string, GameMenuInfo][])
        .filter(([_, game]) => isGameEnabled(game))
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
      setHasLoadedGameSettings(false);

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
  }, [refreshToken]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    listRef.current?.scrollTo({ y: 0, animated: true });
  }, [selectedTag, searchQuery]);

  function onToggleFavorite(path: string) {
    setFavorites((previous) => {
      const next = new Set(previous);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });

    void (async () => {
      try {
        const updated = await toggleFavoriteGame(path);
        setFavorites(new Set(updated));
      } catch {
        const latest = await loadFavoriteGames();
        setFavorites(latest);
      }
    })();
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
        .filter(([_, game]) => isGameEnabled(game))
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
            isGameEnabled(game) && !playedFrequentlyPaths.has(path),
        );
    }

    if (section.key === "favorites") {
      return gameEntries
        .filter(([key, val]) => favorites.has(key) && isGameEnabled(val))
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

  const onDismissHomeInstallNotice = () => {
    if (settings.dismissHomeInstallPrompt) {
      return;
    }

    updateSettings({ dismissHomeInstallPrompt: true });
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
            gap: roundToPixel(spacing(8)),
            paddingHorizontal: pageSidePadding,
          },
        ]}
      >
        <Icon
          name={section.iconName}
          size={roundToPixel(24 * (ui.isTablet ? 1.15 : 1))}
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
            gap: roundToPixel(spacing(12)),
            paddingTop: sectionTopPadding,
            paddingBottom: roundToPixel(spacing(40)),
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
                gap: roundToPixel(spacing(24)),
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
            rowGap: isMediumLayout ? roundToPixel(spacing(12)) : undefined,
            gap: isMediumLayout ? undefined : roundToPixel(spacing(12)),
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

    if (shouldShowHomeInstallNotice) {
      scrollChildren.push(
        <View
          key="add-to-home-notice"
          style={{
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: pageSidePadding,
            paddingTop: sectionTopPadding,
          }}
        >
          <AddToHomeScreenNotice
            dismissible
            onDismiss={onDismissHomeInstallNotice}
          />
        </View>,
      );
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
            insets.bottom + spacing(HomePadding * 10),
          ),
          flexGrow: 1,
          alignItems: "stretch",
        }}
        showsVerticalScrollIndicator={false}
      >
        {scrollChildren}
      </ScrollView>

      <DiscoverFilters
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
