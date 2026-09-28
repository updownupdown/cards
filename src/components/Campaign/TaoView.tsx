import { Text } from "@/components/common/Text";
import { ParallaxStars } from "@/components/TaoCollection/ParallaxStars";
import { adjacentChapter } from "@/components/TaoCollection/TaoChapterBar";
import { TaoChapterDetail } from "@/components/TaoCollection/TaoChapterDetail";
import {
  cameraOn,
  initialScale,
  TaoSky,
  type SkyArea,
} from "@/components/TaoCollection/TaoSky";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { layoutDims, theme } from "@/styles/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { CollectionBar, useCollectionBarHeight } from "./CollectionBar";

type Props = {
  collectedIds: ReadonlySet<number>;
  /** Room at the top for the Odyssey toggle. */
  topInset: number;
};

// Opening: the sky, then the constellations.
const SKY_IN_MS = 900;
const GRID_AT = 500;
const GRID_MS = 900;
// A chapter opening: the others fade, then the chosen one, while the camera
// drifts in on it.
const OTHERS_OUT_MS = 550;
const FOCUS_OUT_AT = 350;
const FOCUS_OUT_MS = 550;
const DETAIL_AT = 650;
const FLY_IN_MS = 1000;
const FLY_IN_ZOOM = 1.25;
const BAR_IN_MS = 500;
// From one chapter to the next.
const STEP_OUT_MS = 350;
// Back to all chapters.
const DETAIL_OUT_MS = 450;
const GRID_BACK_MS = 900;
/** A pinch closing to this much of its start zooms back out to the sky. */
const PINCH_OUT_SCALE = 0.8;

const easeInOut = Easing.inOut(Easing.cubic);
const easeOut = Easing.out(Easing.cubic);

/**
 * The Tao Te Ching in the Odyssey tab: a night sky holding a constellation
 * for every chapter, 9 x 9, to pan and zoom. Chapters not collected yet are
 * only faint stars. Tapping a collected one flies in to read it; the bar
 * above the tab bar steps through the collected chapters or zooms back out,
 * as does a pinch.
 */
export function TaoView({ collectedIds, topInset }: Props) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const { settings } = useGlobalSettings();
  const insets = useSafeAreaInsets();
  const barHeight = useCollectionBarHeight();
  const collected = useMemo(
    () => [...collectedIds].sort((a, b) => a - b),
    [collectedIds],
  );
  const isEmpty = collected.length === 0;

  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [selected, setSelected] = useState<number | null>(null);
  // Bumped on every landing, so even the same chapter animates afresh.
  const [visit, setVisit] = useState(0);
  const [busy, setBusy] = useState(false);
  const openedAt = useRef(Date.now());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  };

  const sky = useSharedValue(0);
  const detail = useSharedValue(1);
  const bar = useSharedValue(0);
  const parallax = useSharedValue(1);
  const others = useSharedValue(0);
  const focus = useSharedValue(0);
  const focusIndex = useSharedValue(-1);
  const cameraX = useSharedValue(0);
  const cameraY = useSharedValue(0);
  const cameraScale = useSharedValue(1);
  const camera = useMemo(
    () => ({ x: cameraX, y: cameraY, scale: cameraScale }),
    [cameraScale, cameraX, cameraY],
  );
  const fade = useMemo(
    () => ({ others, focus, focusIndex }),
    [focus, focusIndex, others],
  );

  useEffect(() => {
    sky.value = withTiming(1, { duration: SKY_IN_MS, easing: easeInOut });
  }, [sky]);

  const pad = spacing(layoutDims.pagePadding);
  const area: SkyArea | null = useMemo(
    () =>
      size
        ? {
            width: size.width,
            height: size.height,
            left: insets.left + pad,
            right: size.width - insets.right - pad,
            top: topInset,
            bottom: size.height - barHeight,
          }
        : null,
    [barHeight, insets, pad, size, topInset],
  );

  // The camera starts on the first chapter collected.
  const placed = useRef(false);
  useEffect(() => {
    if (!area || placed.current) return;
    placed.current = true;
    const start = cameraOn(collected[0] ?? 41, initialScale(area), area);
    cameraX.value = start.x;
    cameraY.value = start.y;
    cameraScale.value = start.scale;
  }, [area, cameraScale, cameraX, cameraY, collected]);

  const revealGrid = useCallback(() => {
    const wait = Math.max(0, GRID_AT - (Date.now() - openedAt.current));
    others.value = withDelay(
      wait,
      withTiming(1, { duration: GRID_MS, easing: easeInOut }),
    );
  }, [others]);
  useEffect(() => {
    if (isEmpty) revealGrid();
  }, [isEmpty, revealGrid]);

  const land = (chapter: number) => {
    detail.value = 1;
    setSelected(chapter);
    setVisit((count) => count + 1);
    setBusy(false);
  };

  const openChapter = (chapter: number) => {
    if (busy || !area) return;
    setBusy(true);
    focusIndex.value = chapter - 1;
    focus.value = others.value;
    others.value = withTiming(0, { duration: OTHERS_OUT_MS, easing: easeInOut });
    focus.value = withDelay(
      FOCUS_OUT_AT,
      withTiming(0, { duration: FOCUS_OUT_MS, easing: easeInOut }),
    );
    const target = cameraOn(
      chapter,
      Math.min(2.4, cameraScale.value * FLY_IN_ZOOM),
      area,
    );
    const flight = { duration: FLY_IN_MS, easing: easeOut };
    cameraX.value = withTiming(target.x, flight);
    cameraY.value = withTiming(target.y, flight);
    cameraScale.value = withTiming(target.scale, flight);
    parallax.value = withTiming(0.4, {
      duration: OTHERS_OUT_MS,
      easing: easeInOut,
    });
    bar.value = withDelay(
      DETAIL_AT,
      withTiming(1, { duration: BAR_IN_MS, easing: easeInOut }),
    );
    later(DETAIL_AT, () => land(chapter));
  };

  /** The previous or next collected chapter, round the ends. */
  const step = (direction: 1 | -1) => {
    if (busy || selected === null || !area) return;
    const next = adjacentChapter(collected, selected, direction);
    if (next === undefined) return;
    setBusy(true);
    detail.value = withTiming(0, { duration: STEP_OUT_MS, easing: easeInOut });
    later(STEP_OUT_MS, () => {
      // The sky behind follows, so zooming out returns to this chapter.
      const target = cameraOn(next, cameraScale.value, area);
      cameraX.value = target.x;
      cameraY.value = target.y;
      land(next);
    });
  };

  const backToAll = () => {
    if (busy || selected === null) return;
    setBusy(true);
    const out = { duration: DETAIL_OUT_MS, easing: easeInOut };
    detail.value = withTiming(0, out);
    bar.value = withTiming(0, out);
    later(DETAIL_OUT_MS, () => {
      setSelected(null);
      focusIndex.value = -1;
      others.value = withTiming(1, { duration: GRID_BACK_MS, easing: easeInOut });
      parallax.value = withTiming(1, {
        duration: GRID_BACK_MS,
        easing: easeInOut,
      });
      setBusy(false);
    });
  };
  const backToAllRef = useRef(backToAll);
  backToAllRef.current = backToAll;

  // Pinching the open chapter closed zooms back out to the whole sky.
  const pinchOut = useMemo(() => {
    const zoomOut = () => backToAllRef.current();
    return Gesture.Pinch().onEnd((event) => {
      "worklet";
      if (event.scale < PINCH_OUT_SCALE) scheduleOnRN(zoomOut);
    });
  }, []);

  const skyStyle = useAnimatedStyle(() => ({ opacity: sky.value }));
  const detailStyle = useAnimatedStyle(() => ({ opacity: detail.value }));
  const barStyle = useAnimatedStyle(() => ({ opacity: bar.value }));
  const parallaxStyle = useAnimatedStyle(() => ({ opacity: parallax.value }));
  const emptyStyle = useAnimatedStyle(() => ({ opacity: others.value }));

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
          <Animated.View
            style={[StyleSheet.absoluteFill, pointerEventsStyles.none, parallaxStyle]}
          >
            <ParallaxStars
              width={size.width}
              height={size.height}
              x={cameraX}
              y={cameraY}
              moving={settings.showAnimations}
            />
          </Animated.View>
        )}

        {area && !isEmpty && (
          <TaoSky
            area={area}
            camera={camera}
            fade={fade}
            viewableIds={collectedIds}
            interactive={selected === null && !busy}
            onSelect={openChapter}
            onReady={revealGrid}
          />
        )}

        {area && isEmpty && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: pad * 2,
                pointerEvents: "none",
              },
              emptyStyle,
            ]}
          >
            <Text
              size="lg"
              weight={300}
              color={theme.ink}
              style={{ textAlign: "center", maxWidth: spacing(440) }}
            >
              {t("tao.empty")}
            </Text>
            <Text
              size="sm"
              weight={300}
              color={theme.dim}
              style={{
                textAlign: "center",
                maxWidth: spacing(440),
                marginTop: spacing(20),
              }}
            >
              {t("tao.about")}
            </Text>
          </Animated.View>
        )}

        {area && selected !== null && (
          <GestureDetector gesture={pinchOut}>
            <Animated.View style={[StyleSheet.absoluteFill, detailStyle]}>
              <TaoChapterDetail
                key={`${selected}-${visit}`}
                chapterNumber={selected}
                width={area.width}
                height={area.height}
                topInset={topInset}
                bottomInset={barHeight}
              />
            </Animated.View>
          </GestureDetector>
        )}
      </Animated.View>

      <View
        style={[
          { position: "absolute", left: 0, right: 0, bottom: 0 },
          selected !== null ? pointerEventsStyles.boxNone : pointerEventsStyles.none,
        ]}
      >
        <Animated.View style={barStyle}>
          <CollectionBar
            previousLabel={t("tao.previous")}
            nextLabel={t("tao.next")}
            zoomOutLabel={t("tao.viewAll")}
            onPrevious={() => step(-1)}
            onNext={() => step(1)}
            onZoomOut={backToAll}
          />
        </Animated.View>
      </View>
    </View>
  );
}
