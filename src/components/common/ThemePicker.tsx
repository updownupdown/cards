import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { rgba, theme } from "@/styles/styles";
import { COLOR_THEMES } from "@/styles/themes";
import { Pressable, ScrollView, View } from "react-native";

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
 * The colour themes as a row of swatches that scrolls sideways, each drawn in
 * its own colours. `bleed` is the padding of the page around it, which the
 * row runs into so it scrolls from edge to edge.
 */
export function ThemePicker({
  value,
  onChange,
  bleed = 0,
}: {
  value: string;
  onChange: (id: string) => void;
  bleed?: number;
}) {
  const { spacing } = useResponsiveMetrics();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -bleed, alignSelf: "stretch" }}
      contentContainerStyle={{ paddingHorizontal: bleed, gap: spacing(8) }}
    >
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
              width: spacing(104),
              paddingVertical: spacing(12),
              paddingHorizontal: spacing(12),
              gap: spacing(10),
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
                      width: spacing(17),
                      height: spacing(17),
                      borderRadius: spacing(9),
                      backgroundColor: color,
                      borderWidth: 1,
                      borderColor: rgba(colors.ink, 0.15),
                    }}
                  />
                ),
              )}
            </View>
            <Text
              size="xxs"
              weight={600}
              color={colors.ink}
              textTransform="uppercase"
              numberOfLines={1}
              style={{ letterSpacing: spacing(1) }}
            >
              {name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
