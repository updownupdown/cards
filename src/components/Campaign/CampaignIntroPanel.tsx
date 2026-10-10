import { UfoGuideBox } from "@/components/common/UfoGuideBox";
import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useTranslation } from "@/i18n";

/**
 * Whether the Odyssey's introduction still has something to say: until it
 * is put away, or the first game is won in the Odyssey, whichever is first.
 * While it does, the UFO hovers over the Odyssey's tab and, on the map,
 * over Klondike.
 */
export function useOdysseyIntro() {
  const { settings, updateSettings, isLoading } = useGlobalSettings();
  const { wonPaths, isLoading: progressLoading } = useCampaignProgress();
  return {
    shown:
      !isLoading &&
      !progressLoading &&
      !settings.dismissCampaignIntro &&
      wonPaths.size === 0,
    dismiss: () => void updateSettings({ dismissCampaignIntro: true }),
  };
}

/**
 * What the Odyssey is, in the UFO's box under the header, while the UFO
 * beams down on Klondike. "Got it!" puts both away for good.
 */
export function CampaignIntroPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("campaign");

  return (
    <UfoGuideBox
      title={t("intro.title")}
      text={t("intro.text")}
      closeLabel={t("intro.close")}
      onClose={onClose}
    />
  );
}
