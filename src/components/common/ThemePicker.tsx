import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { rgba, theme } from "@/styles/styles";
import { COLOR_THEMES } from "@/styles/themes";
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

/** The colour themes as swatches, each drawn in its own colours. */
export function ThemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(10) }}>
      {COLOR_THEMES.map(({ id, name, colors }) => {
        const selected = id === value;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              reopenSettings = true;
              onChange(id);
            }}
            style={{
              width: "48%",
              flexGrow: 1,
              padding: spacing(10),
              gap: spacing(8),
              borderRadius: spacing(14),
              backgroundColor: colors.night,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? theme.accent : rgba(theme.ink, 0.12),
              outline: "none",
            }}
          >
            <View style={{ flexDirection: "row", gap: spacing(4) }}>
              {[colors.accent, colors.accent2, colors.surface, colors.ink].map(
                (color, index) => (
                  <View
                    key={index}
                    style={{
                      width: spacing(14),
                      height: spacing(14),
                      borderRadius: spacing(7),
                      backgroundColor: color,
                      borderWidth: 1,
                      borderColor: rgba(colors.ink, 0.15),
                    }}
                  />
                ),
              )}
            </View>
            <Text size="xs" weight={500} color={colors.ink} numberOfLines={1}>
              {name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
