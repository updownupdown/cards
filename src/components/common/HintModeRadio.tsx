import { RadioButtons } from "@/components/common/RadioButtons";
import { Text } from "@/components/common/Text";
import { HINT_MODES, type HintMode } from "@/data/hint-mode";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { usePalette } from "@/styles/palette";
import { UfoColors } from "@/styles/styles";
import { View } from "react-native";

/** Each choice lights up in its own UFO ink. */
const MODE_INKS: Record<HintMode, string> = {
  off: UfoColors.purple,
  beacons: UfoColors.green,
  autopilot: UfoColors.blue,
};

/** What happens to wins with each choice, where it has a say. */
const MODE_NOTES = {
  off: null,
  beacons: "helpFromAbove.beaconsNote",
  autopilot: "helpFromAbove.autopilotNote",
} as const;

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
  const note = MODE_NOTES[value];
  return (
    <View style={{ width: "100%", gap: spacing(16) }}>
      <RadioButtons
        options={HINT_MODES.map((option) => ({
          value: option,
          label: t(`helpFromAbove.${option}`),
          // The chosen one fills with its own ink.
          selectedBackgroundColor: MODE_INKS[option],
        }))}
        selectedValue={value}
        onChange={onChange}
        containerStyle={{ width: "100%", height: spacing(48) }}
        buttonStyle={{ flex: 1 }}
        selectedInk={UfoColors.black}
      />
      <View style={{ gap: spacing(2) }}>
        <Text
          size="sm"
          weight={400}
          color={palette.dim}
          lineHeight={1.3}
          style={{ textAlign: "center" }}
        >
          {t(`helpFromAbove.${value}Description`)}
        </Text>
        {/* What happens to wins stands out on its own line, in the choice's ink. */}
        {note && (
          <Text
            size="sm"
            weight={700}
            color={ink}
            lineHeight={1.3}
            style={{ textAlign: "center" }}
          >
            {t(note)}
          </Text>
        )}
      </View>
    </View>
  );
}
