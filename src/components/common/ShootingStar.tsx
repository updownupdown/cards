import { rgba } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  AppState,
  Easing as RNEasing,
  Platform,
  View,
} from "react-native";

const DEFAULT_STAR_COLORS = [
  "#ffffff",
  "#eef8ff",
  "#d9efff",
  "#b9ddff",
  "#91c7ff",
];

type Props = {
  width: number;
  height: number;
  animationsEnabled: boolean;
  /** Candidate head colours, picked at random for each streak. */
  colors?: string[];
  /** Peak opacity a streak fades in to. */
  peakOpacity?: number;
  /** Multiplies every timing so streaks can be sped up or slowed down. */
  durationScale?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  testID?: string;
};

/**
 * A single streak that repeatedly re-schedules itself at a random point on
 * the given surface. Pauses while the app is backgrounded/hidden so it isn't
 * silently animating (and burning battery) off-screen, then resumes fresh.
 */
export function ShootingStar({
  width,
  height,
  animationsEnabled,
  colors = DEFAULT_STAR_COLORS,
  peakOpacity = 0.65,
  durationScale = 1.25,
  minIntervalMs = 5000,
  maxIntervalMs = 15000,
  testID,
}: Props) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === "active",
  );
  const [resumeKey, setResumeKey] = useState(0);
  const [appearance, setAppearance] = useState({
    angle: 0,
    color: colors[0],
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
          const fadeInDuration = (20 + Math.random() * 80) * durationScale;
          const holdDuration = (200 + Math.random() * 600) * durationScale;
          const fadeOutDuration = (100 + Math.random() * 300) * durationScale;
          const travelDuration =
            fadeInDuration + holdDuration + fadeOutDuration;

          setAppearance({
            angle,
            color: colors[Math.floor(Math.random() * colors.length)],
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
                toValue: peakOpacity,
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
        minIntervalMs + Math.random() * (maxIntervalMs - minIntervalMs),
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
    colors,
    durationScale,
    height,
    isAppActive,
    maxIntervalMs,
    minIntervalMs,
    opacity,
    peakOpacity,
    resumeKey,
    translateX,
    translateY,
    width,
  ]);

  return (
    <RNAnimated.View
      testID={testID}
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
