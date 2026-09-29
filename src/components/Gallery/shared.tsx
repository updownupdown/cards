import { Text } from "@/components/common/Text";
import { useGlassStyle } from "@/components/ui/FloatingBar";
import { Kicker, RoundButton } from "@/components/ui/Nocturne";
import { Icon } from "@/icons";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Colors, rgba, theme } from "@/styles/styles";

/**
 * A number kept across sessions (the chapter or quote last looked at).
 * Undefined until it has been read; then the saved value, or `fallback`.
 */
export function useSavedNumber(
  key: string,
  fallback: number,
  isValid: (value: number) => boolean,
) {
  const [value, setValue] = useState<number>();
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key)
      .catch(() => null)
      .then((raw) => {
        if (!active) return;
        const saved = raw === null ? NaN : Number(raw);
        setValue(Number.isFinite(saved) && isValid(saved) ? saved : fallback);
      });
    return () => {
      active = false;
    };
    // Read once: later changes to the fallback don't move the reader.
  }, [key]);
  const save = (next: number) => {
    setValue(next);
    void AsyncStorage.setItem(key, String(next)).catch(() => undefined);
  };
  return [value, save] as const;
}

/** How long a pick stays on show before its picker closes. */
export const PICKED_PAUSE_MS = 1000;

/**
 * A panel laid over a Gallery view to choose from (a chapter, an author),
 * with a title and a close button. A tap outside it closes it too.
 */
export function PickerPanel({
  title,
  closeLabel,
  onClose,
  top,
  bottom,
  fill = false,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  /** Room kept clear above and below it. */
  top: number;
  bottom: number;
  /** Takes all the room between, rather than sitting on the bar below. */
  fill?: boolean;
  children: ReactNode;
}) {
  const { spacing, ui } = useResponsiveMetrics();
  const glass = useGlassStyle();
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(150)}
      style={[StyleSheet.absoluteFill, { zIndex: 6 }]}
    >
      <Pressable
        accessibilityLabel={closeLabel}
        onPress={onClose}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: rgba(theme.night, 0.55) },
        ]}
      />
      <View
        style={{
          position: "absolute",
          top,
          bottom,
          left: 0,
          right: 0,
          justifyContent: fill ? "flex-start" : "flex-end",
          alignItems: "center",
          paddingHorizontal: spacing(10),
          pointerEvents: "box-none",
        }}
      >
        <View
          style={[
            glass,
            {
              width: "100%",
              maxWidth: ui.contentMaxWidth - spacing(20),
              maxHeight: "100%",
              flex: fill ? 1 : undefined,
              backgroundColor: theme.surface,
              overflow: "hidden",
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingLeft: spacing(18),
              paddingRight: spacing(8),
              paddingVertical: spacing(8),
            }}
          >
            <Kicker style={{ flex: 1 }}>{title}</Kicker>
            <RoundButton
              iconName="close"
              size={34}
              accessibilityLabel={closeLabel}
              onPress={onClose}
            />
          </View>
          {children}
        </View>
      </View>
    </Animated.View>
  );
}

/** A row in a picker list: a name, and how much of it is collected. */
export function CountRow({
  label,
  count,
  total,
  heading = false,
  selected = false,
  onPress,
}: {
  label: string;
  count: number;
  total: number;
  heading?: boolean;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const complete = count === total;
  const content = (
    <>
      <Text
        size={heading ? "xs" : "md"}
        weight={heading ? 500 : 400}
        color={
          heading
            ? theme.accent
            : selected
              ? theme.accent
              : count > 0
                ? theme.ink
                : theme.dim
        }
        textTransform={heading ? "uppercase" : "none"}
        numberOfLines={1}
        style={[{ flex: 1 }, heading ? { letterSpacing: spacing(1.5) } : null]}
      >
        {label}
      </Text>
      <Text
        size="xs"
        weight={400}
        color={complete && count > 0 ? theme.accent : theme.dim}
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {count} / {total}
      </Text>
    </>
  );
  const style = {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(12),
    paddingHorizontal: spacing(18),
    paddingTop: heading ? spacing(18) : spacing(9),
    paddingBottom: heading ? spacing(6) : spacing(9),
    outline: "none",
  } as const;
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={style}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

/**
 * A work not yet acquired: a plain box in the theme's colour, the size of
 * the work, with a picture icon in the middle.
 */
export function WorkPlaceholder({
  width,
  height,
  iconSize,
  radius,
}: {
  width: number;
  height: number;
  iconSize: number;
  radius: number;
}) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: theme.surface,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 ${radius + 1}px ${radius * 4}px ${rgba(Colors.black, 0.55)}`,
      }}
    >
      <Icon name="frame" size={iconSize} color={theme.faint} />
    </View>
  );
}
