import { Image, type ImageSource } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const MAX_ZOOM = 5;
/** A pinch may squeeze the picture a little under whole; it springs back. */
const MIN_PINCH_ZOOM = 0.85;
const DOUBLE_TAP_ZOOM = 2.5;
const SETTLE = { duration: 220 };
/** How far a finger moves before it drags, and before it isn't tapping. */
const PAN_START = 6;
const TAP_SLOP = 14;

/**
 * Where a picture may be moved to along one axis, zoomed to `zoom`: while it
 * is smaller than the screen, it stays on screen and over its own place;
 * once larger, it always covers the screen. `offset` is how far its centre
 * sits from the screen's.
 */
function clampAxis(
  value: number,
  zoom: number,
  size: number,
  screen: number,
  offset: number,
) {
  "worklet";
  const own = ((zoom - 1) * size) / 2;
  const room = (screen - zoom * size) / 2;
  const low = room >= 0 ? Math.max(-own, -room - offset) : room - offset;
  const high = room >= 0 ? Math.min(own, room - offset) : -room - offset;
  return Math.max(low, Math.min(high, value));
}

/**
 * A picture to look into: pinch (or, on the web, scroll) to zoom around the
 * fingers, smoothly in and out, moving them to look about as it zooms; drag
 * with one finger to look about once zoomed; double-tap to zoom in or back
 * out.
 * It fills its box, the picture centred in it. Zoomed, the whole picture
 * grows past its place, up to the whole screen, over whatever is around it
 * (give its box a zIndex); panning stops where its edges meet the screen's.
 */
export function ZoomableImage({
  source,
  width,
  height,
  onZoomChange,
}: {
  source: ImageSource | number | null;
  width: number;
  height: number;
  /** When it is zoomed in, or back to whole. */
  onZoomChange?: (zoomed: boolean) => void;
}) {
  const window = useWindowDimensions();
  const boxRef = useRef<View>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  // The picture's centre, from the screen's.
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  // On the web, a pinch's focal point comes in page coordinates, not the
  // box's (as on native and for taps): where the box is on the page, to take
  // off.
  const pageLeft = useSharedValue(0);
  const pageTop = useSharedValue(0);
  const screenWidth = useSharedValue(window.width);
  const screenHeight = useSharedValue(window.height);
  useEffect(() => {
    screenWidth.value = window.width;
    screenHeight.value = window.height;
  }, [screenHeight, screenWidth, window.height, window.width]);

  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startScale = useSharedValue(1);
  const panPointers = useSharedValue(0);
  // Where the fingers have the picture (see the gestures), and how many of
  // the pinch and the drag have hold of it.
  const freeX = useSharedValue(0);
  const freeY = useSharedValue(0);
  const holding = useSharedValue(0);
  const lastPanX = useSharedValue(0);
  const lastPanY = useSharedValue(0);

  useAnimatedReaction(
    () => scale.value > 1.02,
    (zoomed, previous) => {
      if (onZoomChange && previous !== null && zoomed !== previous) {
        scheduleOnRN(onZoomChange, zoomed);
      }
    },
    [onZoomChange],
  );

  // A new picture starts whole.
  useEffect(() => {
    scale.value = 1;
    x.value = 0;
    y.value = 0;
  }, [height, scale, source, width, x, y]);

  const gesture = useMemo(() => {
    const clampX = (value: number, zoom: number) => {
      "worklet";
      return clampAxis(value, zoom, width, screenWidth.value, offsetX.value);
    };
    const clampY = (value: number, zoom: number) => {
      "worklet";
      return clampAxis(value, zoom, height, screenHeight.value, offsetY.value);
    };
    // The pinch and the drag share the picture by each nudging it, frame by
    // frame, from where it is (setting it outright, each from its own start,
    // they'd fight over it): the pinch zooms it about the point between the
    // fingers, the drag moves it with them (one finger, or two together).
    // They nudge where the fingers have it (free), which may be past where
    // it can go: what shows is held in bounds, but the picture keeps to the
    // fingers, so a pinch that passes through those bounds (a picture held
    // on screen while it's smaller than it) still zooms about the fingers.
    const grab = () => {
      "worklet";
      if (holding.value === 0) {
        cancelAnimation(scale);
        cancelAnimation(x);
        cancelAnimation(y);
        freeX.value = x.value;
        freeY.value = y.value;
      }
      holding.value += 1;
    };
    const letGo = () => {
      "worklet";
      holding.value = Math.max(0, holding.value - 1);
    };
    const show = () => {
      "worklet";
      const zoom = Math.max(1, scale.value);
      x.value = clampX(freeX.value, zoom);
      y.value = clampY(freeY.value, zoom);
    };
    const pinch = Gesture.Pinch()
      .onStart(() => {
        grab();
        startScale.value = scale.value;
      })
      .onUpdate((event) => {
        const next = Math.max(
          MIN_PINCH_ZOOM,
          Math.min(MAX_ZOOM, startScale.value * event.scale),
        );
        const focalX = event.focalX - pageLeft.value - box.width / 2;
        const focalY = event.focalY - pageTop.value - box.height / 2;
        const ratio = next / scale.value;
        scale.value = next;
        freeX.value = focalX - (focalX - freeX.value) * ratio;
        freeY.value = focalY - (focalY - freeY.value) * ratio;
        show();
      })
      .onEnd(() => {
        letGo();
        // Pinched past whole (for give): back to whole.
        if (scale.value < 1) {
          scale.value = withTiming(1, SETTLE);
          x.value = withTiming(0, SETTLE);
          y.value = withTiming(0, SETTLE);
        }
      });
    // A finger put down or lifted moves the fingers' middle at a jump: the
    // drag picks up from there rather than jumping the picture with it.
    const pan = Gesture.Pan()
      .minDistance(PAN_START)
      .averageTouches(true)
      .onStart((event) => {
        grab();
        panPointers.value = event.numberOfPointers;
        lastPanX.value = event.translationX;
        lastPanY.value = event.translationY;
      })
      .onUpdate((event) => {
        const dx = event.translationX - lastPanX.value;
        const dy = event.translationY - lastPanY.value;
        lastPanX.value = event.translationX;
        lastPanY.value = event.translationY;
        if (event.numberOfPointers !== panPointers.value) {
          panPointers.value = event.numberOfPointers;
          return;
        }
        freeX.value += dx;
        freeY.value += dy;
        show();
        // One finger only drags: against an edge, the picture stays there,
        // and turning back moves it at once.
        if (event.numberOfPointers === 1) {
          freeX.value = x.value;
          freeY.value = y.value;
        }
      })
      .onEnd(letGo);
    // A shortcut: in to DOUBLE_TAP_ZOOM where tapped, or back out to whole.
    // A finger that travels isn't tapping, so it gives way to the drag.
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDistance(TAP_SLOP)
      .onEnd((event, success) => {
        if (!success) return;
        if (scale.value > 1.05) {
          scale.value = withTiming(1, SETTLE);
          x.value = withTiming(0, SETTLE);
          y.value = withTiming(0, SETTLE);
          return;
        }
        const focalX = event.x - box.width / 2;
        const focalY = event.y - box.height / 2;
        scale.value = withTiming(DOUBLE_TAP_ZOOM, SETTLE);
        x.value = withTiming(
          clampX(-focalX * (DOUBLE_TAP_ZOOM - 1), DOUBLE_TAP_ZOOM),
          SETTLE,
        );
        y.value = withTiming(
          clampY(-focalY * (DOUBLE_TAP_ZOOM - 1), DOUBLE_TAP_ZOOM),
          SETTLE,
        );
      });
    // Whichever starts first has the fingers: the pinch and drag at once
    // (they take turns with the picture, above), else the double tap. The
    // pinch and drag never wait on the double tap to give up.
    return Gesture.Race(Gesture.Simultaneous(pinch, pan), doubleTap);
  }, [
    box,
    freeX,
    freeY,
    height,
    holding,
    offsetX,
    offsetY,
    scale,
    screenHeight,
    screenWidth,
    lastPanX,
    lastPanY,
    panPointers,
    startScale,
    width,
    x,
    y,
  ]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));

  // A mouse has no pinch: the wheel zooms instead, towards the pointer.
  const onWheel =
    Platform.OS === "web"
      ? (event: {
          deltaY: number;
          clientX: number;
          clientY: number;
          currentTarget: { getBoundingClientRect: () => DOMRect };
        }) => {
          const next = Math.max(
            1,
            Math.min(MAX_ZOOM, scale.value * Math.exp(-event.deltaY * 0.002)),
          );
          const rect = event.currentTarget.getBoundingClientRect();
          const focalX = event.clientX - rect.left - rect.width / 2;
          const focalY = event.clientY - rect.top - rect.height / 2;
          const ratio = next / scale.value;
          scale.value = next;
          x.value = clampAxis(
            focalX - (focalX - x.value) * ratio,
            next,
            width,
            screenWidth.value,
            offsetX.value,
          );
          y.value = clampAxis(
            focalY - (focalY - y.value) * ratio,
            next,
            height,
            screenHeight.value,
            offsetY.value,
          );
        }
      : undefined;

  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={boxRef}
        style={{
          alignSelf: "stretch",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
        onLayout={(event) => {
          const { width: boxWidth, height: boxHeight } =
            event.nativeEvent.layout;
          setBox({ width: boxWidth, height: boxHeight });
          boxRef.current?.measureInWindow((left, top) => {
            offsetX.value = left + boxWidth / 2 - window.width / 2;
            offsetY.value = top + boxHeight / 2 - window.height / 2;
            if (Platform.OS === "web") {
              pageLeft.value = left + (globalThis.scrollX ?? 0);
              pageTop.value = top + (globalThis.scrollY ?? 0);
            }
          });
        }}
        {...(onWheel ? ({ onWheel } as object) : null)}
      >
        <Animated.View style={[{ width, height }, style]}>
          <Image
            source={source}
            cachePolicy="memory"
            contentFit="contain"
            transition={300}
            style={{ width, height }}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
