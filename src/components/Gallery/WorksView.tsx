import { Text } from "@/components/common/Text";
import { COLLECT_HOME_TAB_INDEX } from "@/components/Home/home-view-state";
import { useStarfield } from "@/components/Home/Starfield";
import { useTabReadyImage } from "@/components/Home/TabReady";
import { useBarSideInset } from "@/components/ui/FloatingBar";
import { Pill } from "@/components/ui/Nocturne";
import {
  ART_ERAS,
  ART_MEDIA,
  ART_REGIONS,
  ART_STYLES,
  artEra,
  getArtworkInfo,
} from "@/data/artworks";
import {
  GAME_FULL_THUMBNAIL_ASSETS,
  GAME_THUMBNAIL_ASPECTS,
} from "@/data/game-thumbnails";
import { GameTag, type GameMenuInfo } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { Colors, rgba, theme } from "@/styles/styles";
import { Image } from "expo-image";
import { WorkPlaceholder } from "./shared";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

/** One shelf per family of games, under Game Category. */
const GAME_CATEGORIES: GameTag[] = [
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

export const WORK_GROUPINGS = [
  "era",
  "style",
  "category",
  "region",
  "medium",
] as const;
export type WorkGrouping = (typeof WORK_GROUPINGS)[number];

/** The height of a work on its shelf. */
const WORK_HEIGHT = 138;
/** A narrow work's label still gets this much room. */
const LABEL_MIN_WIDTH = 108;

/** Kept for the session, so coming back finds the shelves as they were. */
let lastGrouping: WorkGrouping = "era";

type Shelf = { key: string; title: string; games: HomeGameEntry[] };

/** The works sorted onto shelves by the chosen grouping. */
function useShelves(
  allEnabledGames: HomeGameEntry[],
  grouping: WorkGrouping,
): Shelf[] {
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  return useMemo(() => {
    const year = ([path]: HomeGameEntry) =>
      getArtworkInfo(path)?.year ?? Infinity;
    const byYear = (a: HomeGameEntry, b: HomeGameEntry) => year(a) - year(b);
    const shelvesBy = <K extends string>(
      keys: readonly K[],
      keyOf: (entry: HomeGameEntry) => K | undefined,
      title: (key: K) => string,
    ) =>
      keys
        .map((key) => ({
          key,
          title: title(key),
          games: allEnabledGames
            .filter((entry) => keyOf(entry) === key)
            .sort(byYear),
        }))
        .filter((shelf) => shelf.games.length > 0);

    switch (grouping) {
      case "era":
        return shelvesBy(
          ART_ERAS.map((era) => era.id),
          ([path]) => {
            const info = getArtworkInfo(path);
            return info ? artEra(info.year) : undefined;
          },
          (key) => t(`gallery.eras.${key}`),
        );
      case "style":
        return shelvesBy(
          ART_STYLES,
          ([path]) => getArtworkInfo(path)?.style,
          (key) => t(`gallery.styles.${key}`),
        );
      case "region":
        return shelvesBy(
          ART_REGIONS,
          ([path]) => getArtworkInfo(path)?.region,
          (key) => t(`gallery.regions.${key}`),
        );
      case "medium":
        return shelvesBy(
          ART_MEDIA,
          ([path]) => getArtworkInfo(path)?.medium,
          (key) => t(`gallery.media.${key}`),
        );
      case "category":
        // Alphabetical by name, and the games in each by title, as listed.
        return [...GAME_CATEGORIES]
          .sort((a, b) =>
            t(`tags.${a}`).localeCompare(t(`tags.${b}`), language),
          )
          .map((tag) => ({
            key: tag,
            title: t(`tags.${tag}`),
            games: allEnabledGames.filter(([, game]) => game.tags[0] === tag),
          }))
          .filter((shelf) => shelf.games.length > 0);
    }
  }, [allEnabledGames, grouping, language, t]);
}

/**
 * The game art as a gallery: shelves of works, sorted by era, style, game
 * category, region or medium. A game's work is acquired by winning it once.
 */
export function WorksView({
  allEnabledGames,
  hasWon,
  onOpenWork,
  contentPaddingTop,
  contentPaddingBottom,
}: {
  allEnabledGames: HomeGameEntry[];
  hasWon: (path: string) => boolean;
  /** Opens a work, with the order to step through from it. */
  onOpenWork: (path: string, order: string[]) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
}) {
  const { t } = useTranslation("home");
  const { spacing, ui } = useResponsiveMetrics();
  const { width: viewportWidth } = useViewportDimensions();
  const [grouping, setGrouping] = useState<WorkGrouping>(lastGrouping);
  const starfield = useStarfield();
  const shelves = useShelves(allEnabledGames, grouping);
  const order = useMemo(
    () => shelves.flatMap((shelf) => shelf.games.map(([path]) => path)),
    [shelves],
  );
  // Headings line up with the tab bar's edges; the shelves run to the edge
  // of the screen, but start under the heading.
  const barInset = useBarSideInset();
  const contentWidth = Math.min(ui.contentMaxWidth, viewportWidth);
  const shelfStart = (viewportWidth - contentWidth) / 2 + barInset;

  const choose = (next: WorkGrouping) => {
    lastGrouping = next;
    setGrouping(next);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
        gap: spacing(67.5),
      }}
      onScroll={(event) => {
        const y = event.nativeEvent.contentOffset.y;
        starfield?.reportScroll(COLLECT_HOME_TAB_INDEX, y);
      }}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Room above and below for the pills' shadows.
        style={{ marginVertical: -spacing(10) }}
        contentContainerStyle={{
          paddingHorizontal: shelfStart,
          paddingVertical: spacing(10),
          gap: spacing(8),
        }}
      >
        {WORK_GROUPINGS.map((key) => (
          <Pill
            key={key}
            label={t(`gallery.groupBy.${key}`)}
            selected={grouping === key}
            onPress={() => choose(key)}
          />
        ))}
      </ScrollView>

      {shelves.map(({ key, title, games }) => {
        const won = games.filter(([path]) => hasWon(path)).length;
        const complete = won === games.length;
        return (
          <View key={key} style={{ gap: spacing(12) }}>
            <View
              style={{
                width: "100%",
                maxWidth: ui.contentMaxWidth,
                alignSelf: "center",
                paddingHorizontal: barInset,
                flexDirection: "row",
                alignItems: "baseline",
                gap: spacing(12),
              }}
            >
              <Text
                size="sm"
                weight={500}
                color={theme.accent}
                textTransform="uppercase"
                numberOfLines={1}
                style={{ flex: 1, letterSpacing: spacing(2.5) }}
              >
                {title}
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
                paddingHorizontal: shelfStart,
                gap: spacing(19.6),
                alignItems: "flex-start",
              }}
            >
              {games.map(([path, game]) => (
                <ShelfWork
                  key={path}
                  path={path}
                  game={game}
                  collected={hasWon(path)}
                  onPress={() => onOpenWork(path, order)}
                />
              ))}
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
}

/** A work on its shelf, with its title and artist under it. */
function ShelfWork({
  path,
  game,
  collected,
  onPress,
}: {
  path: string;
  game: GameMenuInfo;
  collected: boolean;
  onPress: () => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const thumbnail = game.thumbnail;
  const source = thumbnail ? GAME_FULL_THUMBNAIL_ASSETS[thumbnail] : null;
  // Only an acquired work draws its picture, so only it is waited for.
  const ready = useTabReadyImage(collected ? source : null);
  const aspect = thumbnail ? GAME_THUMBNAIL_ASPECTS[thumbnail] : 0.8;
  const height = spacing(WORK_HEIGHT);
  const width = height * aspect;
  const credit = game.thumbnailCredit;
  const gameTitle = localizeGameTitle(game, path, language);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={collected && credit ? credit.title : gameTitle}
      style={{
        width: Math.max(width, spacing(LABEL_MIN_WIDTH)),
        gap: spacing(8),
      }}
    >
      {collected ? (
        <View
          style={{
            height,
            width,
            borderRadius: spacing(3),
            backgroundColor: theme.night,
            boxShadow: `0 ${spacing(4)}px ${spacing(12)}px ${rgba(Colors.black, 0.55)}`,
          }}
        >
          <Image
            source={source}
            cachePolicy="memory"
            contentFit="cover"
            style={{
              height,
              width,
              borderRadius: spacing(3),
            }}
            {...ready}
          />
        </View>
      ) : (
        <WorkPlaceholder
          width={width}
          height={height}
          iconSize={spacing(48)}
          radius={spacing(3)}
        />
      )}
      {/* Only an acquired work shows its label. */}
      <View>
        {collected && (
          <Text
            serif
            size="md"
            lineHeight={1.4}
            color={theme.ink}
            numberOfLines={1}
          >
            {credit?.title || gameTitle}
          </Text>
        )}
        {collected && (
          <Text serif size="xs" color={theme.dim} numberOfLines={1}>
            {credit?.artistName || t("gallery.unknownArtist")}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
