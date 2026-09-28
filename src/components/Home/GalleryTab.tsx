import { Text } from "@/components/common/Text";
import { GameInfoPanel } from "@/components/ui/GameInfoPanel";
import {
  hairline,
  Kicker,
  PageTitle,
  RoundButton,
  SegmentBar,
  useSurfaceStyle,
} from "@/components/ui/Nocturne";
import type { GameSettingsMap } from "@/data/game-menu";
import {
  GAME_FULL_THUMBNAIL_ASSETS,
  GAME_THUMBNAIL_ASPECTS,
} from "@/data/game-thumbnails";
import { GameTag } from "@/data/games-data";
import { GAMES_DATA } from "@/data/games-registry";
import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { layoutDims, rgba, theme } from "@/styles/styles";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabReadyImage } from "./TabReady";

/** One room per family of games. */
export const GALLERY_ROOMS: GameTag[] = [
  GameTag.KlondikeFamily,
  GameTag.YukonFamily,
  GameTag.FreeCellFamily,
  GameTag.SpiderFamily,
  GameTag.FortyThievesFamily,
  GameTag.CastlesAndFans,
  GameTag.FoundationBuilders,
  GameTag.DoubleDeckers,
  GameTag.ClearTheBoard,
  GameTag.PairMatching,
  GameTag.Puzzles,
  GameTag.Sports,
  GameTag.PokerAndCribbage,
  GameTag.CardCombat,
  GameTag.DungeonCrawler,
  GameTag.ModernMechanics,
];

/** The height of the works hung in a room. */
const WORK_HEIGHT = 92;

type GalleryTabProps = {
  allEnabledGames: HomeGameEntry[];
  settingsMap: GameSettingsMap;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  onScrolledChange: (isScrolled: boolean) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
};

/**
 * The game art as a gallery: a room per family of games, where a game's work
 * is acquired by winning the game once.
 */
export function GalleryTab({
  allEnabledGames,
  settingsMap,
  favorites,
  onToggleFavorite,
  onScrolledChange,
  contentPaddingTop,
  contentPaddingBottom,
}: GalleryTabProps) {
  const { ui, spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const surface = useSurfaceStyle();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const pageSidePadding = spacing(layoutDims.pagePadding);

  const hasWon = (path: string) => (settingsMap[path]?.stats?.wins ?? 0) > 0;

  const rooms = useMemo(
    () =>
      [...GALLERY_ROOMS]
        .sort((a, b) => t(`tags.${a}`).localeCompare(t(`tags.${b}`), language))
        .map((tag) => ({
          tag,
          games: allEnabledGames.filter(([, game]) => game.tags[0] === tag),
        }))
        .filter((room) => room.games.length > 0),
    [allEnabledGames, language, t],
  );
  // Every work in gallery order, for stepping from one to the next.
  const allWorks = useMemo(
    () => rooms.flatMap((room) => room.games.map(([path]) => path)),
    [rooms],
  );
  const acquired = allWorks.filter(hasWon).length;
  const roomsCompleted = rooms.filter((room) =>
    room.games.every(([path]) => hasWon(path)),
  ).length;

  const stat = (value: string, label: string) => (
    <View style={{ flex: 1, gap: spacing(4) }}>
      <Text
        weight={500}
        style={{ fontSize: font(26), lineHeight: font(30) }}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text size="xs" weight={300} color={theme.dim}>
        {label}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          alignSelf: "center",
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
          paddingHorizontal: pageSidePadding,
          gap: spacing(14),
        }}
        onScroll={(event) =>
          onScrolledChange(event.nativeEvent.contentOffset.y > 1)
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <PageTitle>{t("tabs.collect")}</PageTitle>
        <View style={{ flexDirection: "row", gap: spacing(16), marginTop: spacing(4) }}>
          {stat(`${acquired} / ${allWorks.length}`, t("gallery.acquired"))}
          {stat(`${roomsCompleted} / ${rooms.length}`, t("gallery.roomsCompleted"))}
        </View>
        <SegmentBar
          done={acquired}
          total={allWorks.length}
          max={56}
          style={{ marginBottom: spacing(10) }}
        />

        {rooms.map(({ tag, games }) => {
          const won = games.filter(([path]) => hasWon(path)).length;
          const complete = won === games.length;
          return (
            <View
              key={tag}
              style={[
                surface,
                {
                  paddingVertical: spacing(16),
                  gap: spacing(14),
                  borderColor: complete ? rgba(theme.accent, 0.35) : hairline(),
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  paddingHorizontal: spacing(16),
                }}
              >
                <Text size="lg" weight={500} numberOfLines={1} style={{ flex: 1 }}>
                  {t(`tags.${tag}`)}
                </Text>
                <Text
                  size="xs"
                  weight={400}
                  color={complete ? theme.accent : theme.dim}
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {won} / {games.length}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: spacing(16),
                  gap: spacing(10),
                  alignItems: "flex-end",
                }}
              >
                {games.map(([path, game]) => (
                  <HungWork
                    key={path}
                    thumbnail={game.thumbnail}
                    collected={hasWon(path)}
                    height={spacing(WORK_HEIGHT)}
                    label={localizeGameTitle(game, path, language)}
                    onPress={() => setOpenPath(path)}
                  />
                ))}
              </ScrollView>
              <SegmentBar
                done={won}
                total={games.length}
                style={{ marginHorizontal: spacing(16) }}
              />
            </View>
          );
        })}
      </ScrollView>

      {openPath && (
        <WorkViewer
          path={openPath}
          collected={hasWon(openPath)}
          isFavorite={favorites.has(openPath)}
          onToggleFavorite={onToggleFavorite}
          onClose={() => setOpenPath(null)}
          onStep={(step) => {
            const index = allWorks.indexOf(openPath);
            const next =
              allWorks[(index + step + allWorks.length) % allWorks.length];
            setOpenPath(next);
          }}
        />
      )}
    </View>
  );
}

/** A work on a room's wall: faint until its game is won. */
function HungWork({
  thumbnail,
  collected,
  height,
  label,
  onPress,
}: {
  thumbnail: HomeGameEntry[1]["thumbnail"];
  collected: boolean;
  height: number;
  label: string;
  onPress: () => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const source = thumbnail ? GAME_FULL_THUMBNAIL_ASSETS[thumbnail] : null;
  const ready = useTabReadyImage(source);
  const aspect = thumbnail ? GAME_THUMBNAIL_ASPECTS[thumbnail] : 0.8;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Image
        source={source}
        cachePolicy="memory"
        contentFit="cover"
        style={{
          height,
          width: height * aspect,
          borderRadius: spacing(3),
          opacity: collected ? 1 : 0.1,
        }}
        {...ready}
      />
    </Pressable>
  );
}

/**
 * A work up close, over the whole tab (the tab bar stays): the painting and
 * its label in the dark, then the game's own panel.
 */
function WorkViewer({
  path,
  collected,
  isFavorite,
  onToggleFavorite,
  onClose,
  onStep,
}: {
  path: string;
  collected: boolean;
  isFavorite: boolean;
  onToggleFavorite: (path: string) => void;
  onClose: () => void;
  onStep: (step: 1 | -1) => void;
}) {
  const { spacing, ui } = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const { collectedTaoIds, collectedQuoteIds } = useCampaignProgress();
  const game = GAMES_DATA[path];
  const credit = game.thumbnailCredit;
  const [artBox, setArtBox] = useState({ width: 0, height: 0 });
  const aspect = game.thumbnail ? GAME_THUMBNAIL_ASPECTS[game.thumbnail] : 0.8;
  const artWidth = Math.min(artBox.width, artBox.height * aspect);
  // Clear the floating tab bar, which stays in front.
  const bottomReserve =
    spacing(layoutDims.tabBarHeight + layoutDims.pagePadding) + insets.bottom;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={{
        position: Platform.OS === "web" ? ("fixed" as "absolute") : "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9,
        backgroundColor: theme.night,
      }}
    >
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          alignSelf: "center",
          paddingTop: insets.top + spacing(12),
          paddingBottom: bottomReserve,
          paddingHorizontal: spacing(layoutDims.pagePadding),
          gap: spacing(14),
        }}
      >
        <View style={{ flexDirection: "row" }}>
          <RoundButton iconName="close" onPress={onClose} glass />
        </View>

        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          onLayout={(event) =>
            setArtBox({
              width: event.nativeEvent.layout.width,
              height: event.nativeEvent.layout.height,
            })
          }
        >
          {collected && game.thumbnail ? (
            artWidth > 0 && (
              <Image
                key={path}
                source={GAME_FULL_THUMBNAIL_ASSETS[game.thumbnail]}
                cachePolicy="memory"
                contentFit="contain"
                transition={300}
                style={{ width: artWidth, height: artWidth / aspect }}
              />
            )
          ) : (
            <View
              style={{
                width: "70%",
                aspectRatio: aspect,
                maxHeight: "100%",
                borderRadius: spacing(4),
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: rgba(theme.ink, 0.15),
                alignItems: "center",
                justifyContent: "center",
                padding: spacing(20),
              }}
            >
              <Text
                serif
                italic
                size="lg"
                color={theme.dim}
                style={{ textAlign: "center" }}
              >
                {t("gallery.uncollected", {
                  game: localizeGameTitle(game, path, language),
                })}
              </Text>
            </View>
          )}
        </View>

        {/* The work's label, and stepping between works. */}
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: spacing(12) }}
        >
          <RoundButton
            iconName="chevron-left"
            accessibilityLabel={t("gallery.previous")}
            onPress={() => onStep(-1)}
          />
          <View style={{ flex: 1, alignItems: "center", gap: spacing(2) }}>
            {collected && credit ? (
              <>
                <Text
                  serif
                  italic
                  size="xl"
                  style={{ textAlign: "center" }}
                  numberOfLines={2}
                >
                  {credit.title}
                </Text>
                <Text serif size="sm" color={theme.dim} style={{ textAlign: "center" }}>
                  {[credit.artistName, credit.date].filter(Boolean).join(", ")}
                </Text>
                {credit.sourceName ? (
                  <Kicker color={theme.faint} style={{ marginTop: spacing(4) }}>
                    {credit.sourceName}
                  </Kicker>
                ) : null}
              </>
            ) : null}
          </View>
          <RoundButton
            iconName="chevron-right"
            accessibilityLabel={t("gallery.next")}
            onPress={() => onStep(1)}
          />
        </View>

        <GameInfoPanel
          path={path}
          leading="favorite"
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          collectedTaoIds={collectedTaoIds}
          collectedQuoteIds={collectedQuoteIds}
        />
      </View>
    </Animated.View>
  );
}
