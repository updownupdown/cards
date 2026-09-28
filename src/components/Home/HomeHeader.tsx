import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, layoutDims, rgba } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";

export function HomeHeaderBackground({
  showBackground,
}: {
  showBackground: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { spacing } = useResponsiveMetrics();
  const backgroundOpacity = useSharedValue(showBackground ? 1 : 0);
  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  useEffect(() => {
    backgroundOpacity.value = withTiming(showBackground ? 1 : 0, {
      duration: 400,
    });
  }, [backgroundOpacity, showBackground]);

  const headerHeight = insets.top + spacing(layoutDims.pagePadding);

  return (
    <Animated.View
      testID="home-header-background"
      // Runs on past the header by half its height, for a softer fade, and
      // never takes taps from the content beneath.
      style={[
        pointerEventsStyles.none,
        {
          position: Platform.OS === "web" ? "fixed" : "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight * 1.7,
          zIndex: 8,
        },
        backgroundStyle,
      ]}
    >
      <LinearGradient
        colors={[
          rgba(Colors.starfieldOverlay, 0.9),
          rgba(Colors.starfieldOverlay, 0),
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    // Don't stretch like other header buttons. Web needs longhands: flex:0
    // compiles to flex-basis 0% with shrink 1 there, collapsing the button to
    // its padding so the icons touch. Native (Yoga) needs flex:0 itself.
    ...Platform.select({
      web: { flexGrow: 0, flexShrink: 0, flexBasis: "auto" },
      default: { flex: 0 },
    }),
    backgroundColor: "transparent",
    boxShadow: "none",
    paddingHorizontal: 12,
  },
});
