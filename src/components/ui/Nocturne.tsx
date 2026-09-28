/**
 * The building blocks of the app's look (the "Nocturne" style): one accent
 * colour from the theme, quiet surfaces, a kicker over each section, pills
 * for filters, thin meters for ratings and progress, and round icon buttons.
 * Colours come from `theme` at render time, so they follow the colour theme.
 */
import { Text, type TextProps } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { rgba, theme, transitionStyles } from "@/styles/styles";
import type { ReactNode } from "react";
import {
  Platform,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/** A hairline in the theme's ink. */
export const hairline = () => rgba(theme.ink, 0.08);

/** The panel look: a surface with a hairline edge. */
export function useSurfaceStyle(radius = 18): ViewStyle {
  const { spacing } = useResponsiveMetrics();
  return {
    backgroundColor: theme.surface,
    borderRadius: spacing(radius),
    borderWidth: 1,
    borderColor: hairline(),
  };
}

/** A small uppercase label over a section, in the accent. */
export function Kicker({
  children,
  color = theme.accent,
  style,
  ...props
}: TextProps & { children: ReactNode }) {
  const { spacing } = useResponsiveMetrics();
  return (
    <Text
      size="xxs"
      weight={500}
      color={color}
      textTransform="uppercase"
      style={[{ letterSpacing: spacing(2) }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

/** A page's title: Home, Odyssey, Gallery, Search. */
export function PageTitle({ children }: { children: ReactNode }) {
  const { font } = useResponsiveMetrics();
  return (
    <Text
      weight={500}
      style={{
        fontSize: font(32),
        lineHeight: font(36),
        letterSpacing: -0.5,
      }}
    >
      {children}
    </Text>
  );
}

/** A section heading inside a page, with an optional action on the right. */
export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  const { spacing } = useResponsiveMetrics();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing(12),
      }}
    >
      <Kicker>{children}</Kicker>
      {action}
    </View>
  );
}

/** A thin rating or progress meter. */
export function Meter({
  value,
  color = theme.accent,
  style,
}: {
  /** 0 to 1. */
  value: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useResponsiveMetrics();
  const height = Math.max(2, spacing(3));
  return (
    <View
      style={[
        {
          height,
          borderRadius: height,
          backgroundColor: rgba(theme.ink, 0.1),
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View
        style={{
          height: "100%",
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          backgroundColor: color,
          borderRadius: height,
        }}
      />
    </View>
  );
}

/**
 * A progress strip of small segments, one per item (up to `max`), filled in
 * the accent: collected works, completed rooms.
 */
export function SegmentBar({
  done,
  total,
  max = 40,
  style,
}: {
  done: number;
  total: number;
  max?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useResponsiveMetrics();
  const count = Math.max(1, Math.min(total, max));
  const lit = total > 0 ? Math.round((done / total) * count) : 0;
  const height = Math.max(2, spacing(3));
  return (
    <View style={[{ flexDirection: "row", gap: 2 }, style]}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height,
            borderRadius: height,
            backgroundColor: index < lit ? theme.accent : rgba(theme.ink, 0.1),
          }}
        />
      ))}
    </View>
  );
}

/** Three labelled meters: complexity, difficulty, luck. */
export function RatingMeters({
  rating,
  labels,
}: {
  rating: { complexity: number; difficulty: number; luck: number };
  labels: { complexity: string; difficulty: string; luck: string };
}) {
  const { spacing } = useResponsiveMetrics();
  const items = [
    [labels.complexity, rating.complexity],
    [labels.difficulty, rating.difficulty],
    [labels.luck, rating.luck],
  ] as const;
  return (
    <View style={{ flexDirection: "row", gap: spacing(14) }}>
      {items.map(([label, value]) => (
        <View key={label} style={{ flex: 1, gap: spacing(6) }}>
          <Text
            size="xxs"
            weight={400}
            color={theme.dim}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Meter value={value / 100} />
        </View>
      ))}
    </View>
  );
}

/** A filter pill; pressed, it takes a tint of the accent. */
export function Pill({
  label,
  selected,
  onPress,
  iconName,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  iconName?: IconName;
}) {
  const { spacing } = useResponsiveMetrics();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        ...transitionStyles.limited02sec,
        height: spacing(34),
        paddingHorizontal: spacing(14),
        borderRadius: spacing(17),
        flexDirection: "row",
        alignItems: "center",
        gap: spacing(6),
        backgroundColor: selected
          ? rgba(theme.accent, 0.14)
          : rgba(theme.ink, 0.05),
        borderWidth: 1,
        borderColor: selected ? rgba(theme.accent, 0.45) : "transparent",
        outline: "none",
      }}
    >
      {iconName && (
        <Icon
          name={iconName}
          size={spacing(15)}
          color={selected ? theme.accent : theme.dim}
        />
      )}
      <Text
        size="xs"
        weight={400}
        color={selected ? theme.accent : theme.dim}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A round icon button, optionally with a small label underneath (the game
 * header's buttons).
 */
export function RoundButton({
  iconName,
  onPress,
  label,
  accessibilityLabel,
  size = 40,
  glass = false,
  active = false,
  disabled = false,
  color,
  style,
}: {
  iconName: IconName;
  onPress: () => void;
  label?: string;
  accessibilityLabel?: string;
  size?: number;
  glass?: boolean;
  active?: boolean;
  disabled?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useResponsiveMetrics();
  const diameter = spacing(size);
  const iconColor = color ?? (active ? theme.accent : theme.ink);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        {
          alignItems: "center",
          gap: spacing(3),
          opacity: disabled ? 0.35 : 1,
          outline: "none",
          ...transitionStyles.limited02sec,
        },
        style,
      ]}
    >
      <View
        style={{
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: glass
            ? rgba(theme.surface, 0.85)
            : rgba(theme.ink, 0.07),
          borderWidth: glass ? 1 : 0,
          borderColor: hairline(),
          ...(glass && Platform.OS === "web"
            ? ({ backdropFilter: "blur(10px)" } as ViewStyle)
            : null),
        }}
      >
        <Icon name={iconName} size={Math.round(diameter * 0.48)} color={iconColor} />
      </View>
      {label ? (
        <Text
          size="xxs"
          weight={400}
          color={active ? theme.accent : theme.dim}
          numberOfLines={1}
          style={{ fontSize: spacing(10), lineHeight: spacing(12) }}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** The accent-filled button, and its quiet sibling. */
export function ActionButton({
  label,
  onPress,
  iconName,
  secondary = false,
  small = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  iconName?: IconName;
  secondary?: boolean;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useResponsiveMetrics();
  const height = spacing(small ? 38 : 46);
  const ink = secondary ? theme.ink : theme.accentInk;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        {
          ...transitionStyles.limited02sec,
          height,
          paddingHorizontal: spacing(small ? 16 : 20),
          borderRadius: spacing(small ? 12 : 14),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing(8),
          backgroundColor: secondary ? rgba(theme.ink, 0.08) : theme.accent,
          opacity: disabled ? 0.35 : 1,
          outline: "none",
        },
        style,
      ]}
    >
      {iconName && <Icon name={iconName} size={spacing(16)} color={ink} />}
      <Text size={small ? "sm" : "md"} weight={600} color={ink} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
