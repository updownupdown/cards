import { Text, Typography } from "@/components/common/Text";
import { HomeCard } from "@/components/Home/HomeCard";
import type { GameSettingsMap } from "@/data/game-menu";
import { GAME_STICKER_ASSETS } from "@/data/game-thumbnails";
import {
  DEFAULT_GAME_THUMBNAIL,
  GameTag,
  type GameMenuInfo,
} from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { Colors, layoutDims, rgba } from "@/styles/styles";
import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  FadeIn,
  LayoutAnimationConfig,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  clearPendingCollectTag,
  getPendingCollectTag,
} from "./home-view-state";
import { useTabReadyHold, useTabReadyImage } from "./TabReady";

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

/**
 * Category rows are opaque, since their headers stick to the top of the page
 * and cards scroll beneath them.
 */
const ROW_COLOR = Colors.K875;
const ROW_BORDER_COLOR = Colors.K850;
/** Category names, a touch up on the usual medium text. */
const HEADING_SIZE = Typography.size.md * 1.02;

/** How long a category takes to swap its stickers for cards, or back. */
const EXPAND_DURATION = 220;

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
  // Alphabetical by the name the player reads.
  const tags = useMemo(
    () =>
      [...COLLECT_TAGS].sort((a, b) =>
        t(`tags.${a}`).localeCompare(t(`tags.${b}`), language),
      ),
    [language, t],
  );
  // A category asked for from elsewhere (the Home tab's genres) starts open,
  // and is scrolled to once it has been laid out.
  const [openTags, setOpenTags] = useState<Set<GameTag>>(() => {
    const tag = getPendingCollectTag() as GameTag | null;
    return new Set(tag && COLLECT_TAGS.includes(tag) ? [tag] : []);
  });
  const scrollTargetTag = useRef(getPendingCollectTag());
  const [requestedTag] = useState(getPendingCollectTag);
  useEffect(() => clearPendingCollectTag(), []);
  // Kept hidden until it has scrolled to the category, so it opens there.
  const [scrollingToTarget, setScrollingToTarget] = useState(
    () => getPendingCollectTag() !== null,
  );
  useTabReadyHold(scrollingToTarget);
  const pageSidePadding = spacing(layoutDims.pagePadding);
  const cardGap = spacing(12);
  const cardColumns = ui.isTablet ? 3 : 2;
  const [gridWidth, setGridWidth] = useState(0);
  // A category open from the start only builds its cards once it knows its
  // width, so the tab waits for that too.
  useTabReadyHold(openTags.size > 0 && gridWidth === 0);
  const cardWidth = Math.floor(
    (gridWidth - cardGap * (cardColumns - 1)) / cardColumns,
  );

  const hasWon = (path: string) => (settingsMap[path]?.stats?.wins ?? 0) > 0;
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

  const scrollRef = useRef<Animated.ScrollView>(null);
  const radius = spacing(12);
  const sectionGap = spacing(24);
  const contentTop = spacing(4);
  // Room around each box for its shadow, inside the box's clipping.
  const shadowRoom = spacing(24);
  // The pin line, where headers are held and box contents are cut off, a
  // corner's height below the top of the pinned area: see PinnedHeader.
  const pinLine = contentPaddingTop + radius;

  // Measured sizes, from which every category box's place in the scroll
  // content, measured from the pin line, is added up. (Sizes are reported reliably when they change;
  // positions are not always, on web.)
  const overallHeight = useSharedValue(0);
  const headerHeight = useSharedValue(0);
  const boxHeights = useSharedValue<number[]>(tags.map(() => 0));
  const scrollY = useSharedValue(0);

  const boxTop = (index: number) => {
    "worklet";
    let top = contentTop + overallHeight.value;
    for (let before = 0; before < index; before += 1) {
      top += boxHeights.value[before] + sectionGap;
    }
    return top;
  };
  // The scroll position that brings a box's top up to the top of the list.
  // Worked out from the sizes as measured here, not the shared values: on
  // native those only update on the UI thread a moment later.
  const scrollToBox = (index: number) => {
    let top = contentTop + measuredOverallHeight.current;
    for (let before = 0; before < index; before += 1) {
      top += measuredBoxHeights.current[before] + sectionGap;
    }
    return top;
  };
  const measuredOverallHeight = useRef(0);

  // Kept here as well as in boxHeights: on native, a shared value set from
  // this thread only updates on the UI thread later, so the boxes all
  // reporting their sizes at once would each copy a stale array and undo the
  // others, leaving most boxes zero high and every header pinned.
  const measuredBoxHeights = useRef(tags.map(() => 0));
  const setBoxHeight = (index: number, height: number) => {
    measuredBoxHeights.current[index] = height;
    boxHeights.value = [...measuredBoxHeights.current];
    if (scrollTargetTag.current === tags[index]) {
      scrollTargetTag.current = null;
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: scrollToBox(index), animated: false });
        setScrollingToTarget(false);
      });
    }
  };

  // Whether any category's header is pinned; the pinned area takes no room
  // (and no taps) otherwise.
  const anyPinned = useDerivedValue(() => {
    for (let index = 0; index < boxHeights.value.length; index += 1) {
      const top = boxTop(index) - scrollY.value;
      if (top < 0 && radius + top + boxHeights.value[index] > 0) return true;
    }
    return false;
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event, context: { scrolled?: boolean }) => {
      scrollY.value = event.contentOffset.y;
      const scrolled = event.contentOffset.y > 1;
      if (scrolled !== context.scrolled) {
        context.scrolled = scrolled;
        scheduleOnRN(onScrolledChange, scrolled);
      }
    },
  });

  const toggleTag = (tag: GameTag) => {
    const closing = openTags.has(tag);
    setOpenTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
    // Closing a category from its pinned header, far down its cards: bring
    // its box back to the top rather than leaving the page further on.
    const y = scrollToBox(tags.indexOf(tag));
    if (closing && scrollY.value > y) {
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ y, animated: false }),
      );
    }
  };

  const sectionWidth = {
    width: "100%",
    maxWidth: ui.contentMaxWidth,
    alignSelf: "center",
  } as const;

  const categoryHeader = (tag: GameTag) => {
    const games = gamesByTag.get(tag) ?? [];
    const wonCount = games.filter(([path]) => hasWon(path)).length;
    const isComplete = games.length > 0 && wonCount === games.length;
    const isOpen = openTags.has(tag);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("collect.tagProgress", {
          tag: t(`tags.${tag}`),
          won: wonCount,
          total: games.length,
        })}
        accessibilityState={{ expanded: isOpen }}
        onPress={() => toggleTag(tag)}
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
    );
  };

  return (
    // Scrolls under the page header, like the Home tab; only the category
    // boxes are cut off, at the pin line.
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: pinLine + contentTop,
          paddingBottom: contentPaddingBottom + spacing(24),
          paddingHorizontal: pageSidePadding,
        }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View
          onLayout={(event) => {
            measuredOverallHeight.current = event.nativeEvent.layout.height;
            overallHeight.value = event.nativeEvent.layout.height;
          }}
          style={[
            sectionWidth,
            {
              paddingHorizontal: spacing(4),
              paddingTop: spacing(28),
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
            <Text size="lg" weight={500} color={Colors.white}>
              {t("collect.title")}
            </Text>
            <Text
              size="sm"
              weight={400}
              color={Colors.K300}
              style={{ marginLeft: "auto" }}
            >
              {t("collect.overall", {
                won: collectedGames.length,
                total: allEnabledGames.length,
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
            height={spacing(8)}
            gap={spacing(2.5)}
          />
        </View>

        {/* Keeps the pin-line clipping, which moves down as the page
            scrolls, from making the page longer on web (where transformed
            views count towards what can be scrolled). */}
        <View
          style={{
            overflow: "hidden",
            marginHorizontal: -shadowRoom,
            paddingHorizontal: shadowRoom,
            marginVertical: -shadowRoom,
            paddingVertical: shadowRoom,
          }}
        >
          {tags.map((tag, tagIndex) => {
            const games = gamesByTag.get(tag) ?? [];
            const isOpen = openTags.has(tag);

            return (
              // One box per category, rounded and shadowed as a whole. The
              // shadow sits outside, and the clipping to the rounded corners
              // inside, since clipping would cut off the shadow on native.
              <PinLineClip
                key={tag}
                index={tagIndex}
                boxTop={boxTop}
                scrollY={scrollY}
                room={shadowRoom}
                gap={sectionGap}
              >
                <View
                  onLayout={(event) =>
                    setBoxHeight(tagIndex, event.nativeEvent.layout.height)
                  }
                  style={[
                    sectionWidth,
                    {
                      borderRadius: radius,
                      borderWidth: 1,
                      borderColor: ROW_BORDER_COLOR,
                      backgroundColor: ROW_COLOR,
                      ...homeSurfaceShadow(spacing),
                    },
                  ]}
                >
                  <View
                    style={{ borderRadius: radius - 1, overflow: "hidden" }}
                  >
                    <BoxHeader
                      index={tagIndex}
                      boxTop={boxTop}
                      scrollY={scrollY}
                      onLayout={
                        tagIndex === 0
                          ? (event) => {
                              headerHeight.value =
                                event.nativeEvent.layout.height;
                            }
                          : undefined
                      }
                    >
                      {categoryHeader(tag)}
                    </BoxHeader>

                    {/* Keyed by state, so switching fades the new content in;
                        not as the tab is first built, though. */}
                    <LayoutAnimationConfig skipEntering>
                      <Animated.View
                        key={isOpen ? "cards" : "stickers"}
                        entering={FadeIn.duration(EXPAND_DURATION)}
                      >
                        {isOpen ? (
                          <View
                            onLayout={(event) =>
                              setGridWidth(
                                event.nativeEvent.layout.width - cardGap * 2,
                              )
                            }
                            style={{
                              padding: cardGap,
                              paddingTop: spacing(2),
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: cardGap,
                            }}
                          >
                            {gridWidth > 0 && (
                              <CategoryCards
                                tag={tag}
                                openedWithTab={tag === requestedTag}
                                games={games}
                                cardWidth={cardWidth}
                                favorites={favorites}
                                onToggleFavorite={onToggleFavorite}
                                hasWon={hasWon}
                              />
                            )}
                          </View>
                        ) : (
                          // The album page: a sticker for each game won, an empty
                          // slot for each still to win.
                          <Pressable
                            accessible={false}
                            onPress={() => toggleTag(tag)}
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: spacing(6),
                              paddingHorizontal: spacing(14),
                              paddingBottom: spacing(14),
                            }}
                          >
                            {games.map(([path, game]) => (
                              <Sticker
                                key={path}
                                path={path}
                                game={game}
                                won={hasWon(path)}
                              />
                            ))}
                          </Pressable>
                        )}
                      </Animated.View>
                    </LayoutAnimationConfig>
                  </View>
                </View>
              </PinLineClip>
            );
          })}
        </View>
      </Animated.ScrollView>

      {/* Pinned headers: each category's header is held at the top of the
          list while its cards scroll by, then carried up by the end of its
          box and cut off at the top. One each, since one can still be
          leaving as the next arrives. */}
      <PinnedHeaderArea
        anyPinned={anyPinned}
        headerHeight={headerHeight}
        radius={radius}
        top={contentPaddingTop}
        side={pageSidePadding}
      >
        {tags.map((tag, index) => (
          <PinnedHeader
            key={tag}
            index={index}
            boxTop={boxTop}
            boxHeights={boxHeights}
            headerHeight={headerHeight}
            scrollY={scrollY}
            radius={radius}
            areaTop={contentPaddingTop}
            maxWidth={ui.contentMaxWidth}
          >
            {categoryHeader(tag)}
          </PinnedHeader>
        ))}
      </PinnedHeaderArea>
    </View>
  );
}

/**
 * A box's own header, hidden while its pinned copy stands in for it, so it
 * never shows twice as it scrolls on up under the page header.
 */
function BoxHeader({
  index,
  boxTop,
  scrollY,
  onLayout,
  children,
}: {
  index: number;
  boxTop: (index: number) => number;
  scrollY: SharedValue<number>;
  onLayout?: (event: LayoutChangeEvent) => void;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: boxTop(index) - scrollY.value < 0 ? 0 : 1,
  }));
  return (
    <Animated.View onLayout={onLayout} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * A category box that is cut off where it passes the pin line, so its
 * contents never show above its pinned header. The clipping moves down
 * with the pin line (and the box back up by as much, so it stays put),
 * and leaves room for the box's shadow elsewhere.
 */
function PinLineClip({
  index,
  boxTop,
  scrollY,
  room,
  gap,
  children,
}: {
  index: number;
  boxTop: (index: number) => number;
  scrollY: SharedValue<number>;
  room: number;
  gap: number;
  children: ReactNode;
}) {
  const cut = useDerivedValue(() =>
    Math.max(0, room - (boxTop(index) - scrollY.value)),
  );
  const clipStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cut.value }],
  }));
  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -cut.value }],
  }));
  return (
    <Animated.View
      style={[
        {
          overflow: "hidden",
          marginHorizontal: -room,
          paddingHorizontal: room,
          marginTop: -room,
          paddingTop: room,
          paddingBottom: room,
          marginBottom: gap - room,
        },
        clipStyle,
      ]}
    >
      <Animated.View style={boxStyle}>{children}</Animated.View>
    </Animated.View>
  );
}

/**
 * The area where category headers are pinned, a corner's height above the
 * pin line. It is only there (to catch taps) while one is pinned.
 */
function PinnedHeaderArea({
  anyPinned,
  headerHeight,
  radius,
  top,
  side,
  children,
}: {
  anyPinned: SharedValue<boolean>;
  headerHeight: SharedValue<number>;
  radius: number;
  top: number;
  side: number;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    height: anyPinned.value ? headerHeight.value + radius : 0,
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top,
          left: side,
          right: side,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * A copy of one category's header, shown over its box once the box's own
 * header has passed the pin line. Boxes are cut off at the pin line, a
 * corner's height below the pinned area, so the header rests with its
 * rounded top corners over nothing; while the box's own header crosses that
 * gap the copy follows it exactly. The end of the box then carries it up,
 * rounding its bottom corners to match, and on under the page header.
 */
function PinnedHeader({
  index,
  boxTop,
  boxHeights,
  headerHeight,
  scrollY,
  radius,
  areaTop,
  maxWidth,
  children,
}: {
  index: number;
  boxTop: (index: number) => number;
  boxHeights: SharedValue<number[]>;
  headerHeight: SharedValue<number>;
  scrollY: SharedValue<number>;
  radius: number;
  areaTop: number;
  maxWidth: number;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    // Where the box's top and end are, relative to the pin line.
    const top = boxTop(index) - scrollY.value;
    const bottom = top + boxHeights.value[index];
    const height = headerHeight.value;
    const offset = Math.min(
      radius + Math.min(0, Math.max(-radius, top)),
      radius + bottom - height,
    );
    if (top >= 0 || offset + height <= -areaTop) {
      return { opacity: 0, transform: [{ translateY: -100000 }] };
    }
    // How far the box carries on below this header.
    const room = radius + bottom - (offset + height);
    const bottomRadius = Math.min(radius, Math.max(0, radius - room));
    return {
      opacity: 1,
      transform: [{ translateY: offset }],
      borderBottomLeftRadius: bottomRadius,
      borderBottomRightRadius: bottomRadius,
      borderBottomWidth: room <= 0.5 ? 1 : 0,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          alignSelf: "center",
          width: "100%",
          maxWidth,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: ROW_BORDER_COLOR,
          backgroundColor: ROW_COLOR,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Categories whose cards have shown their thumbnails already this session,
 * so the images are cached and can show straight away.
 */
const thumbnailsShown = new Set<GameTag>();

/**
 * A category's cards. The first time they open, their thumbnails wait until
 * the cards have faded in, since loading them all at once stalls the fade.
 */
function CategoryCards({
  tag,
  openedWithTab,
  games,
  cardWidth,
  favorites,
  onToggleFavorite,
  hasWon,
}: {
  tag: GameTag;
  /** Open as the tab is built: no expanding to wait for. */
  openedWithTab: boolean;
  games: HomeGameEntry[];
  cardWidth: number;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  hasWon: (path: string) => boolean;
}) {
  const [showThumbnails, setShowThumbnails] = useState(
    () => openedWithTab || thumbnailsShown.has(tag),
  );
  useEffect(() => {
    if (showThumbnails) return;
    const timeout = setTimeout(() => {
      thumbnailsShown.add(tag);
      setShowThumbnails(true);
    }, EXPAND_DURATION + 40);
    return () => clearTimeout(timeout);
  }, [showThumbnails, tag]);

  return games.map(([path, game]) => (
    <View key={path} style={{ width: cardWidth }}>
      <HomeCard
        path={path}
        game={game}
        size="medium"
        onToggleFavorite={onToggleFavorite}
        isFavorite={favorites.has(path)}
        style={{ width: "100%" }}
        showCompleted={hasWon(path)}
        showThumbnail={showThumbnails}
      />
    </View>
  ));
}

/** Points down when closed and turns to point up when open. */
function Chevron({ open }: { open: boolean }) {
  const { spacing } = useResponsiveMetrics();
  const rotation = useSharedValue(open ? 180 : 0);

  useEffect(() => {
    rotation.value = withTiming(open ? 180 : 0, { duration: EXPAND_DURATION });
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
  gap,
}: {
  categories: { key: string; won: number; total: number }[];
  height: number;
  gap: number;
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
                  borderRadius: height / 2,
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

/** A small, stable tilt for each sticker, so a page looks hand-stuck. */
function stickerTilt(path: string) {
  let hash = 0;
  for (let index = 0; index < path.length; index += 1) {
    hash = (hash * 31 + path.charCodeAt(index)) >>> 0;
  }
  return (hash % 9) - 4;
}

function Sticker({
  path,
  game,
  won,
}: {
  path: string;
  game: GameMenuInfo;
  won: boolean;
}) {
  const { spacing } = useResponsiveMetrics();
  const size = spacing(40);
  // Small copies: the full thumbnails, all 114 at once, cost Android about
  // 300MB of GPU memory and slowed the whole app after a visit here.
  const source = GAME_STICKER_ASSETS[game.thumbnail || DEFAULT_GAME_THUMBNAIL];
  const sourceReady = useTabReadyImage(source);

  if (!won) {
    // An empty slot, with the faintest hint of what goes there.
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: spacing(6),
          borderWidth: spacing(1.5),
          borderStyle: "dashed",
          borderColor: Colors.K800,
          overflow: "hidden",
        }}
      >
        <Image
          source={source}
          style={{ width: "100%", height: "100%", opacity: 0.12 }}
          contentFit="cover"
          {...sourceReady}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: spacing(6),
        borderWidth: spacing(2),
        borderColor: Colors.K100,
        overflow: "hidden",
        backgroundColor: game.gameColorDark,
        transform: [{ rotate: `${stickerTilt(path)}deg` }],
        boxShadow: `0 ${spacing(1)}px ${spacing(4)}px ${rgba(Colors.black, 0.5)}`,
      }}
    >
      <Image
        source={source}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        {...sourceReady}
      />
    </View>
  );
}
