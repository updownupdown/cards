import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { layoutDims, rgba, theme } from "@/styles/styles";
import type { ReactNode } from "react";
import { Platform, Pressable, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** The gap between a bar and the tab bar under it. */
const STACK_GAP = 8;
/** A bar stacked over the tab bar is a little lower than the tab bar. */
const STACKED_HEIGHT = 56;

/** The inset from the screen's sides to the tab bar's edges. */
export function useBarSideInset() {
  const { spacing } = useResponsiveMetrics();
  return spacing(layoutDims.pagePadding * 0.5);
}

/** How far the tab bar reaches up from the bottom of the screen. */
export function useTabBarTop() {
  const { spacing } = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  return (
    insets.bottom +
    spacing(layoutDims.tabBarHeight + layoutDims.pagePadding * 0.5)
  );
}

/** The room a bar stacked over the tab bar takes, the tab bar included. */
export function useStackedBarHeight() {
  const { spacing } = useResponsiveMetrics();
  return useTabBarTop() + spacing(STACKED_HEIGHT + STACK_GAP * 2);
}

/** The glassy pill every floating bar and panel shares with the tab bar. */
export function useGlassStyle(radius = 22): ViewStyle {
  const { spacing } = useResponsiveMetrics();
  return {
    borderRadius: spacing(radius),
    backgroundColor: rgba(theme.surface, 0.92),
    borderWidth: 1,
    borderColor: rgba(theme.ink, 0.08),
    ...homeSurfaceShadow(spacing, { translucent: true }),
    ...(Platform.OS === "web"
      ? ({ backdropFilter: "blur(14px)" } as ViewStyle)
      : null),
  };
}

/**
 * A bar floating at the bottom of the screen in the tab bar's look: in the
 * tab bar's place (a full-screen viewer, which hides the tabs), or stacked
 * just above it.
 */
export function FloatingBar({
  placement,
  children,
}: {
  placement: "tabBar" | "aboveTabBar";
  children: ReactNode;
}) {
  const { spacing, ui } = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  const side = useBarSideInset();
  const tabBarTop = useTabBarTop();
  const glass = useGlassStyle();
  const stacked = placement === "aboveTabBar";
  return (
    <View
      style={[
        pointerEventsStyles.boxNone,
        {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: stacked ? tabBarTop + spacing(STACK_GAP) : 0,
          alignItems: "center",
          paddingLeft: insets.left + side,
          paddingRight: insets.right + side,
          paddingBottom: stacked ? 0 : insets.bottom + side,
        },
      ]}
    >
      <View
        style={[
          glass,
          {
            width: "100%",
            maxWidth: ui.contentMaxWidth - side * 2,
            height: spacing(stacked ? STACKED_HEIGHT : layoutDims.tabBarHeight),
            flexDirection: "row",
            alignItems: "center",
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * A button in a floating bar: an icon, with a label beside it. Sides take an
 * equal share of the bar; the middle one sizes to its content.
 */
export function BarButton({
  iconName,
  label,
  accessibilityLabel,
  onPress,
  align = "center",
  accent = false,
  disabled = false,
}: {
  iconName?: IconName;
  label?: string;
  accessibilityLabel?: string;
  onPress: () => void;
  /** Left and right buttons put their icon at the bar's edge. */
  align?: "left" | "center" | "right";
  accent?: boolean;
  disabled?: boolean;
}) {
  const { spacing } = useResponsiveMetrics();
  const color = accent ? theme.accent : theme.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        flex: align === "center" ? undefined : 1,
        height: "100%",
        flexDirection: align === "right" ? "row-reverse" : "row",
        alignItems: "center",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: spacing(6),
        paddingHorizontal: spacing(14),
        opacity: disabled ? 0.3 : 1,
        outline: "none",
      }}
    >
      {iconName && <Icon name={iconName} size={spacing(20)} color={color} />}
      {label ? (
        <Text
          size="sm"
          weight={500}
          color={color}
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
