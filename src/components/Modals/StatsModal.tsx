import { StatsList } from "@/components/Home/StatsList";
import type { GameSettingsMap } from "@/data/game-menu";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import ModalFull from "./ModalFull";

type StatsModalProps = {
  settingsMap: GameSettingsMap;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  onClose: () => void;
};

export function StatsModal({
  settingsMap,
  favorites,
  onToggleFavorite,
  onClose,
}: StatsModalProps) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");

  return (
    <ModalFull title={t("statsModal.title")} iconName="chart" onClose={onClose}>
      <StatsList
        settingsMap={settingsMap}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        onOpenGame={onClose}
        // Clears the header's shadow, and leaves room below the Total row
        // for the floating Top button.
        contentPaddingTop={spacing(24)}
        contentPaddingBottom={spacing(90)}
      />
    </ModalFull>
  );
}
