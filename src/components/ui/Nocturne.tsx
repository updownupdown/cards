/**
 * The building blocks of the app's look (the "Nocturne" style): one accent
 * colour from the theme, quiet surfaces, a kicker over each section, pills
 * for filters, thin meters for ratings and progress, and round icon buttons.
 * Colours come from `theme` at render time, so they follow the colour theme.
 */
import { Text, type TextProps } from "@/components/common/Text";
import { mix, usePalette } from "@/styles/palette";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { Colors, rgba, theme, transitionStyles } from "@/styles/styles";
import { useState, type ReactNode } from "react";
import { SURFACE_OPACITY } from "./FloatingBar";
import {
  Pressable,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/** A hairline in the theme's ink. */
export const hairline = () => rgba(theme.ink, 0.14);

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

/** A section heading's size: the kicker's, 15% larger. */
export function useSectionTitleStyle() {
  const { font } = useResponsiveMetrics();
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
 * Three labelled meters: complexity, difficulty, luck. Side by side, or
 * stacked with the labels to the left where a card is too narrow for three
 * labels in a row.
 */
export function RatingMeters({
  rating,
  labels,
  color,
}: {
  rating: { complexity: number; difficulty: number; luck: number };
  labels: { complexity: string; difficulty: string; luck: string };
  stacked?: boolean;
  /** The meters' fill; the accent by default. */
  color?: string;
}) {
  const { spacing, font } = useResponsiveMetrics();
  const items = [
    [labels.complexity, rating.complexity],
    [labels.difficulty, rating.difficulty],
    [labels.luck, rating.luck],
  ] as const;

  return (
    <View style={{ flexDirection: "row", gap: spacing(12) }}>
      {items.map(([label, value]) => (
        <View key={label} style={{ flex: 1, gap: spacing(4) }}>
          {/* Tighter than other caps, so COMPLEXITY fits a third of a card. */}
          <Caps style={{ fontSize: font(10), letterSpacing: spacing(0.7) }}>
            {label}
          </Caps>
          <Meter value={value / 100} color={color} />
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
  const { spacing, font } = useResponsiveMetrics();
  const theme = usePalette();
  // Pills are 85% of their first size.
  const size = (value: number) => spacing(value);
  // Unselected, the tab bar's fill; selected, a tint of the accent over it.
  const fill = selected
    ? rgba(mix(theme.surface, theme.accent, 0.16), SURFACE_OPACITY)
    : rgba(theme.surface, SURFACE_OPACITY);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        ...transitionStyles.limited02sec,
        height: size(34),
        paddingHorizontal: size(14),
        borderRadius: size(17),
        flexDirection: "row",
        alignItems: "center",
        gap: size(6),
        // A shadow lifts it off the sky.
        backgroundColor: fill,
        borderWidth: 1,
        borderColor: selected
          ? rgba(theme.accent, 0.45)
          : rgba(theme.ink, 0.16),
        boxShadow: `0 ${spacing(2)}px ${spacing(8)}px ${rgba(Colors.black, 0.45)}`,
        outline: "none",
      }}
    >
      {iconName && (
        <Icon
          name={iconName}
          size={size(15)}
          color={selected ? theme.accent : theme.dim}
        />
      )}
      <Text
        size="xs"
        weight={400}
        color={selected ? theme.accent : theme.ink}
        textTransform="uppercase"
        numberOfLines={1}
        style={{
          fontSize: font(11),
          letterSpacing: 2,
        }}
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
  const { spacing, font } = useResponsiveMetrics();
  const theme = usePalette();
  const diameter = spacing(size);
  const iconColor = color ?? (active ? theme.accent : theme.ink);
  const glassTint = rgba(theme.surface, SURFACE_OPACITY);
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
          backgroundColor: glass ? glassTint : rgba(theme.ink, 0.07),
          borderWidth: glass ? 1 : 0,
          borderColor: hairline(),
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
          style={{ fontSize: font(10), lineHeight: font(12) }}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** The accent-filled button, and its quiet sibling. */
export function ActionButton({
  label = "",
  accessibilityLabel,
  onPress,
  iconName,
  secondary = false,
  small = false,
  disabled = false,
  color,
  ink: inkColor,
  onLayout,
  style,
}: {
  /** Optional: an icon-only button needs an accessibilityLabel instead. */
  label?: string;
  accessibilityLabel?: string;
  onPress: () => void;
  iconName?: IconName;
  secondary?: boolean;
  /** Its fill, in place of the accent (a game's own accent, say). */
  color?: string;
  /** Its label and icon colour, for a fill the accent's ink won't suit. */
  ink?: string;
  small?: boolean;
  disabled?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const height = spacing(small ? 38 : 46);
  const ink = inkColor ?? (secondary ? theme.ink : theme.accentInk);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        {
          ...transitionStyles.limited02sec,
          height,
          paddingHorizontal: spacing(small ? 16 : 20),
          // Fully round ends, as every other button in the app has.
          borderRadius: height / 2,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing(8),
          backgroundColor: secondary
            ? rgba(theme.ink, 0.08)
            : (color ?? theme.accent),
          opacity: disabled ? 0.35 : 1,
          outline: "none",
        },
        style,
      ]}
    >
      {iconName && <Icon name={iconName} size={spacing(16)} color={ink} />}
      {label ? (
        <Text
          size={small ? "sm" : "md"}
          weight={600}
          color={ink}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * Tabs across the top of a modal: plain labels on a hairline, the chosen one
 * in the accent with a line under it.
 */
export function UnderlineTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        paddingHorizontal: spacing(20),
        borderBottomWidth: 1,
        borderBottomColor: rgba(theme.ink, 0.14),
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: spacing(12),
              marginBottom: -1,
              borderBottomWidth: 2,
              borderBottomColor: selected ? theme.accent : "transparent",
              outline: "none",
            }}
          >
            <Text
              weight={500}
              size="md"
              color={selected ? theme.accent : theme.dim}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  pill = false,
  style,
}: {
  options: { value: T; label: string; detail?: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  /**
   * Round-ended choices, the chosen one's label in the accent and its
   * detail only paler.
   */
  pill?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const [optionHeight, setOptionHeight] = useState(0);
  const radius =
    pill && optionHeight ? optionHeight / 2 : spacing(size === "md" ? 14 : 12);
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
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onLayout={
              pill && index === 0
                ? (event) => setOptionHeight(event.nativeEvent.layout.height)
                : undefined
            }
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
              color={selected ? (pill ? theme.accent : theme.ink) : theme.dim}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {option.detail ? (
              <Text
                size="xs"
                weight={400}
                color={
                  selected
                    ? pill
                      ? rgba(theme.ink, 0.72)
                      : theme.accent
                    : theme.dim
                }
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
