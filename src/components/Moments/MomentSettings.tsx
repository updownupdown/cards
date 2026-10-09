import { Button } from "@/components/Button/Button";
import { RadioButtons } from "@/components/common/RadioButtons";
import { Text } from "@/components/common/Text";
import { useDevMode } from "@/data/dev-mode";
import {
  MOMENT_FREQUENCIES,
  MOMENTS,
  saveMomentFrequency,
  useMomentFrequency,
  type Moment,
} from "@/data/moments";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { usePalette } from "@/styles/palette";
import { useState } from "react";
import { Modal, View } from "react-native";
import { MomentOverlay } from "./MomentOverlay";

/**
 * The Quiet moments setting: how often one follows a win outside the
 * Odyssey. In dev mode every moment is listed under it, to preview.
 */
export function MomentSettings() {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("settings");
  const { t: tGame } = useTranslation("game");
  const palette = usePalette();
  const frequency = useMomentFrequency();
  const devMode = useDevMode();
  const [preview, setPreview] = useState<Moment | null>(null);

  return (
    <View style={{ width: "100%", gap: spacing(10) }}>
      <View style={{ gap: spacing(4) }}>
        <Text weight={500} size="md" color={palette.ink}>
          {t("moments.label")}
        </Text>
        <Text size="sm" weight={400} color={palette.dim}>
          {t("moments.description")}
        </Text>
      </View>
      <RadioButtons
        options={MOMENT_FREQUENCIES.map((option) => ({
          value: option,
          label: t(`moments.${option}`),
        }))}
        selectedValue={frequency}
        onChange={(value) => void saveMomentFrequency(value)}
        containerStyle={{ width: "100%", height: spacing(48) }}
        buttonStyle={{ flex: 1 }}
      />

      {devMode && (
        <View
          style={{
            gap: spacing(8),
            marginTop: spacing(6),
            padding: spacing(14),
            borderRadius: spacing(16),
            borderWidth: 1,
            borderColor: palette.faint,
          }}
        >
          <Text weight={500} size="sm" color={palette.ink}>
            {t("moments.previewTitle")}
          </Text>
          {MOMENTS.map((moment) => (
            <Button
              key={moment.id}
              size="sm"
              uppercase={false}
              theme="blue"
              text={
                moment.kind === "words"
                  ? tGame(`moments.lines.${moment.id}` as "moments.lines.dealt")
                  : t(
                      `moments.preview.${moment.kind}` as "moments.preview.breathe",
                    )
              }
              onPress={() => setPreview(moment)}
            />
          ))}
        </View>
      )}

      {preview && (
        <Modal
          visible
          transparent
          animationType="none"
          onRequestClose={() => setPreview(null)}
        >
          <MomentOverlay
            key={preview.id}
            moment={preview}
            backgroundColor={palette.night}
            color={palette.ink}
            onDone={() => setPreview(null)}
          />
        </Modal>
      )}
    </View>
  );
}
