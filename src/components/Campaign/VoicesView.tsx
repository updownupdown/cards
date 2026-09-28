import { Text } from "@/components/common/Text";
import { ParallaxStars } from "@/components/TaoCollection/ParallaxStars";
import { getQuote, type QuoteId } from "@/data/collectibles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { layoutDims, rgba, theme } from "@/styles/styles";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, Polyline } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { CollectionBar, useCollectionBarHeight } from "./CollectionBar";
import {
  formatYear,
  lifespan,
  portraitLength,
  voicesGroups,
  type VoicesAuthor,
  type VoicesGroup,
} from "./voices";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A period's cell in the sky, in world points. */
const CELL_W = 200;
const CELL_H = 270;
const COLUMNS = 2;
const FIGURE = 170;
const MAX_SCALE = 2.4;
const PORTRAIT_DRAW_MS = 2400;
const easeInOut = Easing.inOut(Easing.cubic);
/** A pinch closing to this much of its start zooms back out. */
const PINCH_OUT_SCALE = 0.8;

type Props = {
  collectedIds: ReadonlySet<QuoteId>;
  topInset: number;
};

/**
 * The quotes in the Odyssey tab. Zoomed out, a sky of periods, each drawn as
 * a constellation with a star per author (faint until one of their quotes is
 * collected). Zoomed in on a period, its collected quotes one at a time:
 * the author's portrait drawn in a single line, their name and years, the
 * quote and its source.
 */
export function VoicesView({ collectedIds, topInset }: Props) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const { settings } = useGlobalSettings();
  const barHeight = useCollectionBarHeight();
  const groups = useMemo(() => voicesGroups(collectedIds), [collectedIds]);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [open, setOpen] = useState<{ group: number; quote: number } | null>(
    null,
  );

  const sky = useSharedValue(0);
  const overview = useSharedValue(1);
  const detail = useSharedValue(0);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);

  const rows = Math.ceil(groups.length / COLUMNS);
  const worldW = CELL_W * COLUMNS;
  const worldH = CELL_H * rows;
  const areaTop = topInset;
  const areaBottom = size ? size.height - barHeight : 0;
  const fitScale = size
    ? Math.min(
        (size.width - spacing(layoutDims.pagePadding) * 2) / worldW,
        (areaBottom - areaTop) / worldH,
      )
    : 1;

  useEffect(() => {
    sky.value = withTiming(1, { duration: 900, easing: easeInOut });
  }, [sky]);
  useEffect(() => {
    if (!size) return;
    scale.value = fitScale;
    x.value = 0;
    y.value = (areaTop - (size.height - areaBottom)) / 2;
  }, [size?.width, size?.height]);

  const openGroup = (index: number) => {
    const group = groups[index];
    if (!group || group.collected.length === 0 || !size) return;
    // Drift in on the period as the sky fades, then show its first quote.
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const cellX = (column + 0.5) * CELL_W - worldW / 2;
    const cellY = (row + 0.5) * CELL_H - worldH / 2;
    const target = Math.min(MAX_SCALE, fitScale * 2.2);
    const flight = { duration: 800, easing: easeInOut };
    x.value = withTiming(-cellX * target, flight);
    y.value = withTiming(-cellY * target, flight);
    scale.value = withTiming(target, flight);
    overview.value = withTiming(0, { duration: 600, easing: easeInOut });
    detail.value = withDelay(500, withTiming(1, { duration: 500 }));
    setTimeout(() => setOpen({ group: index, quote: 0 }), 450);
  };
  const openGroupRef = useRef(openGroup);
  openGroupRef.current = openGroup;

  const backToAll = () => {
    if (!open || !size) return;
    detail.value = withTiming(0, { duration: 350, easing: easeInOut });
    const flight = { duration: 800, easing: easeInOut };
    x.value = withTiming(0, flight);
    y.value = withTiming((areaTop - (size.height - areaBottom)) / 2, flight);
    scale.value = withTiming(fitScale, flight);
    overview.value = withDelay(250, withTiming(1, { duration: 600 }));
    setTimeout(() => setOpen(null), 350);
  };
  const backToAllRef = useRef(backToAll);
  backToAllRef.current = backToAll;

  const step = (direction: 1 | -1) => {
    if (!open) return;
    const count = groups[open.group].collected.length;
    setOpen({
      group: open.group,
      quote: (open.quote + direction + count) % count,
    });
  };

  // Tapping the sky opens the period under the finger.
  const tapAt = (px: number, py: number) => {
    if (!size) return;
    const worldX = (px - size.width / 2 - x.value) / scale.value + worldW / 2;
    const worldY = (py - size.height / 2 - y.value) / scale.value + worldH / 2;
    const column = Math.floor(worldX / CELL_W);
    const row = Math.floor(worldY / CELL_H);
    if (column < 0 || column >= COLUMNS || row < 0 || row >= rows) return;
    openGroupRef.current(row * COLUMNS + column);
  };
  const tapAtRef = useRef(tapAt);
  tapAtRef.current = tapAt;

  const skyGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(8)
      .onStart(() => {
        startX.value = x.value;
        startY.value = y.value;
      })
      .onUpdate((event) => {
        x.value = startX.value + event.translationX;
        y.value = startY.value + event.translationY;
      });
    const pinch = Gesture.Pinch()
      .onStart(() => {
        startScale.value = scale.value;
      })
      .onUpdate((event) => {
        scale.value = Math.max(
          fitScale * 0.8,
          Math.min(MAX_SCALE, startScale.value * event.scale),
        );
      });
    const handleTap = (px: number, py: number) => tapAtRef.current(px, py);
    const tap = Gesture.Tap()
      .maxDistance(10)
      .onEnd((event, success) => {
        "worklet";
        if (success) scheduleOnRN(handleTap, event.x, event.y);
      });
    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
  }, [fitScale]);

  const pinchOut = useMemo(() => {
    const zoomOut = () => backToAllRef.current();
    return Gesture.Pinch().onEnd((event) => {
      "worklet";
      if (event.scale < PINCH_OUT_SCALE) scheduleOnRN(zoomOut);
    });
  }, []);

  const worldStyle = useAnimatedStyle(() => ({
    opacity: overview.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));
  const skyStyle = useAnimatedStyle(() => ({ opacity: sky.value }));
  const detailStyle = useAnimatedStyle(() => ({ opacity: detail.value }));

  const group = open ? groups[open.group] : null;
  const quoteId = group && open ? group.collected[open.quote] : undefined;
  const authorOf = (id: QuoteId | undefined) =>
    group?.authors.find(
      (author) => id !== undefined && author.quoteIds.includes(id),
    );
  const author = authorOf(quoteId);
  const neighbour = (direction: 1 | -1) => {
    if (!group || !open) return undefined;
    const count = group.collected.length;
    const id = group.collected[(open.quote + direction + count) % count];
    const who = authorOf(id);
    if (!who) return undefined;
    return {
      title: who.name,
      subtitle: `(${who.quoteIds.indexOf(id) + 1}/${who.quoteIds.length})`,
    };
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
      }}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { overflow: "hidden" }, skyStyle]}
      >
        {size && (
          <View style={[StyleSheet.absoluteFill, pointerEventsStyles.none]}>
            <ParallaxStars
              width={size.width}
              height={size.height}
              x={x}
              y={y}
              moving={settings.showAnimations}
            />
          </View>
        )}
        {size && (
          <GestureDetector gesture={skyGesture}>
            <View
              style={[
                StyleSheet.absoluteFill,
                open ? pointerEventsStyles.none : null,
              ]}
            >
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    left: size.width / 2 - worldW / 2,
                    top: size.height / 2 - worldH / 2,
                    width: worldW,
                    height: worldH,
                  },
                  worldStyle,
                ]}
              >
                {groups.map((entry, index) => (
                  <PeriodCell
                    key={entry.period.id}
                    group={entry}
                    left={(index % COLUMNS) * CELL_W}
                    top={Math.floor(index / COLUMNS) * CELL_H}
                  />
                ))}
              </Animated.View>
            </View>
          </GestureDetector>
        )}

        {group && author && quoteId !== undefined && (
          <GestureDetector gesture={pinchOut}>
            <Animated.View style={[StyleSheet.absoluteFill, detailStyle]}>
              <VoiceDetail
                author={author}
                quoteId={quoteId}
                topInset={topInset}
                bottomInset={barHeight}
              />
            </Animated.View>
          </GestureDetector>
        )}
      </Animated.View>

      {open && (
        <CollectionBar
          previousLabel={t("quotes.previousQuote")}
          nextLabel={t("quotes.nextQuote")}
          zoomOutLabel={t("tao.viewAll")}
          previous={neighbour(-1)}
          next={neighbour(1)}
          onPrevious={() => step(-1)}
          onNext={() => step(1)}
          onZoomOut={backToAll}
        />
      )}
    </View>
  );
}

/** A period in the overview: its constellation, name and dates. */
const PeriodCell = memo(function PeriodCell({
  group,
  left,
  top,
}: {
  group: VoicesGroup;
  left: number;
  top: number;
}) {
  const known = group.authors.filter((author) => author.collectedIds.length);
  const scale = FIGURE / 100;
  return (
    <View
      style={{
        position: "absolute",
        left,
        top,
        width: CELL_W,
        height: CELL_H,
        alignItems: "center",
        paddingTop: 10,
      }}
    >
      <Svg width={FIGURE} height={FIGURE} viewBox="-4 -4 108 108">
        <Polyline
          points={group.authors
            .map((author) => `${author.star.x},${author.star.y}`)
            .join(" ")}
          fill="none"
          stroke={rgba(theme.accent, known.length ? 0.4 : 0.12)}
          strokeWidth={0.5 / scale + 0.2}
          strokeLinejoin="round"
        />
        <G>
          {group.authors.map((author) => {
            const lit = author.collectedIds.length > 0;
            return (
              <G key={author.name}>
                {lit && (
                  <Circle
                    cx={author.star.x}
                    cy={author.star.y}
                    r={4.5}
                    fill={rgba(theme.accent, 0.15)}
                  />
                )}
                <Circle
                  cx={author.star.x}
                  cy={author.star.y}
                  r={lit ? 1.9 : 1.1}
                  fill={lit ? theme.accent : rgba(theme.ink, 0.28)}
                />
              </G>
            );
          })}
        </G>
      </Svg>
      <Text
        serif
        italic
        size="xl"
        color={known.length ? theme.ink : theme.dim}
        style={{ textAlign: "center", marginTop: 6 }}
        numberOfLines={1}
      >
        {group.period.name}
      </Text>
      <Text
        serif
        smallCaps
        size="md"
        color={theme.dim}
        style={{ textAlign: "center" }}
      >
        {formatYear(group.from)} –{" "}
        {group.to === null ? "today" : formatYear(group.to)}
      </Text>
      <Text size="sm" weight={300} color={theme.faint} style={{ marginTop: 2 }}>
        {known.length} / {group.authors.length}
      </Text>
    </View>
  );
});

/** One quote, zoomed in: portrait, name, years, the quote and its source. */
function VoiceDetail({
  author,
  quoteId,
  topInset,
  bottomInset,
}: {
  author: VoicesAuthor;
  quoteId: QuoteId;
  topInset: number;
  bottomInset: number;
}) {
  const { spacing, font } = useResponsiveMetrics();
  const quote = getQuote(quoteId);
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        alignItems: "center",
        paddingTop: topInset + spacing(8),
        paddingBottom: bottomInset + spacing(24),
        paddingHorizontal: spacing(28),
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Drawn afresh only when the author changes. */}
      <Portrait key={author.name} path={author.portrait} size={spacing(170)} />
      <Text
        size="lg"
        weight={500}
        style={{ textAlign: "center", marginTop: spacing(14) }}
      >
        {author.name}
      </Text>
      <Text
        size="xs"
        weight={300}
        color={theme.dim}
        style={{ textAlign: "center" }}
      >
        {lifespan(author)}
      </Text>
      {quote && (
        <Animated.View
          key={quoteId}
          entering={FadeIn.duration(900).delay(150)}
          style={{
            alignItems: "center",
            marginTop: spacing(20),
            gap: spacing(12),
          }}
        >
          <Text
            serif
            italic
            color={theme.ink}
            style={{
              fontSize: font(24),
              lineHeight: font(31),
              textAlign: "center",
              maxWidth: spacing(520),
            }}
          >
            “{quote.text}”
          </Text>
          <Text
            size="xs"
            weight={300}
            color={theme.dim}
            style={{ textAlign: "center" }}
          >
            {quote.source}
          </Text>
        </Animated.View>
      )}
    </ScrollView>
  );
}

/** An author's one-line portrait, drawn in the accent as it appears. */
function Portrait({ path, size }: { path: string; size: number }) {
  const length = useMemo(() => portraitLength(path), [path]);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: PORTRAIT_DRAW_MS,
      easing: Easing.inOut(Easing.quad),
    });
  }, [progress]);
  const dashProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }));
  return (
    <Svg width={size} height={(size * 240) / 200} viewBox="0 0 200 240">
      <AnimatedPath
        d={path}
        fill="none"
        stroke={theme.accent}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={[length, length]}
        animatedProps={dashProps}
      />
    </Svg>
  );
}
