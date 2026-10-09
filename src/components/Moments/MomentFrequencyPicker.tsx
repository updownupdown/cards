import { SettingControl } from "@/components/common/SettingControl";
import { Slider } from "@/components/common/Slider";
import { Text } from "@/components/common/Text";
import {
  MOMENT_EVERY_MAX,
  MOMENT_EVERY_MIN,
  saveMomentSettings,
  useMomentSettings,
} from "@/data/moments";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { usePalette } from "@/styles/palette";
import { View } from "react-native";

const EVERY_VALUES = Array.from(
  { length: MOMENT_EVERY_MAX - MOMENT_EVERY_MIN + 1 },
  (_, i) => MOMENT_EVERY_MIN + i,
);

/**
 * How often quiet moments come: "Every ~N games" beside its slider, saved
 * as it's moved. With a `toggle`, a switch over it turns them off entirely,
 * and the slider greys out while they are.
 */
export function MomentFrequencyPicker({
  toggle,
}: {
  /** The switch's own words; without them, there is no switch. */
  toggle?: { label: string; description?: string };
}) {
  const { spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("settings");
  const palette = usePalette();
  const { enabled, every } = useMomentSettings();
  const active = enabled || !toggle;
  const everyText = (count: number) =>
    count === 1 ? t("moments.everyGame") : t("moments.every", { count });
  const labelStyle = { fontSize: font(16), lineHeight: font(22) };
  return (
    <View style={{ width: "100%", gap: spacing(10) }}>
      {toggle && (
        <SettingControl
          label={toggle.label}
          description={toggle.description}
          type="boolean"
          value={enabled}
          onChange={(value) =>
            void saveMomentSettings({ enabled: value, every })
          }
        />
      )}
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          gap: spacing(16),
        }}
      >
        {/* As wide as the widest thing it can say (each one is in it, unseen
            and taking no height), so it never wraps, and the slider beside
            it never changes size. */}
        <View style={{ flexShrink: 0, opacity: active ? 1 : 0.35 }}>
          <Text weight={400} color={palette.ink} style={labelStyle}>
            {everyText(every)}
          </Text>
          {EVERY_VALUES.map((count) => (
            <View
              key={count}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              aria-hidden
              style={{ height: 0, overflow: "hidden" }}
            >
              <Text weight={400} style={labelStyle}>
                {everyText(count)}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Slider
            value={every}
            min={MOMENT_EVERY_MIN}
            max={MOMENT_EVERY_MAX}
            disabled={!active}
            accessibilityLabel={t("moments.label")}
            accessibilityValueText={everyText(every)}
            onChange={(value) =>
              void saveMomentSettings({ enabled, every: value })
            }
          />
        </View>
      </View>
    </View>
  );
}
