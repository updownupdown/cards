import { FIELD_RADIUS } from "@/data/campaign-map";
import { theme } from "@/styles/styles";
import { haptics } from "@/utils/haptics";
import { Image } from "expo-image";
import { memo, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const FORCE_FIELD = require("@/assets/images/force-field.webp");

/**
 * How far the picture reaches past the ball, for its halo: BALL in
 * scripts/generate-force-field.mjs.
 */
const FIELD_EXTENT = 1.08;
/** One swell or fade of the rim's shimmer, as slow as the Tao's breathing. */
const SHIMMER_MS = 4000;
/** The field dissolving, once, when the full Odyssey opens. */
const DISSOLVE_MS = 1400;

/**
 * The force field round the centre of the Odyssey, in the map's world (whose
 * side is `worldSize`, centred on Klondike), under the links and game dots:
 * a glass ball seen from above, in the theme's accent, its rim shimmering
 * slowly. When it comes down (the full Odyssey unlocked) it swells and fades
 * away, with a haptic, and is gone.
 */
export const ForceField = memo(function ForceField({
  up,
  worldSize,
  animated,
}: {
  up: boolean;
  worldSize: number;
  /** "Show animations": off, the rim holds still and the field just goes. */
  animated: boolean;
}) {
  const radius = (FIELD_RADIUS * worldSize) / 2;
  const size = radius * 2 * FIELD_EXTENT;
  const [shown, setShown] = useState(up);
  const wasUp = useRef(up);
  const fade = useSharedValue(up ? 1 : 0);
  const swell = useSharedValue(1);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    const before = wasUp.current;
    wasUp.current = up;
    if (up) {
      cancelAnimation(fade);
      cancelAnimation(swell);
      fade.value = 1;
      swell.value = 1;
      setShown(true);
      return;
    }
    if (!before) return;
    haptics.win();
    if (!animated) {
      setShown(false);
      return;
    }
    const done = () => setShown(false);
    swell.value = withTiming(1.12, {
      duration: DISSOLVE_MS,
      easing: Easing.out(Easing.cubic),
    });
    fade.value = withTiming(
      0,
      { duration: DISSOLVE_MS, easing: Easing.in(Easing.quad) },
      (finished) => {
        if (finished) scheduleOnRN(done);
      },
    );
  }, [animated, fade, swell, up]);

  useEffect(() => {
    if (!animated || !shown) return;
    shimmer.value = withRepeat(
      withTiming(1, { duration: SHIMMER_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(shimmer);
      shimmer.value = 0;
    };
  }, [animated, shimmer, shown]);

  const fieldStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: swell.value }],
  }));
  const rimStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + shimmer.value * 0.3,
  }));

  if (!shown) return null;
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          pointerEvents: "none",
          left: worldSize / 2 - size / 2,
          top: worldSize / 2 - size / 2,
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        },
        fieldStyle,
      ]}
    >
      {/* The wrapper carries pointerEvents, which expo-image's style does
          not accept (see GalaxyArms). */}
      <View style={{ position: "absolute", width: size, height: size }}>
        <Image
          source={FORCE_FIELD}
          cachePolicy="memory"
          contentFit="fill"
          tintColor={theme.accent}
          style={{ width: "100%", height: "100%" }}
        />
      </View>
      <Animated.View
        style={[
          {
            width: radius * 2 + 3,
            height: radius * 2 + 3,
            borderRadius: radius + 1.5,
            borderWidth: 3,
            borderColor: theme.accent,
          },
          rimStyle,
        ]}
      />
    </Animated.View>
  );
});
