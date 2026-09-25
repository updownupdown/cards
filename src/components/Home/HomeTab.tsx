import { HomeCard } from "@/components/Home/HomeCard";
import { NODES_HOME_TAB_INDEX } from "@/components/Home/home-view-state";
import { HomeSectionTitle } from "@/components/Home/HomeSectionTitle";
import { DealMeAGame } from "@/components/Home/DealMeAGame";
import { GameOfTheDaySection } from "@/components/Home/GameOfTheDaySection";
import { HomeCardFact } from "@/components/Home/HomeCardFact";
import {
  type GuideBox,
  StartHereGuide,
} from "@/components/Home/StartHereGuide";
import { isGameEnabled } from "@/data/games-data";
import { GAMES_DATA } from "@/data/games-registry";
import { getNextNodePaths, NODES_START_PATH } from "@/data/nodes-map";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useNodesProgress } from "@/hooks/useNodesProgress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { Colors, layoutDims, rgba } from "@/styles/styles";
import { isLocalDevEnvironment, roundToPixel } from "@/utils/utils";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "../Button/Button";

type HomeTabProps = {
  allEnabledGames: HomeGameEntry[];
  unplayedGamePaths: string[];
  favorites: Set<string>;
  recentPaths: string[];
  onToggleFavorite: (path: string) => void;
  /** The guide waits for settings, so it never flashes up and away. */
  settingsLoaded: boolean;
  guideDismissed: Record<GuideBox, boolean>;
  onDismissGuide: (box: GuideBox) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  onSelectTab: (index: number) => void;
  onScrolledChange: (isScrolled: boolean) => void;
};

export function HomeTab({
  allEnabledGames,
  unplayedGamePaths,
  favorites,
  recentPaths,
  onToggleFavorite,
  settingsLoaded,
  guideDismissed,
  onDismissGuide,
  contentPaddingTop,
  contentPaddingBottom,
  onSelectTab,
  onScrolledChange,
}: HomeTabProps) {
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const { ui, spacing } = useResponsiveMetrics();
  const { width: viewportWidth } = useViewportDimensions();

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
        .slice(0, 4),
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

  const {
    isLoading: nodesLoading,
    wonPaths,
    unlockedPaths,
  } = useNodesProgress();
  const nextCampaignPaths = useMemo(
    () =>
      getNextNodePaths(wonPaths, unlockedPaths).filter((path) =>
        isGameEnabled(GAMES_DATA[path]),
      ),
    [wonPaths, unlockedPaths],
  );
  // The guide's Campaign box is for newcomers; a few games in, the map's
  // next games take its place.
  const campaignNewcomer = !nodesLoading && unlockedPaths.size < 3;
  const showCampaignGuide =
    settingsLoaded && campaignNewcomer && !guideDismissed.campaign;
  const showCampaign =
    settingsLoaded &&
    !nodesLoading &&
    !showCampaignGuide &&
    nextCampaignPaths.length > 0;

  const localOnlyGames = Object.entries(GAMES_DATA).filter(
    ([, game]) => game.enabledOnLocalOnly,
  );

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

        {/* Getting started. Held back until the Campaign progress is in,
            which decides whether its box shows: drawing the others first
            would shove them down, animated, when it arrives. */}
        {settingsLoaded && !nodesLoading && (
          <StartHereGuide
            allEnabledGames={allEnabledGames}
            dismissed={guideDismissed}
            showCampaign={campaignNewcomer}
            campaignStarted={unlockedPaths.size > 1}
            campaignNextPath={nextCampaignPaths[0] ?? NODES_START_PATH}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            onSelectTab={onSelectTab}
            onDismiss={onDismissGuide}
            pageSidePadding={scaledPageSidePadding}
            contentMaxWidth={contentMaxWidth}
          />
        )}

        <GameOfTheDaySection
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          pageSidePadding={scaledPageSidePadding}
          contentMaxWidth={contentMaxWidth}
          pageWidth={renderedContentWidth}
        />

        {/* Jump back in */}
        {jumpBackInGames.length > 0 && (
          <View
            style={{
              width: "100%",
              maxWidth: contentMaxWidth,
              alignSelf: "center",
            }}
          >
            <HomeSectionTitle
              title={t("sections.jumpBackIn")}
              iconName="recent"
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

        {/* Favorites */}
        {favoriteGames.length > 0 && (
          <View
            style={{
              width: "100%",
              maxWidth: contentMaxWidth,
              alignSelf: "center",
            }}
          >
            <HomeSectionTitle
              title={t("sections.favorites")}
              iconName="star"
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
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              {favoriteGames.map(([path, game]) => (
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
