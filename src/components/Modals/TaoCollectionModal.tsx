import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { HomeStarfieldBackground } from "@/components/Home/HomeStarfieldBackground";
import { ParallaxStars } from "@/components/TaoCollection/ParallaxStars";
import {
  adjacentChapter,
  TaoChapterBar,
  useChapterBarHeight,
} from "@/components/TaoCollection/TaoChapterBar";
import { TaoChapterDetail } from "@/components/TaoCollection/TaoChapterDetail";
import {
  cameraOn,
  initialScale,
  TaoSky,
  type SkyArea,
} from "@/components/TaoCollection/TaoSky";
import { TAO_CHAPTER_COUNT } from "@/data/collectibles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { Colors, layoutDims, rgba } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

type Props = {
  collectedIds: ReadonlySet<number>;
  onClose: () => void;
};

// Opening: the sky fades in slowly, as after a win, then the header, then the
// constellations.
const SKY_IN_MS = 2080;
const HEADER_AT = 800;
const HEADER_MS = 800;
const GRID_AT = 1360;
const GRID_MS = 1120;
// A chapter opening: the others fade, then the chosen one, while the camera
// drifts in on it.
const OTHERS_OUT_MS = 550;
const FOCUS_OUT_AT = 350;
const FOCUS_OUT_MS = 550;
const DETAIL_AT = 650;
const FLY_IN_MS = 1000;
const FLY_IN_ZOOM = 1.25;
const BAR_IN_MS = 600;
// From one chapter to the next.
const STEP_OUT_MS = 350;
// Back to all chapters.
const DETAIL_OUT_MS = 450;
const GRID_BACK_MS = 900;
const CLOSE_MS = 500;

const easeInOut = Easing.inOut(Easing.cubic);
const easeOut = Easing.out(Easing.cubic);

/**
 * The Tao Te Ching collection: a full-screen night sky holding a
 * constellation for every chapter collected, 9 x 9. Tapping one opens the
 * chapter, drawn and read out much as it was when it was won.
 */
export function TaoCollectionModal({ collectedIds, onClose }: Props) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const { settings } = useGlobalSettings();
  const insets = useSafeAreaInsets();
  const barHeight = useChapterBarHeight();
  const collected = useMemo(
    () => [...collectedIds].sort((a, b) => a - b),
    [collectedIds],
  );
  const isEmpty = collected.length === 0;

  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [headerHeight, setHeaderHeight] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  // Bumped on every landing, so even the same chapter animates afresh.
  const [visit, setVisit] = useState(0);
  const [busy, setBusy] = useState(false);
  const closing = useRef(false);
  const openedAt = useRef(Date.now());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  };

  const sky = useSharedValue(0);
  const header = useSharedValue(0);
  const detail = useSharedValue(1);
  const bar = useSharedValue(0);
  // The loose parallax stars show only over the whole sky.
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
    header.value = withDelay(
      HEADER_AT,
      withTiming(1, { duration: HEADER_MS, easing: easeInOut }),
    );
  }, [header, sky]);

  const pad = spacing(layoutDims.pagePadding);
  const area: SkyArea | null = useMemo(
    () =>
      size && headerHeight
        ? {
            width: size.width,
            height: size.height,
            left: insets.left + pad,
            right: size.width - insets.right - pad,
            top: headerHeight,
            bottom: size.height - insets.bottom - pad,
          }
        : null,
    [headerHeight, insets, pad, size],
  );

  // The camera starts on the first chapter collected (the grid is still
  // hidden then).
  const placed = useRef(false);
  useEffect(() => {
    if (!area || placed.current) return;
    placed.current = true;
    const start = cameraOn(collected[0] ?? 41, initialScale(area), area);
    cameraX.value = start.x;
    cameraY.value = start.y;
    cameraScale.value = start.scale;
  }, [area, cameraScale, cameraX, cameraY, collected]);

  // The constellations fade in once they are all mounted, never before the
  // sky has had its moment.
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
    if (busy || closing.current || !area) return;
    setBusy(true);
    focusIndex.value = chapter - 1;
    focus.value = others.value;
    others.value = withTiming(0, {
      duration: OTHERS_OUT_MS,
      easing: easeInOut,
    });
    focus.value = withDelay(
      FOCUS_OUT_AT,
      withTiming(0, { duration: FOCUS_OUT_MS, easing: easeInOut }),
    );
    // Drift in on the chosen constellation as the sky empties.
    const target = cameraOn(
      chapter,
      Math.min(2.4, cameraScale.value * FLY_IN_ZOOM),
      area,
    );
    const flight = { duration: FLY_IN_MS, easing: easeOut };
    cameraX.value = withTiming(target.x, flight);
    cameraY.value = withTiming(target.y, flight);
    cameraScale.value = withTiming(target.scale, flight);
    parallax.value = withTiming(0, {
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
    if (busy || closing.current || selected === null || !area) return;
    const next = adjacentChapter(collected, selected, direction);
    if (next === undefined) return;
    setBusy(true);
    detail.value = withTiming(0, { duration: STEP_OUT_MS, easing: easeInOut });
    later(STEP_OUT_MS, () => {
      // The sky behind follows, so "View all" returns to this chapter.
      const target = cameraOn(next, cameraScale.value, area);
      cameraX.value = target.x;
      cameraY.value = target.y;
      land(next);
    });
  };

  const backToAll = () => {
    if (busy || closing.current || selected === null) return;
    setBusy(true);
    const out = { duration: DETAIL_OUT_MS, easing: easeInOut };
    detail.value = withTiming(0, out);
    bar.value = withTiming(0, out);
    later(DETAIL_OUT_MS, () => {
      setSelected(null);
      focusIndex.value = -1;
      others.value = withTiming(1, {
        duration: GRID_BACK_MS,
        easing: easeInOut,
      });
      parallax.value = withTiming(1, {
        duration: GRID_BACK_MS,
        easing: easeInOut,
      });
      setBusy(false);
    });
  };

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    setBusy(true);
    const out = { duration: CLOSE_MS, easing: easeInOut };
    header.value = withTiming(0, out);
    detail.value = withTiming(0, out);
    bar.value = withTiming(0, out);
    others.value = withTiming(0, out);
    focus.value = withTiming(0, out);
    sky.value = withTiming(0, out, (finished) => {
      if (finished) scheduleOnRN(onClose);
    });
  };

  const skyStyle = useAnimatedStyle(() => ({ opacity: sky.value }));
  const headerStyle = useAnimatedStyle(() => ({ opacity: header.value }));
  const detailStyle = useAnimatedStyle(() => ({ opacity: detail.value }));
  const barStyle = useAnimatedStyle(() => ({ opacity: bar.value }));
  const parallaxStyle = useAnimatedStyle(() => ({ opacity: parallax.value }));
  const emptyStyle = useAnimatedStyle(() => ({ opacity: others.value }));

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={selected !== null ? backToAll : close}
    >
      {/* A native Modal is its own root, so gestures inside it need their
          own GestureHandlerRootView. */}
      <GestureHandlerRootView
        style={{ flex: 1 }}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setSize({ width, height });
        }}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: Colors.starfieldOverlay, overflow: "hidden" },
            skyStyle,
          ]}
        >
          {size && (
            <>
              {/* The home screen's starfield, placed exactly as there. */}
              <HomeStarfieldBackground
                animationsEnabled={settings.showAnimations}
                width={size.width}
                height={size.height}
              />
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  pointerEventsStyles.none,
                  parallaxStyle,
                ]}
              >
                <ParallaxStars
                  width={size.width}
                  height={size.height}
                  x={cameraX}
                  y={cameraY}
                  moving={settings.showAnimations}
                />
              </Animated.View>
            </>
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
                color={Colors.K200}
                style={{ textAlign: "center", maxWidth: spacing(440) }}
              >
                {t("tao.empty")}
              </Text>
              <Text
                size="sm"
                weight={300}
                color={Colors.K400}
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
            <Animated.View style={[StyleSheet.absoluteFill, detailStyle]}>
              <TaoChapterDetail
                key={`${selected}-${visit}`}
                chapterNumber={selected}
                width={area.width}
                height={area.height}
                topInset={headerHeight}
                bottomInset={barHeight}
              />
            </Animated.View>
          )}

          {/* Fades at both ends, as on the home screen, so the title, the
              close button and the bar stay clear over the sky. */}
          <LinearGradient
            colors={[
              rgba(Colors.starfieldOverlay, 0.9),
              rgba(Colors.starfieldOverlay, 0),
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: headerHeight * 1.7,
              pointerEvents: "none",
            }}
          />
          <LinearGradient
            colors={[
              rgba(Colors.starfieldOverlay, 0),
              rgba(Colors.starfieldOverlay, insets.bottom > 0 ? 0.6 : 1),
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: insets.bottom,
              height: barHeight - insets.bottom,
              pointerEvents: "none",
            }}
          />
          <LinearGradient
            colors={[
              rgba(Colors.starfieldOverlay, 0.6),
              rgba(Colors.starfieldOverlay, 0.8),
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: insets.bottom,
              pointerEvents: "none",
            }}
          />
        </Animated.View>

        {/* The row itself lets touches through to the sky (a plain view:
            on the web an animated one drops "box-none"); its two halves fade
            in on their own. */}
        <View
          onLayout={(event) =>
            setHeaderHeight(Math.ceil(event.nativeEvent.layout.height))
          }
          style={[
            flexStyles.rowCentered,
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              paddingTop: insets.top + spacing(14),
              paddingBottom: spacing(10),
              paddingLeft: insets.left + pad,
              paddingRight: insets.right + spacing(10),
            },
            pointerEventsStyles.boxNone,
          ]}
        >
          <Animated.View
            style={[
              flexStyles.rowCentered,
              pointerEventsStyles.none,
              headerStyle,
            ]}
          >
            <Icon
              name="tao"
              size={32}
              color={Colors.K200}
              style={{ marginRight: spacing(12) }}
            />
            <View style={flexStyles.colStart}>
              <Text size="xl" color={Colors.K200} weight={500}>
                {t("tao.title")}
              </Text>
              <Text
                size="sm"
                color={Colors.white}
                weight={300}
                style={{ opacity: 0.75 }}
              >
                {t("tao.subtitle", {
                  collected: collectedIds.size,
                  total: TAO_CHAPTER_COUNT,
                })}
              </Text>
            </View>
          </Animated.View>
          <Animated.View style={[{ marginLeft: "auto" }, headerStyle]}>
            <Button
              style={[
                flexStyles.rowCentered,
                {
                  backgroundColor: "transparent",
                  borderRadius: spacing(layoutDims.menuButtonSize / 2),
                  padding: 0,
                  width: spacing(layoutDims.menuButtonSize),
                  height: spacing(layoutDims.menuButtonSize),
                  boxShadow: "none",
                  borderWidth: 0,
                },
              ]}
              onPress={close}
              iconName="close"
              iconSize={28}
              iconColor={rgba(Colors.white, 0.7)}
            />
          </Animated.View>
        </View>

        {/* On top of everything while a chapter is open. Touches are switched
            on a plain view: an animated one on the web keeps its first
            pointer-events value. */}
        <View
          style={[
            { position: "absolute", left: 0, right: 0, bottom: 0 },
            selected !== null
              ? pointerEventsStyles.boxNone
              : pointerEventsStyles.none,
          ]}
        >
          <Animated.View style={barStyle}>
            <TaoChapterBar
              onPrevious={() => step(-1)}
              onNext={() => step(1)}
              onViewAll={backToAll}
            />
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
