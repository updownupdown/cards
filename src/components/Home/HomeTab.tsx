import { HomeCard } from "@/components/Home/HomeCard";
import { HomeSectionTitle } from "@/components/Home/HomeSectionTitle";
import { getGameOfTheDayPath } from "@/data/game-of-the-day";
import { GameMenuInfo, GameTag, isGameEnabled } from "@/data/games-data";
import { GAMES_DATA } from "@/data/games-registry";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { Colors, layoutDims } from "@/styles/styles";
import { isLocalDevEnvironment, roundToPixel } from "@/utils/utils";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "../common/Text";
import { Button } from "../Button/Button";

type HomeTabProps = {
  allEnabledGames: HomeGameEntry[];
  allEnabledGamePaths: string[];
  favorites: Set<string>;
  recentPaths: string[];
  onToggleFavorite: (path: string) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  onSelectTab: (index: number) => void;
};

export function HomeTab({
  allEnabledGames,
  allEnabledGamePaths,
  favorites,
  recentPaths,
  onToggleFavorite,
  contentPaddingTop,
  contentPaddingBottom,
  onSelectTab,
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

  const gameOfTheDay = useMemo(() => {
    const path = getGameOfTheDayPath(allEnabledGamePaths);
    if (!path) return null;
    const game = GAMES_DATA[path];
    if (!game) return null;
    return { path, game } as { path: string; game: GameMenuInfo };
  }, [allEnabledGamePaths]);

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

    return {
      title: localizeGameTitle(likedGame, likedPath, language),
      games: related,
    };
  }, [allEnabledGames, language]);

  const fewPlayedGames = recentPaths.length < 3;

  const getStartedGames = useMemo(() => {
    const easyToLearnGames = allEnabledGames.filter(([, game]) =>
      (game.tags ?? []).includes(GameTag.EasyToLearn),
    );
    return easyToLearnGames.sort(() => Math.random() - 0.5).slice(0, 5);
  }, [allEnabledGames]);

  const localOnlyGames = Object.entries(GAMES_DATA).filter(
    ([, game]) => game.enabledOnLocalOnly,
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
        gap: spacing(40),
      }}
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

      {/* No played games */}
      {fewPlayedGames && (
        <View
          style={{
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: scaledPageSidePadding,
          }}
        >
          <HomeSectionTitle
            title={t("sections.startEasy")}
            iconName="spades"
            pageSidePadding={0}
            contentMaxWidth={contentMaxWidth}
          />

          {/* Recommend games from the easy to learn tag */}
          <View
            style={{
              width: "100%",
              paddingTop: sectionTopPadding,
              paddingBottom: sectionBottomPadding,
              gap: cardGap,
            }}
          >
            <Text style={{ paddingBottom: spacing(20) }}>
              {t("sections.startEasyIntro")}
            </Text>

            {getStartedGames.map(([path, game]) => (
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

            <Button
              onPress={() => {
                // Switch to the Collect tab
                onSelectTab(1);
              }}
              text={t("sections.discoverMore")}
              style={{ marginTop: spacing(20) }}
              textStyle={{ textTransform: "none" }}
              theme={Colors.suitsRed}
              taller
            />
          </View>
        </View>
      )}

      {/* Game of the Day */}
      {gameOfTheDay && (
        <View
          style={{
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
          }}
        >
          <HomeSectionTitle
            title={t("sections.gameOfTheDay")}
            iconName="featured"
            pageSidePadding={scaledPageSidePadding}
            contentMaxWidth={contentMaxWidth}
          />

          <View
            style={{
              width: "100%",
              paddingHorizontal: scaledPageSidePadding,
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

      {/* Because you liked ... */}
      {becauseYouLiked && (
        <View
          style={{
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
          }}
        >
          <HomeSectionTitle
            title={t("sections.becauseYouLiked", {
              title: becauseYouLiked.title,
            })}
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
