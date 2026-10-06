import { NeonFrame } from "@/components/common/NeonFrame";
import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { UfoColors } from "@/styles/styles";
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";

const useNativeDriver = Platform.OS !== "web";

/**
 * The UFO in a note: it hovers, wobbling, then now and then zips off one side
 * of its window and slips back in from the other.
 */
function RestlessUfo({ size }: { size: number }) {
  const hover = useRef(new Animated.Value(0)).current;
  const zip = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const wobble = Animated.loop(
      Animated.sequence([
        Animated.timing(hover, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
        Animated.timing(hover, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
      ]),
    );
    // 0 at rest; out to 1 (gone off the right), then from -1 back to 0.
    const zipping = Animated.loop(
      Animated.sequence([
        Animated.delay(3600),
        Animated.timing(zip, {
          toValue: 1,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver,
        }),
        Animated.timing(zip, { toValue: -1, duration: 0, useNativeDriver }),
        Animated.delay(250),
        Animated.timing(zip, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver,
        }),
      ]),
    );
    wobble.start();
    zipping.start();
    return () => {
      wobble.stop();
      zipping.stop();
    };
  }, [hover, zip]);

  const frame = size * 1.5;
  return (
    <View
      style={{
        width: frame,
        height: frame,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          transform: [
            {
              translateX: zip.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-frame, 0, frame],
              }),
            },
            {
              translateY: hover.interpolate({
                inputRange: [0, 1],
                outputRange: [-size * 0.08, size * 0.08],
              }),
            },
            {
              rotate: hover.interpolate({
                inputRange: [0, 1],
                outputRange: ["-9deg", "9deg"],
              }),
            },
          ],
        }}
      >
        <Icon name="ufo" size={size} color={UfoColors.green} />
      </Animated.View>
    </View>
  );
}

/** A short line from the UFO, in its glowing frame (e.g. "it helped"). */
export function UfoNote({ text }: { text: string }) {
  const { spacing } = useResponsiveMetrics();
  return (
    <NeonFrame
      radius={spacing(16)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing(10),
        paddingVertical: spacing(10),
        paddingLeft: spacing(10),
        paddingRight: spacing(18),
      }}
    >
      <RestlessUfo size={spacing(26)} />
      <Text
        size="sm"
        weight={500}
        color={UfoColors.green}
        lineHeight={1.3}
        style={{ flex: 1 }}
      >
        {text}
      </Text>
    </NeonFrame>
  );
}
