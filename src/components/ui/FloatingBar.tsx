import { skyIslandProps } from "@/components/common/TapShootingStars";
import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { layoutDims, rgba, theme } from "@/styles/styles";
import type { ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
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

/** How far up the screen a bar stacked over the tab bar has its foot. */
export function useStackedBarBottom() {
  const { spacing } = useResponsiveMetrics();
  return useTabBarTop() + spacing(STACK_GAP);
}

/** The room a bar stacked over the tab bar takes, the tab bar included. */
export function useStackedBarHeight() {
  const { spacing } = useResponsiveMetrics();
  return useTabBarTop() + spacing(STACKED_HEIGHT + STACK_GAP * 2);
}

/**
 * How opaque the floating bars, buttons and panels are over what's behind
 * them. They were frosted glass once; the blur made Android crawl.
 */
export const SURFACE_OPACITY = 0.92;

/** The floating surfaces' fill and edge, shared with the game header. */
export const glassFill = () => rgba(theme.surface, SURFACE_OPACITY);
export const glassEdge = () => rgba(theme.ink, 0.16);

/**
 * The edge and shadow of the pill every floating bar and panel shares with
 * the tab bar and the search field: a thin, visible edge. The fill is
 * `glassFill()`.
 */
export function useGlassStyle(radius = 22): ViewStyle {
  const { spacing } = useResponsiveMetrics();
  return {
    borderRadius: spacing(radius),
    borderWidth: 1,
    borderColor: glassEdge(),
    ...homeSurfaceShadow(spacing, { translucent: true }),
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
  const radius = spacing(
    (stacked ? STACKED_HEIGHT : layoutDims.tabBarHeight) / 2,
  );
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
        // The bar keeps its touches: no shooting stars from a sky under it.
        {...skyIslandProps}
        style={[
          glass,
          {
            backgroundColor: glassFill(),
            width: "100%",
            maxWidth: ui.contentMaxWidth - side * 2,
            height: spacing(stacked ? STACKED_HEIGHT : layoutDims.tabBarHeight),
            borderRadius: radius,
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

/**
 * The stepping bar the Gallery's readers share: a neutral action on the left
 * (back, or a picker) and the previous and next chevrons together on the
 * right, in the accent.
 */
export function StepperBar({
  placement,
  action,
  onPrevious,
  onNext,
  previousLabel,
  nextLabel,
  disabled = false,
  swapColours = false,
}: {
  placement: "tabBar" | "aboveTabBar";
  action: {
    iconName: IconName;
    label: string;
    /** What a screen reader says, when it isn't the label. */
    accessibilityLabel?: string;
    onPress: () => void;
  };
  onPrevious: () => void;
  onNext: () => void;
  previousLabel: string;
  nextLabel: string;
  disabled?: boolean;
  /** The action in the accent and the chevrons plain, rather than the reverse. */
  swapColours?: boolean;
}) {
  const { spacing } = useResponsiveMetrics();
  const chevron = (
    iconName: IconName,
    accessibilityLabel: string,
    onPress: () => void,
  ) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        width: spacing(52),
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.3 : 1,
        outline: "none",
      }}
    >
      <Icon
        name={iconName}
        size={spacing(24)}
        color={swapColours ? theme.ink : theme.accent}
      />
    </Pressable>
  );
  return (
    <FloatingBar placement={placement}>
      <BarButton
        iconName={action.iconName}
        label={action.label}
        accessibilityLabel={action.accessibilityLabel}
        align="left"
        accent={swapColours}
        onPress={action.onPress}
      />
      <View
        style={{
          flexDirection: "row",
          height: "100%",
          paddingRight: spacing(4),
        }}
      >
        {chevron("chevron-left", previousLabel, onPrevious)}
        {chevron("chevron-right", nextLabel, onNext)}
      </View>
    </FloatingBar>
  );
}
