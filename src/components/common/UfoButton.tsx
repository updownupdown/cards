import { useShowAnimations } from "@/hooks/useShowAnimations";
import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { UfoColors } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/** One full pass of the inks across the button. */
const DRIFT_MS = 6000;
/** One run of the three inks spans this many button widths. */
const SPAN_WIDTHS = 2;

/**
 * Two runs of the UFO's three inks (UFO_INKS), green to purple to blue and
 * back to green,
 * end to end: sliding one run's length along, the strip looks the same, so
 * the drift loops without a seam.
 */
const STRIP_INKS: [string, string, ...string[]] = [
  UfoColors.green,
  UfoColors.purple,
  UfoColors.blue,
  UfoColors.green,
  UfoColors.purple,
  UfoColors.blue,
  UfoColors.green,
];

/**
 * An ActionButton that belongs to the UFO (Mercy Skip): black on the UFO's
 * three inks, which drift slowly across it.
 */
export function UfoButton({
  label,
  iconName = "ufo",
  onPress,
  style,
}: {
  label: string;
  iconName?: IconName;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useResponsiveMetrics();
  const height = spacing(46);
  const [width, setWidth] = useState(0);
  const drift = useRef(new Animated.Value(0)).current;
  const animated = useShowAnimations();

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: DRIFT_MS,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, drift]);

  const span = width * SPAN_WIDTHS;
  const ink = UfoColors.black;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        {
          height,
          paddingHorizontal: spacing(20),
          borderRadius: height / 2,
          overflow: "hidden",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing(8),
          // Shows until the button has been measured.
          backgroundColor: UfoColors.green,
          outline: "none",
        },
        style,
      ]}
    >
      {width > 0 && (
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: span * 2,
            pointerEvents: "none",
            transform: [
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -span],
                }),
              },
            ],
          }}
        >
          {Platform.OS === "web" ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundImage: `linear-gradient(to right, ${STRIP_INKS.join(", ")})`,
                },
              ]}
            />
          ) : (
            <LinearGradient
              colors={STRIP_INKS}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          )}
        </Animated.View>
      )}
      <Icon name={iconName} size={spacing(16)} color={ink} />
      <Text size="md" weight={600} color={ink} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
