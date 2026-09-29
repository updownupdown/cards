import { Image, type ImageSource } from "expo-image";
import { useEffect, useMemo } from "react";
import { Platform, View } from "react-native";
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
 * A picture to look into: pinch (or, on the web, scroll) to zoom around the
 * fingers, drag to look about once zoomed, double-tap to zoom in or back out.
 * It never slides off its box: panning stops at the picture's edges.
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
    const clamp = (value: number, zoom: number, size: number) => {
      "worklet";
      const limit = ((zoom - 1) * size) / 2;
      return Math.max(-limit, Math.min(limit, value));
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
        const focalX = event.focalX - width / 2;
        const focalY = event.focalY - height / 2;
        const ratio = next / startScale.value;
        scale.value = next;
        x.value = clamp(focalX - (focalX - startX.value) * ratio, next, width);
        y.value = clamp(focalY - (focalY - startY.value) * ratio, next, height);
      });
    const pan = Gesture.Pan()
      .minDistance(4)
      .averageTouches(true)
      .onStart(() => {
        startX.value = x.value;
        startY.value = y.value;
      })
      .onUpdate((event) => {
        x.value = clamp(startX.value + event.translationX, scale.value, width);
        y.value = clamp(startY.value + event.translationY, scale.value, height);
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
        const focalX = event.x - width / 2;
        const focalY = event.y - height / 2;
        scale.value = withTiming(DOUBLE_TAP_ZOOM, SETTLE);
        x.value = withTiming(
          clamp(-focalX * (DOUBLE_TAP_ZOOM - 1), DOUBLE_TAP_ZOOM, width),
          SETTLE,
        );
        y.value = withTiming(
          clamp(-focalY * (DOUBLE_TAP_ZOOM - 1), DOUBLE_TAP_ZOOM, height),
          SETTLE,
        );
      });
    return Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));
  }, [height, scale, startScale, startX, startY, width, x, y]);

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
          const box = event.currentTarget.getBoundingClientRect();
          const focalX = event.clientX - box.left - width / 2;
          const focalY = event.clientY - box.top - height / 2;
          const ratio = next / scale.value;
          const limit = (size: number) => ((next - 1) * size) / 2;
          const clamp = (value: number, size: number) =>
            Math.max(-limit(size), Math.min(limit(size), value));
          scale.value = next;
          x.value = clamp(focalX - (focalX - x.value) * ratio, width);
          y.value = clamp(focalY - (focalY - y.value) * ratio, height);
        }
      : undefined;

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={{ width, height, overflow: "hidden" }}
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
