import { UfoGuideBox } from "@/components/common/UfoGuideBox";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useTranslation } from "@/i18n";

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

/** The UFO's note on the Gallery's first visit: what is kept here. */
export function GalleryIntroBox({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("home");
  return (
    <UfoGuideBox
      ufo
      text={t("gallery.intro.text")}
      closeLabel={t("gallery.intro.close")}
      onClose={onClose}
    />
  );
}
