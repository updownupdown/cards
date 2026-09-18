import { StatsTab } from "@/components/Home/StatsTab";
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
      <StatsTab
        settingsMap={settingsMap}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        contentPaddingTop={0}
        contentPaddingBottom={spacing(30)}
      />
    </ModalFull>
  );
}
