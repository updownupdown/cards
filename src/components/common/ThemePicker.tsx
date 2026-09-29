import { Text } from "@/components/common/Text";
import { hairline } from "@/components/ui/Nocturne";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { rgba, theme } from "@/styles/styles";
import { COLOR_THEMES } from "@/styles/themes";
import { LinearGradient } from "expo-linear-gradient";
import { Fragment, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

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

const COLUMNS = 3;
/** Rows shown while folded: two, and a glimpse of the third under a fade. */
const FOLDED_ROWS = 2.55;

/**
 * The colour themes as swatches, three to a row, each drawn in its own
 * colours, the high-contrast ones under a heading of their own. Folded, a couple of rows show, fading into an Expand button;
 * expanded, they all do. It opens expanded when the chosen theme would be
 * out of sight.
 */
export function ThemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("settings");
  const gap = spacing(8);
  const [rowHeight, setRowHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const cardWidth = width ? (width - gap * (COLUMNS - 1)) / COLUMNS : 0;
  const selectedIndex = COLOR_THEMES.findIndex(({ id }) => id === value);
  const [expanded, setExpanded] = useState(
    selectedIndex >= Math.floor(FOLDED_ROWS) * COLUMNS,
  );
  const foldedHeight = rowHeight
    ? rowHeight * FOLDED_ROWS + gap * Math.floor(FOLDED_ROWS)
    : undefined;
  const toggleLabel = expanded
    ? t("colorTheme.collapse")
    : t("colorTheme.expand");

  return (
    <View style={{ alignSelf: "stretch" }}>
      <View
        style={{
          maxHeight: expanded ? undefined : foldedHeight,
          overflow: "hidden",
        }}
      >
        <View
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap,
            // Laid out once its width is known, so it never jumps.
            opacity: width ? 1 : 0,
          }}
        >
          {COLOR_THEMES.map((colorTheme, index) => {
            const { id, name, colors } = colorTheme;
            const selected = id === value;
            // The high-contrast themes come last, under their own heading,
            // which takes a whole row.
            const firstHighContrast =
              "highContrast" in colorTheme &&
              !("highContrast" in (COLOR_THEMES[index - 1] ?? {}));
            return (
              <Fragment key={id}>
                {firstHighContrast && (
                  <Text
                    size="xs"
                    weight={500}
                    color={theme.dim}
                    style={{ width: "100%", marginTop: spacing(8) }}
                  >
                    {t("colorTheme.highContrast")}
                  </Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  accessibilityState={{ selected }}
                  onLayout={
                    index === 0
                      ? (event) =>
                          setRowHeight(
                            Math.ceil(event.nativeEvent.layout.height),
                          )
                      : undefined
                  }
                  onPress={() => {
                    if (selected) return;
                    reopenSettings = true;
                    onChange(id);
                  }}
                  style={{
                    width: cardWidth || `${100 / COLUMNS - 3}%`,
                    paddingVertical: spacing(12),
                    paddingHorizontal: spacing(10),
                    gap: spacing(10),
                    borderRadius: spacing(14),
                    backgroundColor: colors.night,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected
                      ? theme.accent
                      : rgba(theme.ink, 0.16),
                    outline: "none",
                  }}
                >
                  <View style={{ flexDirection: "row", gap: spacing(3) }}>
                    {[
                      colors.accent,
                      colors.accent2,
                      colors.surface,
                      colors.ink,
                    ].map((color, dot) => (
                      <View
                        key={dot}
                        style={{
                          width: spacing(14),
                          height: spacing(14),
                          borderRadius: spacing(7),
                          backgroundColor: color,
                          borderWidth: 1,
                          borderColor: rgba(colors.ink, 0.15),
                        }}
                      />
                    ))}
                  </View>
                  <Text
                    size="xxs"
                    weight={600}
                    color={colors.ink}
                    textTransform="uppercase"
                    numberOfLines={1}
                    style={{ letterSpacing: spacing(0.8) }}
                  >
                    {name}
                  </Text>
                </Pressable>
              </Fragment>
            );
          })}
        </View>
        {!expanded && (
          <LinearGradient
            colors={[rgba(theme.surface, 0), theme.surface]}
            locations={[0.45, 0.95]}
            style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
          />
        )}
      </View>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={toggleLabel}
        accessibilityState={{ expanded }}
        style={{
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          gap: spacing(4),
          marginTop: expanded ? spacing(12) : -spacing(18),
          height: spacing(34),
          paddingLeft: spacing(16),
          paddingRight: spacing(10),
          borderRadius: spacing(17),
          backgroundColor: theme.raise,
          borderWidth: 1,
          borderColor: hairline(),
          outline: "none",
        }}
      >
        <Text size="xs" weight={500} color={theme.ink}>
          {toggleLabel}
        </Text>
        <Icon
          name={expanded ? "expand-less" : "expand-more"}
          size={spacing(18)}
          color={theme.ink}
        />
      </Pressable>
    </View>
  );
}
