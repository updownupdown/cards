import { ShowOriginalToggle } from "@/components/Campaign/ShowOriginalToggle";
import { Text } from "@/components/common/Text";
import { INK } from "@/components/QuoteReveal/QuoteReveal";
import { getQuote, type QuoteId } from "@/data/collectibles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { isQuoteTranslated, localizeQuote } from "@/i18n/content";
import { Colors } from "@/styles/styles";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import {
  CELL_BLEED,
  CELL_BOX,
  cellLine,
  lifespan,
  PORTRAIT_FOCUS,
  type GalleryAuthor,
  type GalleryPosition,
} from "./quote-gallery";

export type GalleryAction =
  "previousAuthor" | "nextAuthor" | "previousQuote" | "nextQuote";

type Area = {
  width: number;
  /** The visible band, between the header and the bar. */
  top: number;
  bottom: number;
};

type Props = {
  authors: GalleryAuthor[];
  position: GalleryPosition;
  area: Area;
  /** Where the gallery sits; shared with the parallax stars behind. */
  panX: SharedValue<number>;
  panY: SharedValue<number>;
  onAction: (action: GalleryAction) => void;
};

const PORTRAIT_INK_PX = 1.6;
// From the line to the author's name.
const NAME_GAP = 34;
const MOVE_MS = 550;
// A swipe: far enough, or fast enough.
const SWIPE_DISTANCE = 40;
const SWIPE_VELOCITY = 500;
// The gallery follows the finger this much, then settles.
const DRAG_FOLLOW = 0.35;

const FADE_IN = { from: { opacity: 0 }, to: { opacity: 1 } };
const fadeIn = {
  animationName: FADE_IN,
  animationDuration: "500ms",
  animationFillMode: "both",
  animationTimingFunction: "ease-in-out",
} as const;

function clamp01(value: number) {
  "worklet";
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

// --- Cells ---------------------------------------------------------------------------

/**
 * An author's stretch of the line (their portrait once a quote is collected),
 * with their name and count below; it dims the further it is from the centre.
 */
const GalleryCell = memo(function GalleryCell({
  author,
  index,
  width,
  centerX,
  x,
}: {
  author: GalleryAuthor;
  index: number;
  width: number;
  centerX: number;
  x: SharedValue<number>;
}) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const scale = width / CELL_BOX.width;
  const d = useMemo(() => cellLine(author), [author]);

  const labelStyle = useAnimatedStyle(() => {
    const offset = Math.abs(x.value + (index + 0.5) * width - centerX);
    return { opacity: 1 - 0.75 * clamp01(offset / width) };
  });
  const lineStyle = useAnimatedStyle(() => {
    const offset = Math.abs(x.value + (index + 0.5) * width - centerX);
    return { opacity: 1 - 0.55 * clamp01(offset / width) };
  });

  return (
    <View style={{ width, alignItems: "center" }}>
      <Animated.View style={lineStyle}>
        {/* Drawn with room above and below the box, so neither the ink nor
            a wavy placeholder dipping below the line is cut off. */}
        <Svg
          width={width}
          height={(CELL_BOX.height + 2 * CELL_BLEED) * scale}
          viewBox={`0 ${-CELL_BLEED} ${CELL_BOX.width} ${CELL_BOX.height + 2 * CELL_BLEED}`}
          style={{ marginVertical: -CELL_BLEED * scale }}
        >
          <Path
            d={d}
            stroke={INK}
            strokeWidth={PORTRAIT_INK_PX / scale}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          { alignItems: "center", paddingHorizontal: spacing(6) },
          labelStyle,
        ]}
      >
        <Text
          size="md"
          weight={400}
          color={Colors.K100}
          numberOfLines={2}
          style={{ textAlign: "center", marginTop: spacing(NAME_GAP) }}
        >
          {author.name}
        </Text>
        <Text size="xs" weight={300} color={Colors.K300}>
          {lifespan(author, (key, options) => t(key, options))}
        </Text>
        <Text size="sm" weight={300} color={Colors.K400}>
          {t("quotes.count", {
            collected: author.collectedIds.length,
            total: author.quoteIds.length,
          })}
        </Text>
      </Animated.View>
    </View>
  );
});

// --- Quotes --------------------------------------------------------------------------

type Box = { y: number; height: number };

/** One collected quote under the portrait; it dims away from the centre. */
const GalleryQuote = memo(function GalleryQuote({
  id,
  selected,
  box,
  contentTop,
  centerY,
  y,
  onMeasured,
}: {
  id: QuoteId;
  selected: boolean;
  box: Box | undefined;
  contentTop: number;
  centerY: number;
  y: SharedValue<number>;
  onMeasured: (id: QuoteId, box: Box) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const language = useDisplayLanguage();
  const { settings } = useGlobalSettings();
  const [showOriginal, setShowOriginal] = useState(false);
  const english = getQuote(id);
  const translated =
    !!english &&
    settings.translateCollectibles &&
    isQuoteTranslated(id, english, language);
  const quote =
    english && translated && !showOriginal
      ? localizeQuote(id, english, language)
      : english;

  const boxY = box?.y ?? 0;
  const boxHeight = box?.height ?? 1;
  const style = useAnimatedStyle(() => {
    const middle = y.value + contentTop + boxY + boxHeight / 2;
    const offset = Math.abs(middle - centerY);
    return { opacity: 1 - 0.72 * clamp01(offset / Math.max(boxHeight, 80)) };
  });

  if (!quote) return null;
  return (
    <Animated.View
      onLayout={(event) => {
        const { y: top, height } = event.nativeEvent.layout;
        onMeasured(id, { y: top, height });
      }}
      style={[{ paddingVertical: spacing(22), alignItems: "center" }, style]}
    >
      <Text
        size="lg"
        weight={300}
        color={Colors.K100}
        style={{ textAlign: "center" }}
      >
        {quote.text}
      </Text>
      <Text
        size="xs"
        weight={300}
        color={Colors.K400}
        style={{ textAlign: "center", marginTop: spacing(10) }}
      >
        {quote.source}
      </Text>
      {translated && selected && (
        <View style={{ marginTop: spacing(14) }}>
          <ShowOriginalToggle
            showOriginal={showOriginal}
            onToggle={() => setShowOriginal((current) => !current)}
          />
        </View>
      )}
    </Animated.View>
  );
});

// --- The gallery ---------------------------------------------------------------------

/**
 * Every author on one long line, oldest first, the one in view centred;
 * their collected quotes stacked below. Swipes move between authors
 * (sideways) and through the quotes (up and down); the gallery pans to
 * follow. There is no free panning or zooming.
 */
export function QuoteGallery({
  authors,
  position,
  area,
  panX,
  panY,
  onAction,
}: Props) {
  const { spacing } = useResponsiveMetrics();
  const visible = area.bottom - area.top;
  const cellWidth = Math.round(
    Math.min(area.width * 0.6, spacing(280), (visible * 0.46 * 200) / 240),
  );
  const portraitHeight = (cellWidth * CELL_BOX.height) / CELL_BOX.width;
  const stripHeight = portraitHeight + spacing(NAME_GAP + 72);
  const quotesTop = stripHeight + spacing(16);
  const columnWidth = Math.min(area.width - spacing(48), spacing(520));
  const centerX = area.width / 2;
  const centerY = area.top + visible / 2;

  const author = authors[position.author];
  // Quote boxes, measured as they lay out, for the current author.
  const [boxes, setBoxes] = useState<Record<number, Box>>({});
  useEffect(() => setBoxes({}), [position.author]);
  const onMeasured = useMemo(
    () => (id: QuoteId, box: Box) =>
      setBoxes((current) =>
        current[id]?.y === box.y && current[id]?.height === box.height
          ? current
          : { ...current, [id]: box },
      ),
    [],
  );

  const targetX = centerX - (position.author + 0.5) * cellWidth;
  const selectedId =
    position.quote === PORTRAIT_FOCUS
      ? undefined
      : author?.collectedIds[position.quote];
  const selectedBox = selectedId !== undefined ? boxes[selectedId] : undefined;
  const targetY =
    selectedId === undefined
      ? centerY - stripHeight / 2
      : selectedBox
        ? centerY - (quotesTop + selectedBox.y + selectedBox.height / 2)
        : null;

  // Straight to the first place; then glide between places. Every swipe
  // counts as a move, so one that goes nowhere still glides back.
  const [moves, setMoves] = useState(0);
  const placed = useRef(false);
  useEffect(() => {
    if (targetY === null) return;
    if (!placed.current) {
      placed.current = true;
      panX.value = targetX;
      panY.value = targetY;
      return;
    }
    // A longer way round (the ends of the line) takes a little longer.
    const distance = Math.abs(panX.value - targetX) / Math.max(1, cellWidth);
    const move = {
      duration: Math.min(1100, MOVE_MS + Math.max(0, distance - 1) * 25),
      easing: Easing.inOut(Easing.cubic),
    };
    panX.value = withTiming(targetX, move);
    panY.value = withTiming(targetY, {
      duration: MOVE_MS,
      easing: move.easing,
    });
  }, [cellWidth, moves, panX, panY, targetX, targetY]);

  // --- Swipes -------------------------------------------------------------------
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const gesture = useMemo(() => {
    const emit = (action: GalleryAction) => {
      setMoves((count) => count + 1);
      onActionRef.current(action);
    };
    return Gesture.Pan()
      .minDistance(12)
      .onUpdate((event) => {
        const sideways =
          Math.abs(event.translationX) > Math.abs(event.translationY);
        dragX.value = sideways ? event.translationX * DRAG_FOLLOW : 0;
        dragY.value = sideways ? 0 : event.translationY * DRAG_FOLLOW;
      })
      .onEnd((event) => {
        const { translationX: tx, translationY: ty } = event;
        const { velocityX: vx, velocityY: vy } = event;
        let action: GalleryAction | null = null;
        // Content follows the finger: swiping left brings the next author in
        // from the right, swiping up the next quote in from below.
        if (Math.abs(tx) > Math.abs(ty)) {
          if (tx < -SWIPE_DISTANCE || vx < -SWIPE_VELOCITY) {
            action = "nextAuthor";
          } else if (tx > SWIPE_DISTANCE || vx > SWIPE_VELOCITY) {
            action = "previousAuthor";
          }
        } else if (ty < -SWIPE_DISTANCE || vy < -SWIPE_VELOCITY) {
          action = "nextQuote";
        } else if (ty > SWIPE_DISTANCE || vy > SWIPE_VELOCITY) {
          action = "previousQuote";
        }
        if (action) {
          // Carry on from where the finger left the gallery, in one plain
          // ease-in-out (letting the drag spring back while the gallery
          // moves on made it bounce).
          panX.value = panX.value + dragX.value;
          panY.value = panY.value + dragY.value;
          dragX.value = 0;
          dragY.value = 0;
          scheduleOnRN(emit, action);
        } else {
          const settle = { duration: 300, easing: Easing.inOut(Easing.cubic) };
          dragX.value = withTiming(0, settle);
          dragY.value = withTiming(0, settle);
        }
      });
  }, [dragX, dragY, panX, panY]);

  // Where things are drawn, including the drag.
  const shownX = useDerivedValue(() => panX.value + dragX.value);
  const shownY = useDerivedValue(() => panY.value + dragY.value);
  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shownX.value }],
  }));
  const columnStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shownY.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill} collapsable={false}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { top: 0 }, columnStyle]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              {
                position: "absolute",
                left: 0,
                top: 0,
                flexDirection: "row",
                width: authors.length * cellWidth,
              },
              stripStyle,
            ]}
          >
            {authors.map((entry, index) => (
              <GalleryCell
                key={entry.name}
                author={entry}
                index={index}
                width={cellWidth}
                centerX={centerX}
                x={shownX}
              />
            ))}
          </Animated.View>

          {author && (
            <Animated.View
              key={author.name}
              style={[
                {
                  position: "absolute",
                  top: quotesTop,
                  left: (area.width - columnWidth) / 2,
                  width: columnWidth,
                },
                fadeIn,
              ]}
            >
              {author.collectedIds.map((id, index) => (
                <GalleryQuote
                  key={id}
                  id={id}
                  selected={index === position.quote}
                  box={boxes[id]}
                  contentTop={quotesTop}
                  centerY={centerY}
                  y={shownY}
                  onMeasured={onMeasured}
                />
              ))}
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
