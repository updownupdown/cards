import { RadioButtons } from "@/components/common/RadioButtons";
import { Text } from "@/components/common/Text";
import { HINT_MODES, type HintMode } from "@/data/hint-mode";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { usePalette } from "@/styles/palette";
import { theme as appTheme } from "@/styles/styles";
import { View } from "react-native";

/**
 * The "Help from Above" choices side by side, with what the chosen one does
 * underneath. In the settings and in the Rules modal's introduction.
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
  return (
    <View style={{ width: "100%", gap: spacing(8) }}>
      <RadioButtons
        options={HINT_MODES.map((option) => ({
          value: option,
          label: t(`helpFromAbove.${option}`),
        }))}
        selectedValue={value}
        onChange={onChange}
        containerStyle={{ width: "100%", height: spacing(44) }}
        buttonStyle={{ flex: 1, paddingHorizontal: spacing(6) }}
        selectedTextStyle={{ color: appTheme.accent }}
      />
      <Text size="sm" weight={400} color={palette.dim} lineHeight={1.3}>
        {t(`helpFromAbove.${value}Description`)}
      </Text>
    </View>
  );
}
