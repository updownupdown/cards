import { Icon, type IconName } from "@/icons";
import { useEffect } from "react";
import type { ViewStyle } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type AnimatedHomeTabIconProps = {
  active: boolean;
  color: string;
  name: IconName;
  size: number;
};

const motionByIcon: Partial<Record<IconName, (progress: number) => ViewStyle>> = {
  home: (progress) => ({
    opacity: interpolate(progress, [0, 1], [0.72, 1]),
    transform: [
      { translateY: interpolate(progress, [0, 1], [2, -1]) },
      { rotate: `${interpolate(progress, [0, 1], [0, -4])}deg` },
      { scale: interpolate(progress, [0, 1], [0.92, 1.08]) },
    ],
  }),
  "milky-way": (progress) => ({
    opacity: interpolate(progress, [0, 1], [0.72, 1]),
    transform: [
      { rotate: `${interpolate(progress, [0, 1], [-20, 360])}deg` },
      { scale: interpolate(progress, [0, 1], [0.86, 1.08]) },
    ],
  }),
  stamp: (progress) => ({
    opacity: interpolate(progress, [0, 1], [0.72, 1]),
    transform: [
      { translateY: interpolate(progress, [0, 1], [3, -2]) },
      { rotate: `${interpolate(progress, [0, 1], [7, -3])}deg` },
      { scale: interpolate(progress, [0, 1], [0.86, 1.06]) },
    ],
  }),
  search: (progress) => ({
    opacity: interpolate(progress, [0, 1], [0.72, 1]),
    transform: [
      { translateX: interpolate(progress, [0, 1], [-1, 1]) },
      { rotate: `${interpolate(progress, [0, 1], [-12, 4])}deg` },
      { scale: interpolate(progress, [0, 1], [0.86, 1.1]) },
    ],
  }),
};

export function AnimatedHomeTabIcon({
  active,
  color,
  name,
  size,
}: AnimatedHomeTabIconProps) {
  const progress = useSharedValue(active ? 1 : 0);
  const animatedStyle = useAnimatedStyle(() =>
    motionByIcon[name]?.(progress.value) ?? {},
  );

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: active ? 360 : 220 });
  }, [active, progress]);

  return (
    <Animated.View style={animatedStyle}>
      <Icon name={name} size={size} color={color} />
    </Animated.View>
  );
}