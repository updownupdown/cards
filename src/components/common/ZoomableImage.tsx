import { Image, type ImageSource } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const MAX_ZOOM = 5;
const DOUBLE_TAP_ZOOM = 2.5;
const SETTLE = { duration: 220 };

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
 * fingers, drag to look about once zoomed, double-tap to zoom in or back out.
 * It fills its box, the picture centred in it. Zoomed, the whole picture
 * grows past its place, up to the whole screen, over whatever is around it
 * (give its box a zIndex); panning stops where its edges meet the screen's.
 */
export function ZoomableImage({
  source,
  width,
  height,
}: {
  source: ImageSource | number | null;
  width: number;
  height: number;
}) {
  const window = useWindowDimensions();
  const boxRef = useRef<View>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  // The picture's centre, from the screen's.
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
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
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

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
    const pinch = Gesture.Pinch()
      .onStart(() => {
        startScale.value = scale.value;
        startX.value = x.value;
        startY.value = y.value;
      })
      .onUpdate((event) => {
        const next = Math.max(
          1,
          Math.min(MAX_ZOOM, startScale.value * event.scale),
        );
        // Keep the point under the fingers where it is.
        const focalX = event.focalX - box.width / 2;
        const focalY = event.focalY - box.height / 2;
        const ratio = next / startScale.value;
        scale.value = next;
        x.value = clampX(focalX - (focalX - startX.value) * ratio, next);
        y.value = clampY(focalY - (focalY - startY.value) * ratio, next);
      });
    const pan = Gesture.Pan()
      .minDistance(4)
      .averageTouches(true)
      .onStart(() => {
        startX.value = x.value;
        startY.value = y.value;
      })
      .onUpdate((event) => {
        x.value = clampX(startX.value + event.translationX, scale.value);
        y.value = clampY(startY.value + event.translationY, scale.value);
      });
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
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
    return Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));
  }, [
    box,
    height,
    offsetX,
    offsetY,
    scale,
    screenHeight,
    screenWidth,
    startScale,
    startX,
    startY,
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
