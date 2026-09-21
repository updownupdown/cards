import { Colors, rgba } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  AppState,
  Easing as RNEasing,
  ImageBackground,
  Platform,
  View,
} from "react-native";

const STAR_COLORS = ["#ffffff", "#eef8ff", "#d9efff", "#b9ddff", "#91c7ff"];
const OVERLAY_COLOR = rgba(Colors.starfieldOverlay, 0.7);
const SHOOTING_STAR_OPACITY = 0.65;
const SHOOTING_STAR_DURATION_SCALE = 1.25;

type Props = {
  animationsEnabled: boolean;
  width: number;
  height: number;
};

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
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === "active",
  );
  const [resumeKey, setResumeKey] = useState(0);
  const [appearance, setAppearance] = useState({
    angle: 0,
    color: STAR_COLORS[0],
    trailLength: 210,
  });

  useEffect(() => {
    const onAppStateChange = (state: string) => {
      const isActive = state === "active";
      setIsAppActive(isActive);
      if (isActive) setResumeKey((current) => current + 1);
    };
    const subscription = AppState.addEventListener("change", onAppStateChange);

    if (Platform.OS !== "web") return () => subscription.remove();

    const restartAfterResume = () => {
      if (document.visibilityState === "visible") {
        setIsAppActive(true);
        setResumeKey((current) => current + 1);
      }
    };
    window.addEventListener("focus", restartAfterResume);
    window.addEventListener("pageshow", restartAfterResume);
    document.addEventListener("visibilitychange", restartAfterResume);

    return () => {
      subscription.remove();
      window.removeEventListener("focus", restartAfterResume);
      window.removeEventListener("pageshow", restartAfterResume);
      document.removeEventListener("visibilitychange", restartAfterResume);
    };
  }, []);

  useEffect(() => {
    if (!animationsEnabled || !isAppActive || width <= 0 || height <= 0) {
      opacity.setValue(0);
      return;
    }
    opacity.setValue(0);

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
          const fadeInDuration =
            (20 + Math.random() * 80) * SHOOTING_STAR_DURATION_SCALE;
          const holdDuration =
            (200 + Math.random() * 600) * SHOOTING_STAR_DURATION_SCALE;
          const fadeOutDuration =
            (100 + Math.random() * 300) * SHOOTING_STAR_DURATION_SCALE;
          const travelDuration =
            fadeInDuration + holdDuration + fadeOutDuration;

          setAppearance({
            angle,
            color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
            trailLength: 165 + Math.random() * 225,
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
                toValue: SHOOTING_STAR_OPACITY,
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
  }, [
    animationsEnabled,
    height,
    isAppActive,
    opacity,
    resumeKey,
    translateX,
    translateY,
    width,
  ]);

  return (
    <RNAnimated.View
      testID="home-shooting-star"
      style={{
        position: "absolute",
        pointerEvents: "none",
        top: 0,
        left: 0,
        width: 2,
        height: 2,
        opacity,
        transform: [
          { translateX },
          { translateY },
          { rotate: `${appearance.angle}rad` },
        ],
      }}
    >
      <LinearGradient
        colors={["transparent", rgba(appearance.color, 0.32), appearance.color]}
        locations={[0, 0.65, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          position: "absolute",
          top: 0.5,
          left: -appearance.trailLength,
          width: appearance.trailLength,
          height: 1,
        }}
      />
      <View
        style={{
          width: 2,
          height: 2,
          borderRadius: 1,
          backgroundColor: "#ffffff",
        }}
      />
    </RNAnimated.View>
  );
}

export function HomeStarfieldBackground({
  animationsEnabled,
  width,
  height,
}: Props) {
  const viewportRef = useRef({ width, height });
  if (Math.abs(viewportRef.current.width - width) > 1) {
    viewportRef.current = { width, height };
  } else if (height > viewportRef.current.height) {
    viewportRef.current.height = height;
  }
  const viewport = viewportRef.current;

  const isLandscape = viewport.width > viewport.height;
  const imageWidth = isLandscape ? viewport.height : viewport.width;
  const imageHeight = isLandscape ? viewport.width : viewport.height;

  return (
    <View
      testID="home-starfield-background"
      pointerEvents="none"
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <ImageBackground
        source={require("../../../assets/images/starfield.webp")}
        resizeMode="cover"
        style={{
          position: "absolute",
          left: (viewport.width - imageWidth) / 2,
          top: (viewport.height - imageHeight) / 2,
          width: imageWidth,
          height: imageHeight,
          transform: isLandscape ? [{ rotate: "90deg" }] : undefined,
        }}
      />
      <View
        testID="home-starfield-overlay"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: OVERLAY_COLOR,
        }}
      />
      <ShootingStar
        width={viewport.width}
        height={viewport.height}
        animationsEnabled={animationsEnabled}
      />
    </View>
  );
}
