import { RadioButtons } from "@/components/common/RadioButtons";
import { Text } from "@/components/common/Text";
import { HINT_MODES, type HintMode } from "@/data/hint-mode";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { usePalette } from "@/styles/palette";
import { FontWeight, rgba, UfoColors } from "@/styles/styles";
import { View } from "react-native";

/** Each choice lights up in its own UFO ink. */
const MODE_INKS: Record<HintMode, string> = {
  off: UfoColors.blue,
  beacons: UfoColors.green,
  autopilot: UfoColors.purple,
};

/**
 * The "Help from Above" choices side by side, with what the chosen one does
 * underneath, in the UFO's colours. In the settings and in the Rules modal.
 */
export function HintModeRadio({
  value,
  onChange,
}: {
  value: HintMode;
  onChange: (value: HintMode) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("settings");
  const palette = usePalette();
  const ink = MODE_INKS[value];
  return (
    <View style={{ width: "100%", gap: spacing(8) }}>
      <RadioButtons
        options={HINT_MODES.map((option) => ({
          value: option,
          label: t(`helpFromAbove.${option}`),
          // The chosen one lifts, as in the app's other toggles, and takes
          // its own ink.
          selectedBackgroundColor: rgba(MODE_INKS[option], 0.16),
        }))}
        selectedValue={value}
        onChange={onChange}
        containerStyle={{ width: "100%", height: spacing(44) }}
        buttonStyle={{ flex: 1, paddingHorizontal: spacing(6) }}
        selectedTextStyle={{ color: ink, fontFamily: FontWeight[600] }}
      />
      <Text size="sm" weight={400} color={palette.dim} lineHeight={1.3}>
        {/* **Bold** runs (what happens to wins) stand out in the choice's ink. */}
        {t(`helpFromAbove.${value}Description`)
          .split("**")
          .map((run, index) =>
            index % 2 === 1 ? (
              <Text
                key={index}
                size="sm"
                weight={700}
                color={ink}
                lineHeight={1.3}
              >
                {run}
              </Text>
            ) : (
              run
            ),
          )}
      </Text>
    </View>
  );
}
