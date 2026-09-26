import { IntroPanel } from "@/components/common/IntroPanel";
import { useTranslation } from "@/i18n";

type CampaignIntroPanelProps = {
  onClose: () => void;
};

/**
 * What the Campaign is, in a small box under the progress pills. It floats
 * over the map without blocking it, so the map can be explored while reading,
 * and stays until closed.
 */
export function CampaignIntroPanel({ onClose }: CampaignIntroPanelProps) {
  const { t } = useTranslation("campaign");

  return (
    <IntroPanel
      title={t("intro.title")}
      text={t("intro.text")}
      onClose={onClose}
      closeLabel={t("intro.close")}
    />
  );
}
