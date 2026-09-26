import { HomeCard } from "@/components/Home/HomeCard";
import { HomeSectionTitle } from "@/components/Home/HomeSectionTitle";
import { DealMeAGame } from "@/components/Home/DealMeAGame";
import { GameOfTheDaySection } from "@/components/Home/GameOfTheDaySection";
import { HomeCardFact } from "@/components/Home/HomeCardFact";
import { isGameEnabled } from "@/data/games-data";
import { GAMES_DATA } from "@/data/games-registry";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import type { IconName } from "@/icons";
import { layoutDims } from "@/styles/styles";
import { isLocalDevEnvironment, roundToPixel } from "@/utils/utils";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useTabReadyHold } from "./TabReady";

const EASY_GAME_COUNT = 6;
const JUMP_BACK_IN_COUNT = 6;

type HomeTabProps = {
  allEnabledGames: HomeGameEntry[];
  unplayedGamePaths: string[];
  favorites: Set<string>;
  recentPaths: string[];
  onToggleFavorite: (path: string) => void;
  /** Favorites and recent games are in, which decide what shows. */
  dataLoaded: boolean;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  onScrolledChange: (isScrolled: boolean) => void;
};

export function HomeTab({
  allEnabledGames,
  unplayedGamePaths,
  favorites,
  recentPaths,
  onToggleFavorite,
  dataLoaded,
  contentPaddingTop,
  contentPaddingBottom,
  onScrolledChange,
}: HomeTabProps) {
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const { ui, spacing } = useResponsiveMetrics();
  const { width: viewportWidth } = useViewportDimensions();
  // Kept hidden until then, so the easy games never show and then vanish.
  useTabReadyHold(!dataLoaded);

  const scaledPageSidePadding = spacing(layoutDims.pagePadding);
  const contentMaxWidth = ui.contentMaxWidth;
  const renderedContentWidth = Math.min(contentMaxWidth, viewportWidth);
  const sectionTopPadding = spacing(14);
  const sectionBottomPadding = spacing(14);
  const cardGap = spacing(12);
  const rowInnerWidth = Math.max(
    0,
    renderedContentWidth - scaledPageSidePadding * 2,
  );
  const mediumCardWidth = Math.max(
    0,
    roundToPixel(
      (rowInnerWidth - cardGap * (ui.isTablet ? 2 : 1)) / (ui.isTablet ? 3 : 2),
    ) - 1,
  );

  const jumpBackInGames = useMemo(
    () =>
      recentPaths
        .map((path) => [path, GAMES_DATA[path]] as HomeGameEntry)
        .filter(([, game]) => isGameEnabled(game))
        .slice(0, JUMP_BACK_IN_COUNT),
    [recentPaths],
  );

  const favoriteGames = useMemo(
    () =>
      Array.from(favorites)
        .map((path) => [path, GAMES_DATA[path]] as HomeGameEntry)
        .filter(([, game]) => isGameEnabled(game))
        .sort(([pathA, gameA], [pathB, gameB]) =>
          localizeGameTitle(gameA, pathA, language).localeCompare(
            localizeGameTitle(gameB, pathB, language),
            language,
          ),
        ),
    [favorites, language],
  );

  // For newcomers: shown until there is at least one game both to jump back
  // into and among the favorites.
  const easyGames = useMemo(
    () =>
      [...allEnabledGames]
        .sort(
          ([, a], [, b]) =>
            a.rating.difficulty - b.rating.difficulty ||
            a.rating.complexity - b.rating.complexity,
        )
        .slice(0, EASY_GAME_COUNT),
    [allEnabledGames],
  );
  const showEasyGames =
    dataLoaded && (jumpBackInGames.length === 0 || favoriteGames.length === 0);

  const localOnlyGames = Object.entries(GAMES_DATA).filter(
    ([, game]) => game.enabledOnLocalOnly,
  );

  const gridProps = {
    favorites,
    onToggleFavorite,
    cardWidth: mediumCardWidth,
    pageSidePadding: scaledPageSidePadding,
    contentMaxWidth,
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
          gap: spacing(52),
        }}
        onScroll={(event) =>
          onScrolledChange(event.nativeEvent.contentOffset.y > 1)
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Local-only games */}
        {isLocalDevEnvironment() && localOnlyGames.length > 0 && (
          <View
            style={{
              width: "100%",
              maxWidth: contentMaxWidth,
              alignSelf: "center",
            }}
          >
            <HomeSectionTitle
              title={t("sections.localOnly")}
              pageSidePadding={scaledPageSidePadding}
              contentMaxWidth={contentMaxWidth}
            />

            <View
              style={{
                width: "100%",
                paddingHorizontal: scaledPageSidePadding,
                paddingTop: sectionTopPadding,
                paddingBottom: sectionBottomPadding,
                gap: cardGap,
              }}
            >
              {localOnlyGames.map(([path, game]) => (
                <HomeCard
                  key={path}
                  path={path}
                  game={game}
                  size="small"
                  onToggleFavorite={onToggleFavorite}
                  isFavorite={favorites.has(path)}
                  style={{ width: "100%" }}
                />
              ))}
            </View>
          </View>
        )}

        {showEasyGames && (
          <CardGridSection
            title={t("sections.easyGames")}
            iconName="easy"
            games={easyGames}
            {...gridProps}
          />
        )}

        {jumpBackInGames.length > 0 && (
          <CardGridSection
            title={t("sections.jumpBackIn")}
            iconName="recent"
            games={jumpBackInGames}
            {...gridProps}
          />
        )}

        {favoriteGames.length > 0 && (
          <CardGridSection
            title={t("sections.favorites")}
            iconName="star"
            games={favoriteGames}
            {...gridProps}
          />
        )}

        <GameOfTheDaySection
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          pageSidePadding={scaledPageSidePadding}
          contentMaxWidth={contentMaxWidth}
          pageWidth={renderedContentWidth}
        />

        {/* Random deal */}
        <DealMeAGame
          allEnabledGames={allEnabledGames}
          unplayedGamePaths={unplayedGamePaths}
          favorites={favorites}
          pageSidePadding={scaledPageSidePadding}
          contentMaxWidth={contentMaxWidth}
        />

        <HomeCardFact
          pageSidePadding={scaledPageSidePadding}
          contentMaxWidth={contentMaxWidth}
        />
      </ScrollView>
    </View>
  );
}

/** A titled section of medium game cards, wrapping onto new rows. */
function CardGridSection({
  title,
  iconName,
  games,
  favorites,
  onToggleFavorite,
  cardWidth,
  pageSidePadding,
  contentMaxWidth,
}: {
  title: string;
  iconName: IconName;
  games: HomeGameEntry[];
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  cardWidth: number;
  pageSidePadding: number;
  contentMaxWidth: number;
}) {
  const { spacing } = useResponsiveMetrics();
  return (
    <View
      style={{
        width: "100%",
        maxWidth: contentMaxWidth,
        alignSelf: "center",
      }}
    >
      <HomeSectionTitle
        title={title}
        iconName={iconName}
        pageSidePadding={pageSidePadding}
        contentMaxWidth={contentMaxWidth}
      />
      <View
        style={{
          width: "100%",
          paddingHorizontal: pageSidePadding,
          paddingTop: spacing(14),
          paddingBottom: spacing(14),
          gap: spacing(12),
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        {games.map(([path, game]) => (
          <HomeCard
            key={path}
            path={path}
            game={game}
            size="medium"
            onToggleFavorite={onToggleFavorite}
            isFavorite={favorites.has(path)}
            style={{ width: cardWidth, flexShrink: 0 }}
          />
        ))}
      </View>
    </View>
  );
}
