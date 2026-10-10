import { UfoGuideBox } from "@/components/common/UfoGuideBox";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { HoveringUfoIcon } from "@/hints/HintUfo";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { View } from "react-native";

/**
 * Whether the Gallery's introduction is still to be read. Once something
 * has been collected, the UFO hovers over the Gallery's tab until it is.
 */
export function useGalleryIntro() {
  const { settings, updateSettings, isLoading } = useGlobalSettings();
  return {
    shown: !isLoading && !settings.dismissCollectIntro,
    dismiss: () => void updateSettings({ dismissCollectIntro: true }),
  };
}

/**
 * The UFO's note on the Gallery's first visit, what is kept here, with the
 * UFO hovering under it.
 */
export function GalleryIntroBox({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("home");
  const { spacing } = useResponsiveMetrics();
  return (
    <View style={{ alignItems: "center", gap: spacing(14) }}>
      <UfoGuideBox
        title={t("gallery.intro.title")}
        text={t("gallery.intro.text")}
        closeLabel={t("gallery.intro.close")}
        onClose={onClose}
      />
      <HoveringUfoIcon size={spacing(34)} />
    </View>
  );
}
