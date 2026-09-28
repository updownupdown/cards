import {
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import { ShootingStar } from "@/components/common/ShootingStar";
import { theme } from "@/styles/styles";

const STAR_COLORS = ["#ffffff", "#eef8ff", "#d9efff", "#b9ddff", "#91c7ff"];

type CampaignBackgroundProps = {
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
    // Fine points, 30% under a pixel or two.
    const size = random() < 0.82 ? 0.7 : 1.4;
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
          duration: 1600 + ((index * 97) % 1200),
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.timing(opacity, {
          toValue: star.opacity,
          duration: 2000 + ((index * 61) % 1400),
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [animationsEnabled, index, opacity, star.opacity]);

  // The pulse brightens the star and swells a soft halo round it.
  const halo = star.size * 5;
  return (
    <RNAnimated.View
      style={{
        position: "absolute",
        left: `${star.x * 100}%`,
        top: `${star.y * 100}%`,
        width: star.size,
        height: star.size,
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <RNAnimated.View
        style={{
          position: "absolute",
          width: halo,
          height: halo,
          borderRadius: halo / 2,
          backgroundColor: star.color,
          opacity: 0.12,
          transform: [
            {
              scale: opacity.interpolate({
                inputRange: [star.opacity, Math.min(1, star.opacity + 0.3)],
                outputRange: [0.6, 1],
              }),
            },
          ],
        }}
      />
      <View
        style={{
          width: star.size,
          height: star.size,
          borderRadius: star.size,
          backgroundColor: star.color,
        }}
      />
    </RNAnimated.View>
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
        animationName: "campaign-star-pulse",
        animationDelay: `${500 + ((index * 379) % 2400)}ms`,
        animationDuration: `${4200 + ((index * 97) % 2400)}ms`,
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
          // A soft glow, which the pulse swells.
          boxShadow: `0 0 ${star.size * 2.5}px ${star.size * 0.8}px ${star.color}`,
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

export function CampaignBackground({
  animationsEnabled,
  translateX,
  translateY,
  containerRef,
  onLayout,
  children,
}: CampaignBackgroundProps) {
  const starLayers = useMemo(() => {
    const stars = seededStars(240, 3);
    return [
      stars.slice(0, 90),
      stars.slice(90, 160),
      stars.slice(160, 210),
      stars.slice(210),
    ];
  }, []);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Kept stable: a new array each render would restart the comets' timer.
  const cometColors = useMemo(() => [theme.ink, theme.accent2], []);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      Math.abs(current.width - width) > 1 ||
      Math.abs(current.height - height) > 1
        ? { width, height }
        : current,
    );
    onLayout(event);
  };

  return (
    <View
      ref={containerRef}
      onLayout={handleLayout}
      style={{ flex: 1, overflow: "hidden" }}
    >
      {/* Comets: a fine, headless streak every so often. */}
      <ShootingStar
        width={size.width}
        height={size.height}
        animationsEnabled={animationsEnabled}
        colors={cometColors}
        head={false}
        peakOpacity={0.55}
        durationScale={2}
        minIntervalMs={7000}
        maxIntervalMs={16000}
        maxSpeed={700}
      />
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
        sizeBoost={0.7}
        maximumOpacity={0.56}
      />
      <ParallaxStarLayer
        stars={starLayers[3]}
        factor={0.48}
        translateX={translateX}
        translateY={translateY}
        animationsEnabled={animationsEnabled}
        sizeBoost={1.4}
        maximumOpacity={0.42}
      />
    </View>
  );
}
