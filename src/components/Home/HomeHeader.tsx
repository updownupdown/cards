import SolitariusLogo from "@/assets/images/SolitariusLogo.svg";
import { Button } from "@/components/Button/Button";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, layoutDims, rgba, webDropShadow } from "@/styles/styles";
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

type HomeHeaderProps = {
  onOpenSettings: () => void;
  onOpenStats: () => void;
};

export function HomeHeader({ onOpenSettings, onOpenStats }: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { ui, spacing } = useResponsiveMetrics();

  return (
    <View
      style={[
        pointerEventsStyles.boxNone,
        {
          position: Platform.OS === "web" ? "fixed" : "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 8,
        },
      ]}
    >
      <View
        style={[
          pointerEventsStyles.boxNone,
          {
            width: "100%",
            maxWidth: ui.contentMaxWidth,
            alignSelf: "center",
            // Clear the status bar, and in landscape any display cutout at the
            // sides; the background image still shows behind all of them.
            paddingTop: insets.top + spacing(layoutDims.pagePadding * 0.5),
            paddingBottom: spacing(layoutDims.pagePadding * 0.5),
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <View
          style={[
            pointerEventsStyles.boxNone,
            flexStyles.rowCentered,
            flexStyles.spaceBetween,
            {
              height: spacing(layoutDims.menuBarHeight),
              paddingLeft: spacing(layoutDims.pagePadding),
              paddingRight: spacing(layoutDims.pagePadding * 0.5),
            },
          ]}
        >
          <SolitariusLogo
            width={140}
            height={32}
            style={{
              marginRight: "auto",
              ...webDropShadow("1px 2px 4px rgba(0, 0, 0, 0.16)"),
            }}
          />

          <View style={[flexStyles.rowCentered]}>
            <Button
              headerButton
              size="xl"
              iconName="chart"
              onPress={onOpenStats}
              style={[styles.headerBtn]}
              iconColor={Colors.white}
            />
            <Button
              headerButton
              size="xl"
              iconName="settings"
              onPress={onOpenSettings}
              style={[styles.headerBtn]}
              iconColor={Colors.white}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * The fade behind the header. It is drawn inside the tab content, not in the
 * header, so controls within the content (like the card size toggle) can sit
 * above it.
 */
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

  const headerHeight =
    insets.top +
    spacing(layoutDims.pagePadding) +
    spacing(layoutDims.menuBarHeight);

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
