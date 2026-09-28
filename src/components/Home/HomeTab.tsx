import { Logo } from "@/components/common/Logo";
import { ArtShelf, ContinueCard } from "@/components/Home/HomeArt";
import { RoundButton, SectionTitle } from "@/components/ui/Nocturne";
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
import { layoutDims } from "@/styles/styles";
import { isLocalDevEnvironment } from "@/utils/utils";
import { type ReactNode, useMemo } from "react";
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
  onOpenStats?: () => void;
  onOpenSettings?: () => void;
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
  onOpenStats,
  onOpenSettings,
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

  const section = (title: string, children: ReactNode) => (
    <View
      style={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }}
    >
      <View style={{ paddingHorizontal: scaledPageSidePadding }}>
        <SectionTitle>{title}</SectionTitle>
      </View>
      {children}
    </View>
  );
  const lastPlayed = jumpBackInGames[0];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
          gap: spacing(36),
        }}
        onScroll={(event) =>
          onScrolledChange(event.nativeEvent.contentOffset.y > 1)
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: scaledPageSidePadding,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing(10),
          }}
        >
          <View style={{ flex: 1 }}>
            <Logo height={spacing(30)} />
          </View>
          <RoundButton
            iconName="chart"
            accessibilityLabel={t("header.stats")}
            onPress={() => onOpenStats?.()}
          />
          <RoundButton
            iconName="settings"
            accessibilityLabel={t("header.settings")}
            onPress={() => onOpenSettings?.()}
          />
        </View>

        {/* Local-only games */}
        {isLocalDevEnvironment() &&
          localOnlyGames.length > 0 &&
          section(
            t("sections.localOnly"),
            <ArtShelf
              games={localOnlyGames as HomeGameEntry[]}
              pageSidePadding={scaledPageSidePadding}
            />,
          )}

        {showEasyGames &&
          section(
            t("sections.easyGames"),
            <ArtShelf
              games={easyGames}
              pageSidePadding={scaledPageSidePadding}
            />,
          )}

        {lastPlayed &&
          section(
            t("sections.continue"),
            <View style={{ paddingHorizontal: scaledPageSidePadding }}>
              <ContinueCard path={lastPlayed[0]} game={lastPlayed[1]} />
            </View>,
          )}

        {favoriteGames.length > 0 &&
          section(
            t("sections.favorites"),
            <ArtShelf
              games={favoriteGames}
              pageSidePadding={scaledPageSidePadding}
            />,
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
