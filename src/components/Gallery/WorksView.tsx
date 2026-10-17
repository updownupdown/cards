import { Text } from "@/components/common/Text";
import { COLLECT_HOME_TAB_INDEX } from "@/components/Home/home-view-state";
import { useSkyScrollHandler } from "@/components/Home/Starfield";
import { useStagedSource, useTabReadyImage } from "@/components/Home/TabReady";
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
  GAME_SHELF_THUMBNAIL_ASSETS,
  GAME_THUMBNAIL_ASPECTS,
} from "@/data/game-thumbnails";
import { GameTag, type GameMenuInfo } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { cardShadow, Colors, rgba, theme } from "@/styles/styles";
import { Image } from "expo-image";
import { WorkPlaceholder } from "./shared";
import { useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, {
  useAnimatedReaction,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

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

/**
 * On Android only the works on screen, or within half a screen of it, have
 * their pictures. Android keeps every picture in the view tree on the GPU,
 * scrolled away or not, and all the shelves' pictures together overflowed
 * its memory, after which it sent every picture again each frame.
 */
const WINDOWED = Platform.OS === "android";
/** How far past the screen works keep their pictures, in screens. */
const PICTURE_MARGIN = 0.5;
/** Shelves drawn before their place is known that count as on screen. */
const FIRST_SHELVES = 3;

/**
 * Which part of a scroll is shown, to half a screen: the scroll offset over
 * half the screen, rounded down. It changes rarely enough to render on. A
 * worklet: the scroll's animated reaction calls it on the UI thread, where a
 * plain function isn't callable and crashes the app.
 */
function bandOf(offset: number, screen: number) {
  "worklet";
  return Math.floor(offset / (screen / 2));
}

/** Whether [start, end) is near the screen, with the scroll in `band`. */
function nearBand(start: number, end: number, band: number, screen: number) {
  const from = (band * screen) / 2 - screen * PICTURE_MARGIN;
  const to = ((band + 1) * screen) / 2 + screen * (1 + PICTURE_MARGIN);
  return end > from && start < to;
}

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
  const { width: viewportWidth, height: viewportHeight } =
    useViewportDimensions();
  const [grouping, setGrouping] = useState<WorkGrouping>(lastGrouping);
  const scrollY = useSharedValue(0);
  const onScroll = useSkyScrollHandler(COLLECT_HOME_TAB_INDEX, scrollY);
  const [band, setBand] = useState(0);
  useAnimatedReaction(
    () => (WINDOWED ? bandOf(scrollY.value, viewportHeight) : 0),
    (next, previous) => {
      if (next !== previous) scheduleOnRN(setBand, next);
    },
    [viewportHeight],
  );
  // Each shelf's place in the scroll, by grouping and shelf.
  const [shelfSpans, setShelfSpans] = useState<
    Record<string, { top: number; bottom: number }>
  >({});
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
    <Animated.ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
        gap: spacing(67.5),
      }}
      onScroll={onScroll}
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

      {shelves.map(({ key, title, games }, index) => {
        const won = games.filter(([path]) => hasWon(path)).length;
        const complete = won === games.length;
        const span = shelfSpans[`${grouping}:${key}`];
        const near = span
          ? nearBand(span.top, span.bottom, band, viewportHeight)
          : index < FIRST_SHELVES;
        return (
          <View
            key={key}
            style={{ gap: spacing(12) }}
            onLayout={
              WINDOWED
                ? (event) => {
                    const { y, height } = event.nativeEvent.layout;
                    const spanKey = `${grouping}:${key}`;
                    setShelfSpans((current) => {
                      const known = current[spanKey];
                      return known?.top === y && known.bottom === y + height
                        ? current
                        : {
                            ...current,
                            [spanKey]: { top: y, bottom: y + height },
                          };
                    });
                  }
                : undefined
            }
          >
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
            <ShelfRow
              games={games}
              near={!WINDOWED || near}
              shelfStart={shelfStart}
              viewportWidth={viewportWidth}
              hasWon={hasWon}
              onOpenWork={(path) => onOpenWork(path, order)}
            />
          </View>
        );
      })}
    </Animated.ScrollView>
  );
}

/** A work's picture size, and the room it takes on its shelf. */
function workSize(game: GameMenuInfo, spacing: (value: number) => number) {
  const thumbnail = game.thumbnail;
  const aspect = thumbnail ? GAME_THUMBNAIL_ASPECTS[thumbnail] : 0.8;
  const height = spacing(WORK_HEIGHT);
  const width = height * aspect;
  return { width, height, room: Math.max(width, spacing(LABEL_MIN_WIDTH)) };
}

/** One shelf's row of works, scrolled sideways. */
function ShelfRow({
  games,
  near,
  shelfStart,
  viewportWidth,
  hasWon,
  onOpenWork,
}: {
  games: HomeGameEntry[];
  /** The shelf is on screen or close to it (see WINDOWED). */
  near: boolean;
  shelfStart: number;
  viewportWidth: number;
  hasWon: (path: string) => boolean;
  onOpenWork: (path: string) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const gap = spacing(19.6);
  const [band, setBand] = useState(0);
  const bandRef = useRef(0);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = bandOf(event.nativeEvent.contentOffset.x, viewportWidth);
    if (next === bandRef.current) return;
    bandRef.current = next;
    setBand(next);
  };
  let left = shelfStart;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={WINDOWED ? onScroll : undefined}
      scrollEventThrottle={WINDOWED ? 32 : undefined}
      contentContainerStyle={{
        paddingHorizontal: shelfStart,
        gap,
        alignItems: "flex-start",
      }}
    >
      {games.map(([path, game]) => {
        const start = left;
        left += workSize(game, spacing).room + gap;
        return (
          <ShelfWork
            key={path}
            path={path}
            game={game}
            collected={hasWon(path)}
            near={
              near &&
              (!WINDOWED || nearBand(start, left - gap, band, viewportWidth))
            }
            onPress={() => onOpenWork(path)}
          />
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
  near,
  onPress,
}: {
  path: string;
  game: GameMenuInfo;
  collected: boolean;
  /** On screen or close to it: only then is its picture drawn. */
  near: boolean;
  onPress: () => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const thumbnail = game.thumbnail;
  const staged = useStagedSource(
    thumbnail ? GAME_SHELF_THUMBNAIL_ASSETS[thumbnail] : null,
  );
  const source = near ? staged : null;
  // Only an acquired work draws its picture, so only it is waited for.
  const ready = useTabReadyImage(collected ? source : null);
  const { width, height, room } = workSize(game, spacing);
  const credit = game.thumbnailCredit;
  const gameTitle = localizeGameTitle(game, path, language);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={collected && credit ? credit.title : gameTitle}
      style={{
        width: room,
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
            ...cardShadow(
              `0 ${spacing(4)}px ${spacing(12)}px ${rgba(Colors.black, 0.55)}`,
              spacing(6),
            ),
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
          radius={spacing(3)}
          source={source}
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
          <Text serif italic size="xs" color={theme.dim} numberOfLines={1}>
            {credit?.artistName || t("gallery.unknownArtist")}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
