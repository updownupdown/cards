import { Text, Typography } from "@/components/common/Text";
import { CollectIntroPanel } from "./CollectIntroPanel";
import type { GameSettingsMap } from "@/data/game-menu";
import { GameTag } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { Colors, layoutDims } from "@/styles/styles";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  Stamp,
  STAMP_ASPECT,
  STAMP_STAGGER,
  stampProgress,
  type StampPlacement,
} from "./Stamp";

export const COLLECT_TAGS: GameTag[] = [
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

const ROW_COLOR = Colors.K875;
const ROW_BORDER_COLOR = Colors.K850;
/** Category names, a touch up on the usual medium text. */
const HEADING_SIZE = Typography.size.md * 1.1;

/** How long a category takes to grow its stamps to full size, or back. */
const EXPAND_DURATION = 600;
const CHEVRON_DURATION = 250;

type CollectTabProps = {
  allEnabledGames: HomeGameEntry[];
  settingsMap: GameSettingsMap;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  onScrolledChange: (isScrolled: boolean) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
};

export function CollectTab({
  allEnabledGames,
  settingsMap,
  favorites,
  onToggleFavorite,
  onScrolledChange,
  contentPaddingTop,
  contentPaddingBottom,
}: CollectTabProps) {
  const { ui, spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const {
    settings,
    updateSettings,
    isLoading: settingsLoading,
  } = useGlobalSettings();
  const showIntro = !settingsLoading && !settings.dismissCollectIntro;
  // Alphabetical by the name the player reads.
  const tags = useMemo(
    () =>
      [...COLLECT_TAGS].sort((a, b) =>
        t(`tags.${a}`).localeCompare(t(`tags.${b}`), language),
      ),
    [language, t],
  );
  const [openTags, setOpenTags] = useState<Set<GameTag>>(() => new Set());
  const pageSidePadding = spacing(layoutDims.pagePadding);
  // Each box's width inside its border, known up front so the stamps can be
  // laid out on the first frame; measured once the list is laid out.
  const viewport = useViewportDimensions();
  const [listWidth, setListWidth] = useState<number | null>(null);
  const boxInnerWidth =
    Math.min(
      listWidth ?? viewport.width - pageSidePadding * 2,
      ui.contentMaxWidth,
    ) - 2;

  const hasWon = (path: string) => (settingsMap[path]?.stats?.wins ?? 0) > 0;
  const wonPaths = new Set(
    allEnabledGames.filter(([path]) => hasWon(path)).map(([path]) => path),
  );
  const collectedGames = allEnabledGames.filter(([path]) => hasWon(path));

  const gamesByTag = useMemo(
    () =>
      new Map(
        tags.map((tag) => [
          tag,
          allEnabledGames.filter(([, game]) => game.tags[0] === tag),
        ]),
      ),
    [allEnabledGames, tags],
  );
  // A category is complete once every one of its games has been won.
  const completedTags = tags.filter((tag) => {
    const games = gamesByTag.get(tag) ?? [];
    return games.length > 0 && games.every(([path]) => hasWon(path));
  }).length;

  const sectionGap = spacing(24);
  // Where the list starts, below the page header.
  const listTop = contentPaddingTop;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event, context: { scrolled?: boolean }) => {
      const scrolled = event.contentOffset.y > 1;
      if (scrolled !== context.scrolled) {
        context.scrolled = scrolled;
        scheduleOnRN(onScrolledChange, scrolled);
      }
    },
  });

  const toggleTag = (tag: GameTag) => {
    setOpenTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const sectionWidth = {
    width: "100%",
    maxWidth: ui.contentMaxWidth,
    alignSelf: "center",
  } as const;

  return (
    // Scrolls under the page header, like the Home tab.
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: listTop,
          paddingBottom: contentPaddingBottom + spacing(24),
          paddingHorizontal: pageSidePadding,
        }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {showIntro && (
          <View
            style={[
              sectionWidth,
              { paddingHorizontal: spacing(4), marginBottom: spacing(16) },
            ]}
          >
            <CollectIntroPanel
              onClose={() => void updateSettings({ dismissCollectIntro: true })}
            />
          </View>
        )}
        <View
          style={[
            sectionWidth,
            {
              paddingHorizontal: spacing(4),
              paddingTop: spacing(24),
              paddingBottom: spacing(50),
              gap: spacing(10),
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              gap: spacing(10),
            }}
          >
            <Text size="md" weight={500} color={Colors.white}>
              {t("collect.games", {
                won: collectedGames.length,
                total: allEnabledGames.length,
              })}
            </Text>
            <Text
              size="md"
              weight={500}
              color={Colors.white}
              style={{ marginLeft: "auto" }}
            >
              {t("collect.categories", {
                won: completedTags,
                total: tags.length,
              })}
            </Text>
          </View>
          {/* One bar per category, sized by its number of games. */}
          <CategoryProgressBar
            categories={tags.map((tag) => {
              const games = gamesByTag.get(tag) ?? [];
              return {
                key: tag,
                won: games.filter(([path]) => hasWon(path)).length,
                total: games.length,
              };
            })}
            height={spacing(16)}
            gap={1}
          />
        </View>

        <View
          style={{ gap: sectionGap }}
          onLayout={(event) => setListWidth(event.nativeEvent.layout.width)}
        >
          {tags.map((tag) => (
            <CategoryBox
              key={tag}
              tag={tag}
              games={gamesByTag.get(tag) ?? []}
              wonPaths={wonPaths}
              isOpen={openTags.has(tag)}
              onToggle={toggleTag}
              innerWidth={boxInnerWidth}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              style={sectionWidth}
            />
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

/** The album page's layout: stamps closed, and open. */
function useAlbumLayout(count: number, innerWidth: number) {
  const { spacing } = useResponsiveMetrics();
  const sidePadding = spacing(14);
  const available = innerWidth - sidePadding * 2;

  // Two to a row on a phone, more as the page widens.
  const openGap = spacing(26);
  const openColumns = Math.max(
    2,
    Math.floor((available + openGap) / (spacing(150) + openGap)),
  );
  const openWidth = (available - openGap * (openColumns - 1)) / openColumns;
  const openHeight = openWidth * STAMP_ASPECT;
  const openTop = spacing(4);

  const closedGap = spacing(8);
  const closedWidth = spacing(38);
  const closedHeight = closedWidth * STAMP_ASPECT;
  const closedColumns = Math.max(
    1,
    Math.floor((available + closedGap) / (closedWidth + closedGap)),
  );
  const closedTop = spacing(2);
  const bottom = spacing(16);

  const placements: StampPlacement[] = Array.from(
    { length: count },
    (_, index) => ({
      closedX:
        sidePadding +
        (index % closedColumns) * (closedWidth + closedGap) +
        closedWidth / 2,
      closedY:
        closedTop +
        Math.floor(index / closedColumns) * (closedHeight + closedGap) +
        closedHeight / 2,
      openX:
        sidePadding +
        (index % openColumns) * (openWidth + openGap) +
        openWidth / 2,
      openY:
        openTop +
        Math.floor(index / openColumns) * (openHeight + openGap) +
        openHeight / 2,
      delay: count > 1 ? (STAMP_STAGGER * index) / (count - 1) : 0,
    }),
  );

  return {
    placements,
    stampWidth: openWidth,
    closedScale: closedWidth / openWidth,
    closedStampHeight: closedHeight,
    openStampHeight: openHeight,
    bottom,
  };
}

/**
 * One category: its heading, then an album page of stamps, one per game.
 * Closed, the stamps sit small and close together; opening grows each one
 * in place to a card that opens its game.
 */
function CategoryBox({
  tag,
  games,
  wonPaths,
  isOpen,
  onToggle,
  innerWidth,
  favorites,
  onToggleFavorite,
  style,
}: {
  tag: GameTag;
  games: HomeGameEntry[];
  wonPaths: Set<string>;
  isOpen: boolean;
  onToggle: (tag: GameTag) => void;
  innerWidth: number;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  style: {
    width: "100%";
    maxWidth: number;
    alignSelf: "center";
  };
}) {
  const { spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const radius = spacing(12);
  const wonCount = games.filter(([path]) => wonPaths.has(path)).length;
  const isComplete = games.length > 0 && wonCount === games.length;
  const layout = useAlbumLayout(games.length, innerWidth);

  const progress = useSharedValue(isOpen ? 1 : 0);
  // Whether the stamps last came to rest open. Their names and stars stay
  // mounted until they have shrunk away, and the full-size pictures wait
  // until they have grown, since loading those stalls the growing.
  const [settledOpen, setSettledOpen] = useState(isOpen);
  useEffect(() => {
    const target = isOpen ? 1 : 0;
    if (progress.value === target) return;
    progress.value = withTiming(
      target,
      { duration: EXPAND_DURATION, easing: Easing.linear },
      (finished) => {
        scheduleOnRN(setSettledOpen, finished === true && target === 1);
      },
    );
  }, [isOpen, progress]);

  // The page ends just below its lowest stamp, as the stamps move.
  const { placements, closedStampHeight, openStampHeight, bottom } = layout;
  const bodyStyle = useAnimatedStyle(() => {
    let lowest = 0;
    for (const { closedY, openY, delay } of placements) {
      const t = stampProgress(progress.value, delay);
      const edge =
        closedY +
        (openY - closedY) * t +
        (closedStampHeight + (openStampHeight - closedStampHeight) * t) / 2;
      lowest = Math.max(lowest, edge);
    }
    return { height: lowest + bottom };
  });

  return (
    // Rounded and shadowed as a whole. The shadow sits outside, and the
    // clipping to the rounded corners inside, since clipping would cut off
    // the shadow on native.
    <View
      style={[
        style,
        {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: ROW_BORDER_COLOR,
          backgroundColor: ROW_COLOR,
          ...homeSurfaceShadow(spacing),
        },
      ]}
    >
      <View style={{ borderRadius: radius - 1, overflow: "hidden" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("collect.tagProgress", {
            tag: t(`tags.${tag}`),
            won: wonCount,
            total: games.length,
          })}
          accessibilityState={{ expanded: isOpen }}
          onPress={() => onToggle(tag)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing(8),
            paddingLeft: spacing(8),
            paddingRight: spacing(14),
            paddingVertical: spacing(12),
          }}
        >
          <Chevron open={isOpen} />
          <Text
            weight={500}
            color={Colors.white}
            style={{
              flex: 1,
              fontSize: font(HEADING_SIZE),
              lineHeight: font(HEADING_SIZE) * 1.3,
            }}
          >
            {t(`tags.${tag}`)}
          </Text>
          <View style={{ width: spacing(56) }}>
            <ProgressBar
              won={wonCount}
              total={games.length}
              height={spacing(4)}
            />
          </View>
          <Icon
            name="trophy"
            size={spacing(18)}
            color={isComplete ? Colors.trophyGold : Colors.K800}
          />
        </Pressable>

        <Animated.View style={bodyStyle}>
          {games.map(([path, game], index) => (
            <Stamp
              key={path}
              path={path}
              game={game}
              won={wonPaths.has(path)}
              isFavorite={favorites.has(path)}
              onToggleFavorite={onToggleFavorite}
              width={layout.stampWidth}
              closedScale={layout.closedScale}
              placement={placements[index]}
              // The first to grow lies over the rest as they follow.
              zIndex={games.length - index}
              progress={progress}
              open={isOpen}
              showDetails={isOpen || settledOpen}
              sharp={isOpen && settledOpen}
              surfaceColor={ROW_COLOR}
            />
          ))}
          {/* Closed, a tap anywhere on the page opens the category. Laid
              over the stamps, which would otherwise take taps on web. */}
          {!isOpen && (
            <Pressable
              accessible={false}
              onPress={() => onToggle(tag)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: games.length + 1,
              }}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

/** Points down when closed and turns to point up when open. */
function Chevron({ open }: { open: boolean }) {
  const { spacing } = useResponsiveMetrics();
  const rotation = useSharedValue(open ? 180 : 0);

  useEffect(() => {
    rotation.value = withTiming(open ? 180 : 0, {
      duration: CHEVRON_DURATION,
    });
  }, [open, rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Icon name="expand-more" size={spacing(26)} color={Colors.K600} />
    </Animated.View>
  );
}

function ProgressBar({
  won,
  total,
  height,
}: {
  won: number;
  total: number;
  height: number;
}) {
  const isComplete = total > 0 && won === total;
  return (
    <View
      style={{
        width: "100%",
        height,
        borderRadius: height / 2,
        backgroundColor: Colors.K850,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${total ? (won / total) * 100 : 0}%`,
          height: "100%",
          borderRadius: height / 2,
          backgroundColor: isComplete ? Colors.trophyGold : Colors.win,
        }}
      />
    </View>
  );
}

/**
 * Overall progress, as a bar for each category laid end to end, each as
 * long as its category has games: green as games are won, gold once the
 * category is complete.
 */
function CategoryProgressBar({
  categories,
  height,
  gap = 0,
}: {
  categories: { key: string; won: number; total: number }[];
  height: number;
  gap?: number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap,
        width: "100%",
        height,
        borderRadius: height / 2,
        backgroundColor: Colors.K850,
        overflow: "hidden",
      }}
    >
      {categories
        .filter(({ total }) => total > 0)
        .map(({ key, won, total }) => (
          <View key={key} style={{ flex: total, height: "100%" }}>
            {won > 0 && (
              <View
                style={{
                  width: `${(won / total) * 100}%`,
                  height: "100%",
                  // borderRadius: height / 2,
                  backgroundColor:
                    won === total ? Colors.trophyGold : Colors.win,
                }}
              />
            )}
          </View>
        ))}
    </View>
  );
}
