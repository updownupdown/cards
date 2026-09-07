import SoloSuiteLogo from "@/assets/images/SoloSuiteLogo.svg";
import { Button } from "@/components/Button/Button";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba, layoutDims } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HomeHeaderProps = {
  onOpenSettings: () => void;
  onOpenStats: () => void;
  hideBackground: boolean;
};

export function HomeHeader({
  onOpenSettings,
  onOpenStats,
  hideBackground,
}: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { ui, spacing } = useResponsiveMetrics();
  const backgroundOpacity = useSharedValue(hideBackground ? 0 : 1);
  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  useEffect(() => {
    backgroundOpacity.value = withTiming(hideBackground ? 0 : 1, {
      duration: 300,
    });
  }, [backgroundOpacity, hideBackground]);

  return (
    <View
      style={{
        position: Platform.OS === "web" ? "fixed" : "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 8,
        pointerEvents: "box-none",
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          },
          backgroundStyle,
        ]}
      >
        <LinearGradient
          colors={[
            rgba(Colors.background, 1),
            rgba(Colors.background, 0.8),
            rgba(Colors.background, 0),
          ]}
          start={{ x: 0.5, y: 0.8 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View
        style={{
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          alignSelf: "center",
          paddingTop: insets.top + spacing(layoutDims.pagePadding * 0.5),
          paddingBottom: spacing(layoutDims.pagePadding * 0.5),
          pointerEvents: "box-none",
        }}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.spaceBetween,
            {
              pointerEvents: "box-none",
              height: spacing(layoutDims.menuBarHeight),
              paddingLeft: spacing(layoutDims.pagePadding),
              paddingRight: spacing(layoutDims.pagePadding * 0.5),
            },
          ]}
        >
          <SoloSuiteLogo
            width={140}
            height={32}
            style={{
              marginRight: "auto",
              filter: `drop-shadow(1px 2px 4px rgba(0, 0, 0, 0.16))`,
            }}
          />

          <View style={[flexStyles.rowCentered]}>
            <Button
              headerButton
              size="xl"
              iconName="chart"
              onPress={onOpenStats}
              style={[styles.headerBtn]}
              iconColor={rgba(Colors.white, 0.7)}
            />
            <Button
              headerButton
              size="xl"
              iconName="menu"
              onPress={onOpenSettings}
              style={[styles.headerBtn]}
              iconColor={rgba(Colors.white, 0.7)}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    backgroundColor: "unset",
    boxShadow: "unset",
    paddingHorizontal: 12,
  },
});
