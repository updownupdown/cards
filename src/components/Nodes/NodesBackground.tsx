import { rgba } from "@/styles/styles";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Platform,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

const STAR_COLORS = ["#ffffff", "#eef8ff", "#d9efff", "#b9ddff", "#91c7ff"];

type NodesBackgroundProps = {
  animationsEnabled: boolean;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  containerRef: RefObject<View | null>;
  onLayout: (event: LayoutChangeEvent) => void;
  children: ReactNode;
};

function seededStars(count: number, salt: number) {
  let seed = salt * 0x9e3779b1;
  const random = () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return Array.from({ length: count }, () => {
    const x = 0.01 + random() * 0.98;
    const y = 0.01 + random() * 0.98;
    const size = random() < 0.82 ? 1 : 2;
    const opacity = 0.24 + random() * 0.4;
    const color = STAR_COLORS[Math.floor(random() * STAR_COLORS.length)];
    const flickers = random() < 0.2;
    return { x, y, size, opacity, color, flickers };
  });
}

type StarPoint = ReturnType<typeof seededStars>[number];

function NativeFlickeringStar({
  star,
  index,
  animationsEnabled,
}: {
  star: StarPoint;
  index: number;
  animationsEnabled: boolean;
}) {
  const opacity = useRef(new RNAnimated.Value(star.opacity)).current;

  useEffect(() => {
    opacity.stopAnimation();
    opacity.setValue(star.opacity);
    if (!animationsEnabled) return;

    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.delay(500 + ((index * 379) % 2400)),
        RNAnimated.timing(opacity, {
          toValue: Math.min(1, star.opacity + 0.3),
          duration: 280 + ((index * 97) % 420),
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.timing(opacity, {
          toValue: star.opacity,
          duration: 360 + ((index * 61) % 500),
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [animationsEnabled, index, opacity, star.opacity]);

  return (
    <RNAnimated.View
      style={{
        position: "absolute",
        left: `${star.x * 100}%`,
        top: `${star.y * 100}%`,
        width: star.size,
        height: star.size,
        borderRadius: star.size,
        backgroundColor: star.color,
        opacity,
      }}
    />
  );
}

function WebFlickeringStar({
  star,
  index,
  animationsEnabled,
}: {
  star: StarPoint;
  index: number;
  animationsEnabled: boolean;
}) {
  const animationStyle = animationsEnabled
    ? ({
        animationName: "nodes-star-flicker",
        animationDelay: `${500 + ((index * 379) % 2400)}ms`,
        animationDuration: `${2600 + ((index * 97) % 1400)}ms`,
        animationIterationCount: "infinite",
        animationTimingFunction: "ease-in-out",
      } as Record<string, unknown>)
    : null;

  return (
    <View
      style={[
        {
          position: "absolute",
          left: `${star.x * 100}%`,
          top: `${star.y * 100}%`,
          width: star.size,
          height: star.size,
          borderRadius: star.size,
          backgroundColor: star.color,
          opacity: star.opacity,
        },
        animationStyle,
      ]}
    />
  );
}

function FlickeringStar(props: {
  star: StarPoint;
  index: number;
  animationsEnabled: boolean;
}) {
  return Platform.OS === "web" ? (
    <WebFlickeringStar {...props} />
  ) : (
    <NativeFlickeringStar {...props} />
  );
}

function StarField({
  stars,
  animationsEnabled,
  sizeBoost = 0,
  maximumOpacity = 1,
}: {
  stars: StarPoint[];
  animationsEnabled: boolean;
  sizeBoost?: number;
  maximumOpacity?: number;
}) {
  return stars.map((star, index) => {
    const renderedStar = {
      ...star,
      size: star.size + sizeBoost,
      opacity: Math.min(star.opacity, maximumOpacity),
    };

    return star.flickers ? (
      <FlickeringStar
        key={index}
        star={renderedStar}
        index={index}
        animationsEnabled={animationsEnabled}
      />
    ) : (
      <View
        key={index}
        style={{
          position: "absolute",
          left: `${renderedStar.x * 100}%`,
          top: `${renderedStar.y * 100}%`,
          width: renderedStar.size,
          height: renderedStar.size,
          borderRadius: renderedStar.size,
          backgroundColor: renderedStar.color,
          opacity: renderedStar.opacity,
        }}
      />
    );
  });
}

function ParallaxStarLayer({
  stars,
  factor,
  translateX,
  translateY,
  animationsEnabled,
  sizeBoost,
  maximumOpacity,
}: {
  stars: StarPoint[];
  factor: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  animationsEnabled: boolean;
  sizeBoost?: number;
  maximumOpacity?: number;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: animationsEnabled ? translateX.value * factor : 0 },
      { translateY: animationsEnabled ? translateY.value * factor : 0 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          pointerEvents: "none",
        },
        animatedStyle,
      ]}
    >
      <StarField
        stars={stars}
        animationsEnabled={animationsEnabled}
        sizeBoost={sizeBoost}
        maximumOpacity={maximumOpacity}
      />
    </Animated.View>
  );
}

export function NodesBackground({
  animationsEnabled,
  translateX,
  translateY,
  containerRef,
  onLayout,
  children,
}: NodesBackgroundProps) {
  const starLayers = useMemo(() => {
    const stars = seededStars(140, 3);
    return [
      stars.slice(0, 45),
      stars.slice(45, 85),
      stars.slice(85, 117),
      stars.slice(117),
    ];
  }, []);

  const handleLayout = (event: LayoutChangeEvent) => {
    onLayout(event);
  };

  return (
    <View
      ref={containerRef}
      onLayout={handleLayout}
      style={{ flex: 1, overflow: "hidden" }}
    >
      <ParallaxStarLayer
        stars={starLayers[0]}
        factor={0.08}
        translateX={translateX}
        translateY={translateY}
        animationsEnabled={animationsEnabled}
        maximumOpacity={0.5}
      />
      <ParallaxStarLayer
        stars={starLayers[1]}
        factor={0.17}
        translateX={translateX}
        translateY={translateY}
        animationsEnabled={animationsEnabled}
        maximumOpacity={0.64}
      />

      {children}

      <ParallaxStarLayer
        stars={starLayers[2]}
        factor={0.31}
        translateX={translateX}
        translateY={translateY}
        animationsEnabled={animationsEnabled}
        sizeBoost={1}
        maximumOpacity={0.56}
      />
      <ParallaxStarLayer
        stars={starLayers[3]}
        factor={0.48}
        translateX={translateX}
        translateY={translateY}
        animationsEnabled={animationsEnabled}
        sizeBoost={2}
        maximumOpacity={0.42}
      />
    </View>
  );
}
