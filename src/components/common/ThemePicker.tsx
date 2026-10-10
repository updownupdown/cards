import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { rgba, theme } from "@/styles/styles";
import { COLOR_THEMES } from "@/styles/themes";
import { Fragment, useState } from "react";
import { Pressable, View } from "react-native";

/**
 * Asks Home to open Settings again once the app has been rebuilt in a new
 * colour theme, so choosing one doesn't close the menu.
 */
let reopenSettings = false;
export function consumeReopenSettings() {
  const value = reopenSettings;
  reopenSettings = false;
  return value;
}

/**
 * Where Settings was (tab and scroll), so it can open there again after a
 * theme change rebuilds the app. Only used when `restore` is set.
 */
export const settingsView = {
  tab: "general" as "general" | "advanced" | "theme" | "dev",
  scrollY: 0,
  restore: false,
};

/** How much of a theme each colour covers, as relative widths. */
const PROMINENCE = [
  ["surface", 5],
  ["raise", 3],
  ["accent", 2],
  ["ink", 1.5],
  ["accent2", 1],
] as const;

/**
 * The colour themes, two to a row, each drawn in its own colours as a row of
 * rounded bars as wide as the colour is prominent. The high-contrast ones sit
 * under a heading of their own.
 */
export function ThemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const gap = spacing(10);
  const [width, setWidth] = useState(0);

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        alignSelf: "stretch",
        flexDirection: "row",
        flexWrap: "wrap",
        gap,
        // Laid out once its width is known, so it never jumps.
        opacity: width ? 1 : 0,
      }}
    >
      {COLOR_THEMES.map(({ id, name, colors }) => {
        const selected = id === value;
        return (
          <Fragment key={id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={name}
              accessibilityState={{ selected }}
              onPress={() => {
                if (selected) return;
                reopenSettings = true;
                settingsView.restore = true;
                onChange(id);
              }}
              style={{
                display: "flex",
                flexDirection: "row",
                width: "100%",
                paddingVertical: spacing(8),
                paddingLeft: spacing(12),
                paddingRight: spacing(8),
                gap: spacing(10),
                borderRadius: spacing(8),
                backgroundColor: colors.night,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? theme.accent : rgba(theme.ink, 0.16),
                outline: "none",
                alignItems: "center",
              }}
            >
              <Text
                size="xxs"
                weight={600}
                color={colors.ink}
                textTransform="uppercase"
                numberOfLines={1}
                style={{ letterSpacing: spacing(0.8), minWidth: spacing(100) }}
              >
                {name}
              </Text>

              <View style={{ flexDirection: "row", gap: spacing(3), flex: 1 }}>
                {PROMINENCE.map(([key, weight]) => (
                  <View
                    key={key}
                    style={{
                      flex: weight,
                      height: spacing(22),
                      borderRadius: spacing(2),
                      backgroundColor: colors[key],
                      borderWidth: 1,
                      borderColor: rgba(colors.ink, 0.15),
                    }}
                  />
                ))}
              </View>
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}
