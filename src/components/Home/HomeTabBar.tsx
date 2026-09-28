import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { useGlassStyle } from "@/components/ui/FloatingBar";
import {
  Colors,
  rgba,
  layoutDims,
  theme,
  transitionStyles,
} from "@/styles/styles";
import { Text } from "@/components/common/Text";
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

export type HomeTabKey = "home" | "collect" | "search" | "campaign";

export const HOME_TABS: { key: HomeTabKey; icon: IconName }[] = [
  { key: "home", icon: "home" },
  { key: "campaign", icon: "milky-way" },
  { key: "collect", icon: "gallery" },
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
  const glass = useGlassStyle();
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
              height: spacing(layoutDims.tabBarHeight),
              ...glass,
            },
          ]}
        >
          {HOME_TABS.map((tab, index) => {
            const isActive = index === activeIndex;
            const label = t(`tabs.${tab.key}`);

            return (
              <Pressable
                key={tab.key}
                onPress={() => onSelectTab(index)}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: isActive }}
                style={{
                  flex: 1,
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing(3),
                  outline: "none",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    width: spacing(26),
                    height: 2,
                    borderRadius: 2,
                    backgroundColor: theme.accent,
                    opacity: isActive ? 1 : 0,
                    ...transitionStyles.all02sec,
                  }}
                />
                <Icon
                  name={tab.icon}
                  size={spacing(24)}
                  color={isActive ? theme.accent : theme.dim}
                  style={{ ...transitionStyles.all02sec }}
                />
                <Text
                  size="xxs"
                  weight={400}
                  color={isActive ? theme.ink : theme.dim}
                  style={{ fontSize: spacing(11), lineHeight: spacing(13) }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </RNAnimated.View>
  );
}
