import { rgba } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  AppState,
  Easing as RNEasing,
  Platform,
} from "react-native";

/** The longest a trail gets, as a share of the path the head travels. */
const MAX_TRAIL_SHARE = 0.8;

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
  /** The streak's opacity at its brightest, mid-flight. */
  peakOpacity?: number;
  /** Multiplies every timing so streaks can be sped up or slowed down. */
  durationScale?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  /** The head's top speed in px/s; a faster streak travels a shorter path. */
  maxSpeed?: number;
  /** Draw the bright head; without it the streak is a single fine line. */
  head?: boolean;
  testID?: string;
};

/**
 * A single streak that repeatedly re-schedules itself at a random point on
 * the given surface. It starts as a point, draws out into a line as its head
 * runs ahead, then closes up from the tail to a point where the head stopped. Pauses while the app is backgrounded/hidden so it isn't
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
  maxSpeed = Infinity,
  head = true,
  testID,
}: Props) {
  // 0 as the streak is born, 1 once it has burnt out.
  const progress = useRef(new RNAnimated.Value(0)).current;
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === "active",
  );
  const [resumeKey, setResumeKey] = useState(0);
  const [appearance, setAppearance] = useState({
    x: 0,
    y: 0,
    angle: 0,
    color: colors[0],
    pathLength: 1,
    headUntil: 0.6,
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
    progress.setValue(0);
    if (!animationsEnabled || !isAppActive || width <= 0 || height <= 0) {
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
          const duration = (320 + Math.random() * 980) * durationScale;
          // The head covers the path in about the first 60% of the time.
          const pathLength = Math.min(
            Math.hypot(endX - startX, endY - startY),
            (maxSpeed * duration * 0.6) / 1000,
          );
          // The trail is at most this long, and never most of the path: the
          // streak has to be seen growing out of a point and shrinking to one.
          const trailLength = Math.min(
            165 + Math.random() * 225,
            pathLength * MAX_TRAIL_SHARE,
          );

          setAppearance({
            x: startX,
            y: startY,
            angle,
            color: colors[Math.floor(Math.random() * colors.length)],
            pathLength,
            headUntil: pathLength / (pathLength + trailLength),
          });
          progress.setValue(0);

          animation = RNAnimated.timing(progress, {
            toValue: 1,
            duration,
            easing: RNEasing.linear,
            useNativeDriver: Platform.OS !== "web",
          });
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
    maxSpeed,
    minIntervalMs,
    progress,
    resumeKey,
    width,
  ]);

  // The head runs the path and stops; the tail sets off after it and catches
  // up. Between them is the streak: a point, a growing line, a shrinking one.
  const { pathLength, headUntil } = appearance;
  const tailFrom = 1 - headUntil;
  const headTravel = progress.interpolate({
    inputRange: [0, headUntil, 1],
    outputRange: [0, pathLength, pathLength],
  });
  const tailTravel = progress.interpolate({
    inputRange: [0, tailFrom, 1],
    outputRange: [0, 0, pathLength],
  });
  const longest = tailFrom / headUntil;
  const streakScale = progress.interpolate({
    inputRange: [0, tailFrom, headUntil, 1],
    outputRange: [0.0001, longest, longest, 0.0001],
  });
  // It brightens as it burns and dims as it dies, but stays visible at both
  // ends so the line is seen drawing out and closing up.
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.5, 0.9, 1],
    outputRange: [0, peakOpacity * 0.45, peakOpacity, peakOpacity * 0.45, 0],
  });

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
          { translateX: appearance.x },
          { translateY: appearance.y },
          { rotate: `${appearance.angle}rad` },
        ],
      }}
    >
      <RNAnimated.View
        style={{
          position: "absolute",
          top: 0.5,
          left: 1,
          width: pathLength,
          height: 1,
          transformOrigin: "0% 50%",
          transform: [{ translateX: tailTravel }, { scaleX: streakScale }],
        }}
      >
        <LinearGradient
          colors={[
            "transparent",
            rgba(appearance.color, 0.32),
            appearance.color,
          ]}
          locations={[0, 0.65, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: "100%", height: "100%" }}
        />
      </RNAnimated.View>
      {head && (
        <RNAnimated.View
          style={{
            width: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: "#ffffff",
            transform: [{ translateX: headTravel }],
          }}
        />
      )}
    </RNAnimated.View>
  );
}
