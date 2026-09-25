import { useKeyboardLift } from "@/hooks/useKeyboardLift";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { Colors, rgba, layoutDims, transitionStyles } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import {
  Animated as RNAnimated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";

export type HomeTabKey = "home" | "collect" | "search" | "nodes";

export const HOME_TABS: { key: HomeTabKey; icon: IconName }[] = [
  { key: "home", icon: "home" },
  { key: "nodes", icon: "milky-way" },
  { key: "collect", icon: "trophy" },
  { key: "search", icon: "search" },
];

type HomeTabBarProps = {
  activeIndex: number;
  onSelectTab: (index: number) => void;
  onHeightChange?: (height: number) => void;
  showBackground: boolean;
};

export function HomeTabBar({
  activeIndex,
  onSelectTab,
  onHeightChange,
  showBackground,
}: HomeTabBarProps) {
  const insets = useSafeAreaInsets();
  const { spacing, ui } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const keyboardLift = useKeyboardLift();
  const backgroundOpacity = useSharedValue(showBackground ? 1 : 0);
  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  useEffect(() => {
    backgroundOpacity.value = withTiming(showBackground ? 1 : 0, {
      duration: 350,
    });
  }, [backgroundOpacity, showBackground]);

  const onLayout = (event: LayoutChangeEvent) => {
    onHeightChange?.(event.nativeEvent.layout.height);
  };

  return (
    <RNAnimated.View
      onLayout={onLayout}
      style={[
        pointerEventsStyles.boxNone,
        {
          position: Platform.OS === "web" ? "fixed" : "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 8,
          // Rides up above the keyboard with the search box, rather than
          // being covered by it.
          transform: [{ translateY: keyboardLift }],
        },
      ]}
    >
      {/* The header's fade, mirrored: content scrolling past the floating pill
          dissolves into the same colour at both ends of the screen. On a
          phone it runs on under the system navigation buttons, deepening but
          never solid, so the starfield still shows faintly behind them. */}
      <Animated.View
        testID="home-tab-bar-background"
        style={[
          StyleSheet.absoluteFill,
          { pointerEvents: "none" },
          backgroundStyle,
        ]}
      >
        <LinearGradient
          colors={[
            rgba(Colors.starfieldOverlay, 0),
            rgba(Colors.starfieldOverlay, insets.bottom > 0 ? 0.6 : 1),
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, { bottom: insets.bottom }]}
        />
        <LinearGradient
          colors={[
            rgba(Colors.starfieldOverlay, 0.6),
            rgba(Colors.starfieldOverlay, 0.8),
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: insets.bottom,
          }}
        />
      </Animated.View>

      <View
        style={{
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          alignSelf: "center",
          padding: spacing(layoutDims.pagePadding * 0.5),
          // Clear the system bars on every edge: the bottom one on Android (or
          // the iOS home indicator), and in landscape a display cutout at the
          // sides.
          paddingBottom: insets.bottom + spacing(layoutDims.pagePadding * 0.5),
          paddingLeft: insets.left + spacing(layoutDims.pagePadding * 0.5),
          paddingRight: insets.right + spacing(layoutDims.pagePadding * 0.5),
        }}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              width: "100%",
              padding: spacing(layoutDims.tabBarPadding),
              height: spacing(layoutDims.tabBarHeight),
              borderRadius: spacing(layoutDims.tabBarHeight / 2),
              backgroundColor: rgba(Colors.K950, 0.9),
              ...homeSurfaceShadow(spacing),
            },
          ]}
        >
          {HOME_TABS.map((tab, index) => {
            const isActive = index === activeIndex;

            return (
              <Pressable
                key={tab.key}
                onPress={() => onSelectTab(index)}
                accessibilityRole="button"
                accessibilityLabel={t(`tabs.${tab.key}`)}
                style={[
                  flexStyles.rowCentered,
                  {
                    ...transitionStyles.all02sec,
                    flex: 1,
                    height: "100%",
                    paddingVertical: spacing(12),
                    borderRadius: spacing(
                      layoutDims.tabBarHeight / 2 - layoutDims.tabBarPadding,
                    ),
                    backgroundColor: isActive ? Colors.suitsRed : "transparent",
                    outline: "none",
                  },
                ]}
              >
                <Icon
                  name={tab.icon}
                  size={spacing(28)}
                  color={isActive ? Colors.white : Colors.K500}
                  style={{ ...transitionStyles.all02sec }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </RNAnimated.View>
  );
}
