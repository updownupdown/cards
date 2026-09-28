import { Text } from "@/components/common/Text";
import { theme } from "@/styles/styles";
import { ConstellationFigure } from "@/components/TaoReveal/ConstellationFigure";
import { TAO_CHAPTER_COUNT } from "@/data/collectibles";
import { getTaoConstellation } from "@/data/tao-constellations";
import { useTranslation } from "@/i18n";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Text as RNText, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/**
 * The whole Tao Te Ching as a sky: one constellation per chapter, 9 x 9,
 * that can be panned and pinched. Chapters not yet collected show only their
 * minor stars, faintly. The camera lives in the parent so the backdrop can
 * follow it.
 */

export const GRID_SIDE = 9;
/** Room each chapter gets, in world px (at zoom 1). */
export const PITCH = 170;
const FIGURE = 104;
const GRID = GRID_SIDE * PITCH;
/** Room under the grid for a few words about the book. */
const ABOUT_HEIGHT = 3.5 * PITCH;
const ABOUT_FONT = 26;
/** The world: the grid and the note under it, with a cell's margin all round. */
const SPAN_X = GRID + 2 * PITCH;
const SPAN_Y = GRID + ABOUT_HEIGHT + 2 * PITCH;
/** The grid's figures draw a sample of the minor stars, not every one. */
const GRID_DUST = 110;
const MAX_SCALE = 2.4;

export type Camera = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
};

/** Where the grid may be seen: the screen minus the header and margins. */
export type SkyArea = {
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type CellFade = {
  /** Every cell but the focused one. */
  others: SharedValue<number>;
  focus: SharedValue<number>;
  /** Index of the focused cell, or -1. */
  focusIndex: SharedValue<number>;
};

/** The translation range on one axis that keeps the grid in view. */
function axisBounds(
  span: number,
  scale: number,
  viewSize: number,
  areaStart: number,
  areaEnd: number,
) {
  "worklet";
  const extent = span * scale;
  const areaSize = areaEnd - areaStart;
  const centre = (areaStart + areaEnd) / 2 - viewSize / 2;
  const slack = Math.max(0, (extent - areaSize) / 2);
  return [centre - slack, centre + slack] as const;
}

function clampAxis(
  value: number,
  span: number,
  scale: number,
  viewSize: number,
  areaStart: number,
  areaEnd: number,
) {
  "worklet";
  const [low, high] = axisBounds(span, scale, viewSize, areaStart, areaEnd);
  return Math.min(high, Math.max(low, value));
}

export function fitScale(area: SkyArea) {
  return Math.min(
    (area.right - area.left) / SPAN_X,
    (area.bottom - area.top) / SPAN_Y,
  );
}

/** The camera that shows a chapter's cell in the middle of the area. */
export function cameraOn(
  chapter: number,
  scale: number,
  area: SkyArea,
): { x: number; y: number; scale: number } {
  const index = chapter - 1;
  const cellX = ((index % GRID_SIDE) + 1.5) * PITCH - SPAN_X / 2;
  const cellY = (Math.floor(index / GRID_SIDE) + 1.5) * PITCH - SPAN_Y / 2;
  const centreX = (area.left + area.right) / 2 - area.width / 2;
  const centreY = (area.top + area.bottom) / 2 - area.height / 2;
  return {
    scale,
    x: clampAxis(
      centreX - cellX * scale,
      SPAN_X,
      scale,
      area.width,
      area.left,
      area.right,
    ),
    y: clampAxis(
      centreY - cellY * scale,
      SPAN_Y,
      scale,
      area.height,
      area.top,
      area.bottom,
    ),
  };
}

/** The chapter whose cell is under a point on screen, if any. */
export function chapterAt(
  screenX: number,
  screenY: number,
  camera: { x: number; y: number; scale: number },
  area: SkyArea,
): number | null {
  const worldX =
    (screenX - area.width / 2 - camera.x) / camera.scale + SPAN_X / 2 - PITCH;
  const worldY =
    (screenY - area.height / 2 - camera.y) / camera.scale + SPAN_Y / 2 - PITCH;
  const column = Math.floor(worldX / PITCH);
  const row = Math.floor(worldY / PITCH);
  if (column < 0 || column >= GRID_SIDE || row < 0 || row >= GRID_SIDE) {
    return null;
  }
  return row * GRID_SIDE + column + 1;
}

/** The opening zoom: about three chapters across a phone. */
export function initialScale(area: SkyArea) {
  const fit = fitScale(area);
  const comfortable =
    Math.min(area.right - area.left, (area.bottom - area.top) * 0.9) /
    (3.3 * PITCH);
  return Math.min(MAX_SCALE, Math.max(fit, comfortable));
}

type Props = {
  area: SkyArea;
  camera: Camera;
  fade: CellFade;
  viewableIds: ReadonlySet<number>;
  interactive: boolean;
  onSelect: (chapter: number) => void;
  /** Every row has been mounted. */
  onReady: () => void;
};

export function TaoSky({
  area,
  camera,
  fade,
  viewableIds,
  interactive,
  onSelect,
  onReady,
}: Props) {
  const { x, y, scale } = camera;
  const minScale = fitScale(area);
  const containerRef = useRef<View>(null);

  // Rows are mounted one per frame, so opening never stalls the sky's fade.
  const [rows, setRows] = useState(0);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => {
    if (rows >= GRID_SIDE) {
      onReadyRef.current();
      return;
    }
    const frame = requestAnimationFrame(() => setRows((count) => count + 1));
    return () => cancelAnimationFrame(frame);
  }, [rows]);

  const selectAt = (screenX: number, screenY: number) => {
    const chapter = chapterAt(
      screenX,
      screenY,
      { x: x.value, y: y.value, scale: scale.value },
      area,
    );
    // Chapters not yet collected can't be opened.
    if (chapter !== null && viewableIds.has(chapter)) onSelect(chapter);
  };
  const selectAtRef = useRef(selectAt);
  selectAtRef.current = selectAt;

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const pinching = useSharedValue(false);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);

  const gesture = useMemo(() => {
    const { width, height, left, top, right, bottom } = area;
    const handleTap = (tapX: number, tapY: number) =>
      selectAtRef.current(tapX, tapY);

    const tap = Gesture.Tap()
      .maxDistance(10)
      .onEnd((event, success) => {
        "worklet";
        if (success) scheduleOnRN(handleTap, event.x, event.y);
      });

    const pan = Gesture.Pan()
      .minDistance(6)
      .onStart(() => {
        cancelAnimation(x);
        cancelAnimation(y);
        startX.value = x.value;
        startY.value = y.value;
        panX.value = 0;
        panY.value = 0;
      })
      .onUpdate((event) => {
        panX.value = event.translationX;
        panY.value = event.translationY;
        // While pinching, the pinch moves the camera (around its focus).
        if (pinching.value) return;
        const s = scale.value;
        x.value = clampAxis(
          startX.value + event.translationX,
          SPAN_X,
          s,
          width,
          left,
          right,
        );
        y.value = clampAxis(
          startY.value + event.translationY,
          SPAN_Y,
          s,
          height,
          top,
          bottom,
        );
      })
      .onEnd((event) => {
        if (pinching.value) return;
        const s = scale.value;
        const boundsX = axisBounds(SPAN_X, s, width, left, right);
        const boundsY = axisBounds(SPAN_Y, s, height, top, bottom);
        x.value = withDecay({
          velocity: event.velocityX,
          clamp: [boundsX[0], boundsX[1]],
          deceleration: 0.996,
        });
        y.value = withDecay({
          velocity: event.velocityY,
          clamp: [boundsY[0], boundsY[1]],
          deceleration: 0.996,
        });
      });

    const pinch = Gesture.Pinch()
      .onStart((event) => {
        cancelAnimation(x);
        cancelAnimation(y);
        cancelAnimation(scale);
        pinching.value = true;
        startScale.value = scale.value;
        startX.value = x.value;
        startY.value = y.value;
        focalX.value = event.focalX - width / 2;
        focalY.value = event.focalY - height / 2;
      })
      .onUpdate((event) => {
        const s = Math.min(
          MAX_SCALE,
          Math.max(minScale, startScale.value * event.scale),
        );
        const ratio = s / startScale.value;
        // The world point first under the fingers stays under them.
        const fx = event.focalX - width / 2;
        const fy = event.focalY - height / 2;
        scale.value = s;
        x.value = clampAxis(
          fx - (focalX.value - startX.value) * ratio,
          SPAN_X,
          s,
          width,
          left,
          right,
        );
        y.value = clampAxis(
          fy - (focalY.value - startY.value) * ratio,
          SPAN_Y,
          s,
          height,
          top,
          bottom,
        );
      })
      .onEnd(() => {
        pinching.value = false;
        // A finger left on the screen carries on panning from here.
        startX.value = x.value - panX.value;
        startY.value = y.value - panY.value;
      });

    return Gesture.Race(
      Gesture.Simultaneous(
        pan.enabled(interactive),
        pinch.enabled(interactive),
      ),
      tap.enabled(interactive),
    );
  }, [
    area,
    focalX,
    focalY,
    interactive,
    minScale,
    panX,
    panY,
    pinching,
    scale,
    startScale,
    startX,
    startY,
    x,
    y,
  ]);

  // The mouse wheel zooms around the pointer on the web.
  useEffect(() => {
    if (Platform.OS !== "web" || !interactive) return;
    const element = containerRef.current as unknown as HTMLElement | null;
    if (!element?.addEventListener) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const fx = event.clientX - rect.left - area.width / 2;
      const fy = event.clientY - rect.top - area.height / 2;
      cancelAnimation(x);
      cancelAnimation(y);
      const current = scale.value;
      const next = Math.min(
        MAX_SCALE,
        Math.max(minScale, current * Math.exp(-event.deltaY * 0.0015)),
      );
      const ratio = next / current;
      scale.value = next;
      x.value = clampAxis(
        fx - (fx - x.value) * ratio,
        SPAN_X,
        next,
        area.width,
        area.left,
        area.right,
      );
      y.value = clampAxis(
        fy - (fy - y.value) * ratio,
        SPAN_Y,
        next,
        area.height,
        area.top,
        area.bottom,
      );
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [area, interactive, minScale, scale, x, y]);

  const worldStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={containerRef}
        collapsable={false}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: interactive ? "auto" : "none",
        }}
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              width: SPAN_X,
              height: SPAN_Y,
              left: area.width / 2 - SPAN_X / 2,
              top: area.height / 2 - SPAN_Y / 2,
            },
            worldStyle,
          ]}
        >
          {Array.from({ length: rows * GRID_SIDE }, (_, index) =>
            index < TAO_CHAPTER_COUNT ? (
              <SkyCell
                key={index}
                index={index}
                viewable={viewableIds.has(index + 1)}
                fade={fade}
              />
            ) : null,
          )}
          {rows >= GRID_SIDE && <SkyAbout fade={fade} />}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const SkyCell = memo(function SkyCell({
  index,
  viewable,
  fade,
}: {
  index: number;
  viewable: boolean;
  fade: CellFade;
}) {
  const chapter = index + 1;
  const constellation = getTaoConstellation(chapter);
  const { others, focus, focusIndex } = fade;
  const style = useAnimatedStyle(() => ({
    opacity: focusIndex.value === index ? focus.value : others.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: ((index % GRID_SIDE) + 1) * PITCH,
          top: (Math.floor(index / GRID_SIDE) + 1) * PITCH,
          width: PITCH,
          height: PITCH,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {constellation && (
        <ConstellationFigure
          constellation={constellation}
          size={FIGURE}
          dustCount={GRID_DUST}
          dustOnly={!viewable}
        />
      )}
      <Text
        size="xs"
        weight={400}
        color={theme.dim}
        allowFontScaling={false}
        style={{
          position: "absolute",
          top: (PITCH + FIGURE) / 2 + 8,
          opacity: viewable ? 0.7 : 0.35,
        }}
      >
        {chapter}
      </Text>
    </Animated.View>
  );
});

/** A few words about the book, under the grid; it fades with the sky. */
function SkyAbout({ fade }: { fade: CellFade }) {
  const { t } = useTranslation("campaign");
  const { others } = fade;
  const style = useAnimatedStyle(() => ({ opacity: others.value }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          // The middle three columns, so it reads at the opening zoom.
          left: 4 * PITCH,
          top: PITCH + GRID + PITCH * 0.6,
          width: 3 * PITCH,
          height: ABOUT_HEIGHT,
          alignItems: "center",
          pointerEvents: "none",
        },
        style,
      ]}
    >
      <RNText
        allowFontScaling={false}
        style={{
          fontFamily: "Outfit_300Light",
          fontSize: ABOUT_FONT,
          lineHeight: ABOUT_FONT * 1.5,
          color: theme.dim,
          opacity: 0.6,
          textAlign: "center",
        }}
      >
        {t("tao.about")}
      </RNText>
    </Animated.View>
  );
}
