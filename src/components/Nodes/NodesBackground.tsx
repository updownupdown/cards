import { GAMES_DATA } from "@/data/games-registry";
import { rgba } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
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
  ImageBackground,
  Platform,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  cancelAnimation,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const STAR_COLORS = ["#ffffff", "#eef8ff", "#d9efff", "#b9ddff", "#91c7ff"];
const BACKGROUND_COLOR_TRANSITION_DURATION = 420 * 3;

type NodesBackgroundProps = {
  selectedPath: string;
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
          useNativeDriver: true,
        }),
        RNAnimated.timing(opacity, {
          toValue: star.opacity,
          duration: 360 + ((index * 61) % 500),
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: true,
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

function ShootingStar({
  width,
  height,
  animationsEnabled,
}: {
  width: number;
  height: number;
  animationsEnabled: boolean;
}) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const [appearance, setAppearance] = useState({
    angle: 0,
    color: STAR_COLORS[0],
    trailLength: 40,
  });

  useEffect(() => {
    if (!animationsEnabled || width <= 0 || height <= 0) {
      opacity.setValue(0);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;

    function schedule() {
      timer = setTimeout(
        () => {
          const startX = Math.random() * width;
          const startY = Math.random() * height;
          let endX = Math.random() * width;
          let endY = Math.random() * height;
          const minimumDistance = Math.min(width, height) * 0.3;

          while (Math.hypot(endX - startX, endY - startY) < minimumDistance) {
            endX = Math.random() * width;
            endY = Math.random() * height;
          }

          const angle = Math.atan2(endY - startY, endX - startX);
          const fadeInDuration = 20 + Math.random() * 80;
          const holdDuration = 200 + Math.random() * 600;
          const fadeOutDuration = 100 + Math.random() * 300;
          const travelDuration =
            fadeInDuration + holdDuration + fadeOutDuration;

          setAppearance({
            angle,
            color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
            trailLength: 28 + Math.random() * 44,
          });
          translateX.setValue(startX);
          translateY.setValue(startY);
          opacity.setValue(0);

          animation = RNAnimated.parallel([
            RNAnimated.timing(translateX, {
              toValue: endX,
              duration: travelDuration,
              easing: RNEasing.linear,
              useNativeDriver: Platform.OS !== "web",
            }),
            RNAnimated.timing(translateY, {
              toValue: endY,
              duration: travelDuration,
              easing: RNEasing.linear,
              useNativeDriver: Platform.OS !== "web",
            }),
            RNAnimated.sequence([
              RNAnimated.timing(opacity, {
                toValue: 1,
                duration: fadeInDuration,
                easing: RNEasing.out(RNEasing.quad),
                useNativeDriver: Platform.OS !== "web",
              }),
              RNAnimated.delay(holdDuration),
              RNAnimated.timing(opacity, {
                toValue: 0,
                duration: fadeOutDuration,
                easing: RNEasing.in(RNEasing.quad),
                useNativeDriver: Platform.OS !== "web",
              }),
            ]),
          ]);
          animation.start(({ finished }) => {
            if (finished && !cancelled) schedule();
          });
        },
        5000 + Math.random() * 10000,
      );
    }

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      animation?.stop();
    };
  }, [animationsEnabled, height, opacity, translateX, translateY, width]);

  return (
    <RNAnimated.View
      style={{
        position: "absolute",
        pointerEvents: "none",
        top: 0,
        left: 0,
        width: 3,
        height: 3,
        opacity,
        transform: [
          { translateX },
          { translateY },
          { rotate: `${appearance.angle}rad` },
        ],
      }}
    >
      <LinearGradient
        colors={["transparent", rgba(appearance.color, 0.08), appearance.color]}
        locations={[0, 0.72, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          position: "absolute",
          top: 0.5,
          left: -appearance.trailLength,
          width: appearance.trailLength,
          height: 2,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: -3,
          left: -3,
          width: 9,
          height: 9,
          borderRadius: 4.5,
          backgroundColor: appearance.color,
          opacity: 0.22,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: -1,
          left: -1,
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: appearance.color,
          opacity: 0.72,
        }}
      />
      <View
        style={{
          width: 3,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: "#ffffff",
        }}
      />
    </RNAnimated.View>
  );
}

export function NodesBackground({
  selectedPath,
  animationsEnabled,
  translateX,
  translateY,
  containerRef,
  onLayout,
  children,
}: NodesBackgroundProps) {
  const gameColorDark = GAMES_DATA[selectedPath].gameColorDark;
  const previousColorRef = useRef(gameColorDark);
  const overlayProgress = useSharedValue(1);
  const fromOverlayColor = useSharedValue(rgba(gameColorDark, 0.2));
  const toOverlayColor = useSharedValue(rgba(gameColorDark, 0.2));
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const starLayers = useMemo(() => {
    const stars = seededStars(140, 3);
    return [
      stars.slice(0, 45),
      stars.slice(45, 85),
      stars.slice(85, 117),
      stars.slice(117),
    ];
  }, []);

  useEffect(() => {
    const previousColor = previousColorRef.current;
    if (previousColor === gameColorDark) return;

    fromOverlayColor.value = rgba(previousColor, 0.6);
    toOverlayColor.value = rgba(gameColorDark, 0.6);
    previousColorRef.current = gameColorDark;
    cancelAnimation(overlayProgress);
    overlayProgress.value = 0;
    overlayProgress.value = withTiming(1, {
      duration: BACKGROUND_COLOR_TRANSITION_DURATION,
    });
  }, [gameColorDark, fromOverlayColor, overlayProgress, toOverlayColor]);

  const overlayStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      overlayProgress.value,
      [0, 1],
      [fromOverlayColor.value, toOverlayColor.value],
      "RGB",
    ),
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setViewport(event.nativeEvent.layout);
    onLayout(event);
  };

  return (
    <View
      ref={containerRef}
      onLayout={handleLayout}
      style={{ flex: 1, overflow: "hidden" }}
    >
      <ImageBackground
        source={require("../../../assets/images/starfield.jpg")}
        resizeMode="cover"
        // ImageBackground only sizes its inner image from an explicit
        // width/height; without them web renders the image at natural width.
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />
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
          overlayStyle,
        ]}
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
      <ShootingStar
        width={viewport.width}
        height={viewport.height}
        animationsEnabled={animationsEnabled}
      />
    </View>
  );
}
