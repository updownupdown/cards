import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { QUOTE_COUNT } from "@/data/collectibles";
import { GAMES_DATA } from "@/data/games-registry";
import { MOMENT_KINDS, type Moment, type MomentKind } from "@/data/moments";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { usePalette } from "@/styles/palette";
import { useState } from "react";
import { Modal, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MomentFrequencyPicker } from "./MomentFrequencyPicker";
import { MomentOverlay } from "./MomentOverlay";

/** A moment of this kind to preview: any quote, any game's picture. */
function previewMoment(kind: MomentKind): Moment {
  if (kind === "quote") {
    return { kind, quoteId: 1 + Math.floor(Math.random() * QUOTE_COUNT) };
  }
  if (kind === "artwork") {
    const paths = Object.keys(GAMES_DATA).filter(
      (path) => GAMES_DATA[path].thumbnail,
    );
    return { kind, path: paths[Math.floor(Math.random() * paths.length)] };
  }
  return { kind };
}

/**
 * The Quiet moments setting: whether, and how often, one follows a win
 * outside the Odyssey.
 */
export function MomentSettings() {
  const { t } = useTranslation("settings");

  return (
    <View style={{ width: "100%" }}>
      <MomentFrequencyPicker
        toggle={{
          label: t("moments.label"),
          description: `${t("moments.description")} ${t("moments.notInOdyssey")}`,
        }}
      />
    </View>
  );
}

/** Dev mode: every kind of quiet moment, to preview. */
export function MomentPreviews() {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("settings");
  const palette = usePalette();
  const [preview, setPreview] = useState<Moment | null>(null);

  return (
    <View style={{ width: "100%", gap: spacing(8) }}>
      <Text weight={500} size="sm" color={palette.ink}>
        {t("moments.previewTitle")}
      </Text>
      {MOMENT_KINDS.map((kind) => (
        <Button
          key={kind}
          size="sm"
          uppercase={false}
          theme="blue"
          text={t(`moments.preview.${kind}`)}
          onPress={() => setPreview(previewMoment(kind))}
        />
      ))}

      {preview && (
        <Modal
          visible
          transparent
          animationType="none"
          onRequestClose={() => setPreview(null)}
        >
          {/* A native Modal is its own root, so the picture's gestures need
              their own GestureHandlerRootView. */}
          <GestureHandlerRootView style={{ flex: 1 }}>
            <MomentOverlay moment={preview} onDone={() => setPreview(null)} />
          </GestureHandlerRootView>
        </Modal>
      )}
    </View>
  );
}
