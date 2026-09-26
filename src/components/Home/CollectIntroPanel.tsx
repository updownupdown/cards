import { IntroPanel } from "@/components/common/IntroPanel";
import { useTranslation } from "@/i18n";

type CollectIntroPanelProps = {
  onClose: () => void;
};

/**
 * What the Collect tab is, shown once above the album until closed.
 */
export function CollectIntroPanel({ onClose }: CollectIntroPanelProps) {
  const { t } = useTranslation("home");

  return (
    <IntroPanel
      title={t("collect.intro.title")}
      text={t("collect.intro.text")}
      onClose={onClose}
      closeLabel={t("collect.intro.close")}
    />
  );
}
