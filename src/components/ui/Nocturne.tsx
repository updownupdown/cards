/**
 * The building blocks of the app's look (the "Nocturne" style): one accent
 * colour from the theme, quiet surfaces, a kicker over each section, pills
 * for filters, thin meters for ratings and progress, and round icon buttons.
 * Colours come from `theme` at render time, so they follow the colour theme.
 */
import { Text, type TextProps } from "@/components/common/Text";
import { usePalette } from "@/styles/palette";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { rgba, theme, transitionStyles } from "@/styles/styles";
import type { ReactNode } from "react";
import {
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/** A hairline in the theme's ink. */
export const hairline = () => rgba(theme.ink, 0.14);

/** The panel look: a surface with a hairline edge. */
export function useSurfaceStyle(radius = 18): ViewStyle {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
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
  color: colorProp,
  style,
  ...props
}: TextProps & { children: ReactNode }) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const color = colorProp ?? theme.accent;
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

/**
 * A small label in capitals, spaced out: ratings, stats and table headings.
 * Dim by default; the Kicker is its accented sibling for section headings.
 */
export function Caps({
  children,
  color: colorProp,
  style,
  ...props
}: TextProps & { children: ReactNode }) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const color = colorProp ?? theme.dim;
  return (
    <Text
      size="xxs"
      weight={500}
      color={color}
      textTransform="uppercase"
      numberOfLines={1}
      style={[{ letterSpacing: spacing(1.2) }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

/** A page's title: Home, Odyssey, Gallery, Search. */
export function PageTitle({ children }: { children: ReactNode }) {
  const { font } = useResponsiveMetrics();
  const theme = usePalette();
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

/** A section heading's size: the kicker's, 15% larger. */
export function useSectionTitleStyle() {
  const { font } = useResponsiveMetrics();
  const theme = usePalette();
  const size = font(11 * 1.15);
  return { fontSize: size, lineHeight: size * 1.3 };
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
  const theme = usePalette();
  const titleStyle = useSectionTitleStyle();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing(12),
      }}
    >
      <Kicker style={titleStyle}>{children}</Kicker>
      {action}
    </View>
  );
}

/** A thin rating or progress meter. */
export function Meter({
  value,
  color: colorProp,
  style,
}: {
  /** 0 to 1. */
  value: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const color = colorProp ?? theme.accent;
  const height = Math.max(2, spacing(3));
  return (
    <View
      style={[
        {
          height,
          borderRadius: height,
          // The empty part of the track, clear enough to read the fill against.
          backgroundColor: rgba(theme.ink, 0.18),
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
  const theme = usePalette();
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
            backgroundColor: index < lit ? theme.accent : rgba(theme.ink, 0.18),
          }}
        />
      ))}
    </View>
  );
}

/**
 * Three labelled meters: complexity, difficulty, luck. Side by side, or
 * stacked with the labels to the left where a card is too narrow for three
 * labels in a row.
 */
export function RatingMeters({
  rating,
  labels,
  stacked = false,
}: {
  rating: { complexity: number; difficulty: number; luck: number };
  labels: { complexity: string; difficulty: string; luck: string };
  stacked?: boolean;
}) {
  const { spacing, font } = useResponsiveMetrics();
  const theme = usePalette();
  const items = [
    [labels.complexity, rating.complexity],
    [labels.difficulty, rating.difficulty],
    [labels.luck, rating.luck],
  ] as const;
  if (stacked) {
    return (
      <View style={{ gap: spacing(7) }}>
        {items.map(([label, value]) => (
          <View
            key={label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing(10),
            }}
          >
            <Caps style={{ width: spacing(84) }}>{label}</Caps>
            <Meter value={value / 100} style={{ flex: 1 }} />
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", gap: spacing(10) }}>
      {items.map(([label, value]) => (
        <View key={label} style={{ flex: 1, gap: spacing(6) }}>
          {/* Tighter than other caps, so COMPLEXITY fits a third of a card. */}
          <Caps style={{ fontSize: font(10), letterSpacing: spacing(0.7) }}>
            {label}
          </Caps>
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
  const theme = usePalette();
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
          : rgba(theme.ink, 0.07),
        borderWidth: 1,
        borderColor: selected ? rgba(theme.accent, 0.45) : hairline(),
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
        color={selected ? theme.accent : theme.ink}
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
  const theme = usePalette();
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
        <Icon
          name={iconName}
          size={Math.round(diameter * 0.48)}
          color={iconColor}
        />
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
  onLayout,
  style,
}: {
  label: string;
  onPress: () => void;
  iconName?: IconName;
  secondary?: boolean;
  small?: boolean;
  disabled?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const height = spacing(small ? 38 : 46);
  const ink = secondary ? theme.ink : theme.accentInk;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onLayout={onLayout}
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
      <Text
        size={small ? "sm" : "md"}
        weight={600}
        color={ink}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** The look every segmented toggle shares: its track and its chosen segment. */
export const segmentTrack = () => ({
  backgroundColor: rgba(theme.ink, 0.06),
  borderWidth: 1,
  borderColor: hairline(),
});
export const segmentChosen = () => rgba(theme.ink, 0.14);

/**
 * A segmented toggle: a few choices side by side in a track, the chosen one
 * lifted. An option can carry a small line under its label (a count).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  style,
}: {
  options: { value: T; label: string; detail?: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const radius = spacing(size === "md" ? 14 : 12);
  return (
    <View
      style={[
        {
          ...segmentTrack(),
          flexDirection: "row",
          gap: spacing(4),
          padding: spacing(4),
          borderRadius: radius + spacing(4),
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={{
              ...transitionStyles.limited02sec,
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: spacing(size === "md" ? 8 : 6),
              borderRadius: radius,
              backgroundColor: selected ? segmentChosen() : "transparent",
              outline: "none",
            }}
          >
            <Text
              size={size === "md" ? "md" : "sm"}
              weight={500}
              color={selected ? theme.ink : theme.dim}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {option.detail ? (
              <Text
                size="xs"
                weight={400}
                color={selected ? theme.accent : theme.dim}
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {option.detail}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
