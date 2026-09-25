import { Button } from "@/components/Button/Button";
import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { COLLECT_TAGS } from "@/components/Home/CollectTab";
import { HomeCard } from "@/components/Home/HomeCard";
import {
  COLLECT_HOME_TAB_INDEX,
  NODES_HOME_TAB_INDEX,
  requestCollectTag,
} from "@/components/Home/home-view-state";
import { GAMES_DATA } from "@/data/games-registry";
import { NODES_START_PATH } from "@/data/nodes-map";
import { setLastPlayedNode } from "@/data/nodes-progress";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { Colors } from "@/styles/styles";
import { type Href } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
} from "react-native-reanimated";

const EASY_GAME_COUNT = 8;

export type GuideBox = "easy" | "campaign" | "genres";

type StartHereGuideProps = {
  allEnabledGames: HomeGameEntry[];
  /** Boxes the player has closed. */
  dismissed: Record<GuideBox, boolean>;
  /** False once the player is well into the Campaign. */
  showCampaign: boolean;
  /** Games past the first have been unlocked on the Campaign map. */
  campaignStarted: boolean;
  /** The Campaign game to play next, shown in its box. */
  campaignNextPath: string;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  onSelectTab: (index: number) => void;
  onDismiss: (box: GuideBox) => void;
  pageSidePadding: number;
  contentMaxWidth: number;
};

/**
 * Three ways into the app for new players: the easiest games, the Campaign,
 * and the collection. Each box is shown until closed.
 */
export function StartHereGuide({
  allEnabledGames,
  dismissed,
  showCampaign,
  campaignStarted,
  campaignNextPath,
  favorites,
  onToggleFavorite,
  onSelectTab,
  onDismiss,
  pageSidePadding,
  contentMaxWidth,
}: StartHereGuideProps) {
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const { spacing } = useResponsiveMetrics();
  const tilePadding = spacing(16);

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

  // Categories as the Collect tab lists them: alphabetical, each counting
  // the games filed under it first.
  const categories = useMemo(
    () =>
      COLLECT_TAGS.map((tag) => ({
        tag,
        title: t(`tags.${tag}`),
        count: allEnabledGames.filter(([, game]) => game.tags[0] === tag)
          .length,
      }))
        .filter(({ count }) => count > 0)
        .sort((a, b) => a.title.localeCompare(b.title, language)),
    [allEnabledGames, language, t],
  );

  const campaignGame = GAMES_DATA[campaignNextPath];

  const showEasy = !dismissed.easy;
  const showCampaignTile = showCampaign && !dismissed.campaign;
  const showGenres = !dismissed.genres;
  if (!showEasy && !showCampaignTile && !showGenres) return null;

  // Boxes fade out when closed, not when the whole Home tab goes: switching
  // tabs would otherwise hold them on screen, fading, while the next tab
  // mounts in the same place, which can crash React Native's mounting.
  return (
    <LayoutAnimationConfig skipExiting>
      <View
        style={{
          width: "100%",
          maxWidth: contentMaxWidth,
          alignSelf: "center",
          paddingHorizontal: pageSidePadding,
          gap: spacing(16),
        }}
      >
        {/* Easy games */}
        {showEasy && (
          <Tile
            title={t("guide.easy.title")}
            body={t("guide.easy.body")}
            padding={tilePadding}
            onDismiss={() => onDismiss("easy")}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              // Run to the tile's edges, so cards slide out of view cleanly.
              style={{ marginHorizontal: -tilePadding }}
              contentContainerStyle={{
                paddingHorizontal: tilePadding,
                gap: spacing(10),
              }}
            >
              {easyGames.map(([path, game]) => (
                <HomeCard
                  key={path}
                  path={path}
                  game={game}
                  size="medium"
                  onToggleFavorite={onToggleFavorite}
                  isFavorite={favorites.has(path)}
                  style={{ width: spacing(150) }}
                />
              ))}
            </ScrollView>
          </Tile>
        )}

        {/* Campaign mode */}
        {showCampaignTile && (
          <Tile
            title={t("guide.campaign.title")}
            body={t("guide.campaign.body")}
            padding={tilePadding}
            onDismiss={() => onDismiss("campaign")}
          >
            {campaignGame && (
              <HomeCard
                path={campaignNextPath}
                game={campaignGame}
                size="large"
                campaign
                onToggleFavorite={onToggleFavorite}
                isFavorite={favorites.has(campaignNextPath)}
                style={{ width: "100%" }}
              />
            )}
            {campaignStarted ? (
              <Button
                text={t("guide.campaign.resume")}
                iconName="nodes"
                iconSize={spacing(22)}
                size="sm"
                taller
                uppercase={false}
                theme={Colors.suitsRed}
                onPress={() => onSelectTab(NODES_HOME_TAB_INDEX)}
              />
            ) : (
              <Button
                text={t("guide.campaign.start")}
                iconName="play-hand"
                iconSize={spacing(22)}
                size="sm"
                taller
                uppercase={false}
                theme={Colors.suitsRed}
                onPress={() => {
                  void setLastPlayedNode(NODES_START_PATH);
                  launchGame({
                    pathname: NODES_START_PATH as string,
                    params: { mode: "nodes" },
                  } as Href);
                }}
              />
            )}
          </Tile>
        )}

        {/* Collect them all */}
        {showGenres && (
          <Tile
            title={t("guide.genres.title")}
            body={t("guide.genres.body", {
              games: allEnabledGames.length,
              categories: categories.length,
            })}
            padding={tilePadding}
            onDismiss={() => onDismiss("genres")}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -tilePadding }}
              contentContainerStyle={{
                paddingHorizontal: tilePadding,
                gap: spacing(10),
              }}
            >
              {categories.map(({ tag, title, count }) => (
                <Pressable
                  key={tag}
                  accessibilityRole="button"
                  onPress={() => {
                    requestCollectTag(tag);
                    onSelectTab(COLLECT_HOME_TAB_INDEX);
                  }}
                  style={({ pressed }) => ({
                    width: spacing(130),
                    minHeight: spacing(72),
                    justifyContent: "flex-end",
                    gap: spacing(4),
                    padding: spacing(12),
                    borderRadius: spacing(10),
                    borderWidth: 1,
                    borderColor: Colors.K800,
                    backgroundColor: pressed ? Colors.K800 : Colors.K850,
                  })}
                >
                  <Text
                    size="sm"
                    weight={600}
                    color={Colors.white}
                    lineHeight={1.15}
                  >
                    {title}
                  </Text>
                  <Text
                    size="xs"
                    weight={400}
                    color={Colors.K400}
                    lineHeight={1}
                  >
                    {t("guide.genres.gameCount", { count })}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Tile>
        )}
      </View>
    </LayoutAnimationConfig>
  );
}

/**
 * A getting-started box, coloured like the Collect tab's categories, with
 * its heading and a close button side by side at the top.
 */
function Tile({
  title,
  body,
  padding,
  onDismiss,
  children,
}: {
  title: string;
  body: string;
  padding: number;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation("home");
  const { spacing } = useResponsiveMetrics();
  return (
    <Animated.View
      exiting={FadeOut.duration(180)}
      layout={LinearTransition.duration(220)}
      style={{
        borderRadius: spacing(12),
        borderWidth: 1,
        borderColor: Colors.K850,
        backgroundColor: Colors.K875,
        padding,
        gap: spacing(14),
        ...homeSurfaceShadow(spacing),
      }}
    >
      <View style={{ gap: spacing(8) }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing(10),
          }}
        >
          <Text
            size="lg"
            weight={600}
            color={Colors.white}
            lineHeight={1.1}
            style={{ flex: 1 }}
          >
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("guide.dismiss")}
            hitSlop={spacing(10)}
            onPress={onDismiss}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: spacing(2),
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text size="xs" weight={400} color={Colors.K400} lineHeight={1}>
              {t("guide.dismiss")}
            </Text>
            <Icon name="close" size={spacing(18)} color={Colors.K400} />
          </Pressable>
        </View>
        <Text size="sm" weight={300} color={Colors.K300} lineHeight={1.35}>
          {body}
        </Text>
      </View>
      {children}
    </Animated.View>
  );
}
