import { Text } from "@/components/common/Text";
import { GameUserStats } from "@/components/Home/GameUserStats";
import { HomeCard } from "@/components/Home/HomeCard";
import { HomeSectionTitle } from "@/components/Home/HomeSectionTitle";
import { EMPTY_STATS, type GameSettingsMap } from "@/data/game-menu";
import { getGameOfTheDayPath } from "@/data/game-of-the-day";
import { GAMES_DATA } from "@/data/games";
import { GameMenuInfo, isGameEnabled } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { HomePadding } from "@/styles/styles";
import { roundToPixel } from "@/utils/utils";
import { useMemo, useState, type ReactNode } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
} from "react-native";
import { RandomGameRoller } from "./RandomGameRoller";
import { flexStyles } from "@/styles/flexStyles";

type HomeTabProps = {
  allEnabledGames: HomeGameEntry[];
  allEnabledGamePaths: string[];
  unplayedGamePaths: string[];
  favorites: Set<string>;
  recentPaths: string[];
  settingsMap: GameSettingsMap;
  onToggleFavorite: (path: string) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  hasLoaded: boolean;
};

export function HomeTab({
  allEnabledGames,
  allEnabledGamePaths,
  unplayedGamePaths,
  favorites,
  recentPaths,
  settingsMap,
  onToggleFavorite,
  contentPaddingTop,
  contentPaddingBottom,
  hasLoaded,
}: HomeTabProps) {
  const { ui, spacing } = useResponsiveMetrics();
  const { width: viewportWidth, height: viewportHeight } =
    useViewportDimensions();

  const pageSidePadding = spacing(HomePadding);
  const contentMaxWidth = ui.contentMaxWidth;
  const renderedContentWidth = Math.min(contentMaxWidth, viewportWidth);
  const sectionTopPadding = spacing(14);
  const sectionBottomPadding = spacing(14);
  const cardGap = spacing(12);
  const centeredContentOffset = Math.max(
    0,
    roundToPixel((viewportWidth - contentMaxWidth) / 2),
  );
  const rowInnerWidth = Math.max(0, renderedContentWidth - pageSidePadding * 2);
  const mediumCardWidth = Math.max(
    0,
    roundToPixel(
      (rowInnerWidth - cardGap * (ui.isTablet ? 2 : 1)) / (ui.isTablet ? 3 : 2),
    ),
  );

  const [scrollY, setScrollY] = useState(0);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  };

  const favoriteKey = useMemo(
    () => Array.from(favorites).sort().join("|"),
    [favorites],
  );

  const gameOfTheDay = useMemo(() => {
    const path = getGameOfTheDayPath(allEnabledGamePaths);
    if (!path) return null;
    const game = GAMES_DATA[path];
    if (!game) return null;
    return { path, game } as { path: string; game: GameMenuInfo };
  }, [allEnabledGamePaths]);

  const jumpBackInGames = useMemo(() => {
    const orderedPaths: string[] = [...recentPaths];

    Array.from(favorites)
      .sort((a, b) =>
        (GAMES_DATA[a]?.title ?? "").localeCompare(GAMES_DATA[b]?.title ?? ""),
      )
      .forEach((path) => {
        if (!orderedPaths.includes(path)) {
          orderedPaths.push(path);
        }
      });

    return orderedPaths
      .map((path) => [path, GAMES_DATA[path]] as HomeGameEntry)
      .filter(([, game]) => isGameEnabled(game))
      .slice(0, 10);
  }, [recentPaths, favorites]);

  const becauseYouLiked = useMemo(() => {
    const favoritePaths = Array.from(favorites).filter((path) =>
      isGameEnabled(GAMES_DATA[path]),
    );
    if (favoritePaths.length === 0) {
      return null;
    }

    const seedIndex = Math.floor(Math.random() * favoritePaths.length);
    const likedPath = favoritePaths[seedIndex];
    const likedGame = GAMES_DATA[likedPath];
    const likedTags = likedGame?.tags ?? [];

    if (likedTags.length === 0) {
      return null;
    }

    const related = allEnabledGames
      .filter(
        ([path, game]) =>
          path !== likedPath &&
          (game.tags ?? []).some((tag) => likedTags.includes(tag)),
      )
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    if (related.length === 0) {
      return null;
    }

    return { title: likedGame.title, games: related };
  }, [favoriteKey, allEnabledGames]);

  const unplayedGames = useMemo(() => {
    const unplayedSet = new Set(unplayedGamePaths);
    return allEnabledGames.filter(([path]) => unplayedSet.has(path));
  }, [allEnabledGames, unplayedGamePaths]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
        gap: spacing(30),
      }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={onScroll}
    >
      {/* Game of the Day */}
      {gameOfTheDay && (
        <View
          key="game-of-the-day"
          style={{
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
          }}
        >
          <HomeSectionTitle
            title="Game of the Day"
            iconName="featured"
            pageSidePadding={pageSidePadding}
            contentMaxWidth={contentMaxWidth}
          />

          <View
            style={{
              width: "100%",
              paddingHorizontal: pageSidePadding,
              paddingTop: sectionTopPadding,
              paddingBottom: sectionBottomPadding,
            }}
          >
            <HomeCard
              path={gameOfTheDay.path}
              game={gameOfTheDay.game}
              size="large"
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.has(gameOfTheDay.path)}
              style={{ width: "100%" }}
            />
          </View>
        </View>
      )}

      {/* Jump back in */}
      {jumpBackInGames.length > 0 && (
        <View
          key="jump-back-in"
          style={{
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
          }}
        >
          <HomeSectionTitle
            title="Jump Back In"
            iconName="recent"
            pageSidePadding={pageSidePadding}
            contentMaxWidth={contentMaxWidth}
          />
          <View
            style={{
              width: "100%",
              paddingHorizontal: pageSidePadding,
              paddingTop: sectionTopPadding,
              paddingBottom: sectionBottomPadding,
              gap: cardGap,
              flexDirection: "row",
              flexWrap: "wrap",
            }}
          >
            {jumpBackInGames.map(([path, game]) => (
              <HomeCard
                key={path}
                path={path}
                game={game}
                size="medium"
                onToggleFavorite={onToggleFavorite}
                isFavorite={favorites.has(path)}
                style={{ width: mediumCardWidth, flexShrink: 0 }}
              />
            ))}
          </View>
        </View>
      )}

      {/* Roll the dice */}
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.fullWidth,
          {
            gap: spacing(6),
          },
        ]}
      >
        <View
          style={{
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: pageSidePadding,
          }}
        >
          <HomeSectionTitle
            title="Play a Random Game"
            iconName="dice"
            pageSidePadding={0}
            contentMaxWidth={contentMaxWidth}
          />
        </View>

        <RandomGameRoller
          allEntries={allEnabledGames}
          unplayedEntries={unplayedGames}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          hasLoaded={hasLoaded}
          contentMaxWidth={contentMaxWidth}
          pageSidePadding={pageSidePadding}
          scrollY={scrollY}
          viewportHeight={viewportHeight}
        />
      </View>

      {/* Because you liked ... */}
      {becauseYouLiked && (
        <View
          key="because-you-liked"
          style={{
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
          }}
        >
          <HomeSectionTitle
            title={`Because you liked "${becauseYouLiked.title}"`}
            iconName="star"
            pageSidePadding={pageSidePadding}
            contentMaxWidth={contentMaxWidth}
          />

          <View
            style={{
              width: "100%",
              paddingHorizontal: pageSidePadding,
              paddingTop: sectionTopPadding,
              paddingBottom: sectionBottomPadding,
              gap: cardGap,
            }}
          >
            {becauseYouLiked.games.map(([path, game]) => (
              <HomeCard
                key={path}
                path={path}
                game={game}
                size="large"
                onToggleFavorite={onToggleFavorite}
                isFavorite={favorites.has(path)}
                style={{ width: "100%" }}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
