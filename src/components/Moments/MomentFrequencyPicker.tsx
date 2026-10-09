import { RadioButtons } from "@/components/common/RadioButtons";
import { Text } from "@/components/common/Text";
import {
  MOMENT_FREQUENCIES,
  saveMomentFrequency,
  useMomentFrequency,
} from "@/data/moments";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { usePalette } from "@/styles/palette";
import { View } from "react-native";

/** "Every:" and how often a quiet moment comes, saved as it's picked. */
export function MomentFrequencyPicker() {
  const { spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("settings");
  const palette = usePalette();
  const frequency = useMomentFrequency();
  return (
    <View style={{ width: "100%", gap: spacing(6) }}>
      <Text size="sm" weight={400} color={palette.dim}>
        {t("moments.every")}
      </Text>
      <RadioButtons
        options={MOMENT_FREQUENCIES.map((option) => ({
          value: option,
          label: t(`moments.${option}`),
        }))}
        selectedValue={frequency}
        onChange={(value) => void saveMomentFrequency(value)}
        containerStyle={{ width: "100%", height: spacing(48) }}
        buttonStyle={{ flex: 1, paddingHorizontal: spacing(4) }}
        textStyle={{ fontSize: font(13.5) }}
      />
    </View>
  );
}
