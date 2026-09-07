import { StatsTab } from "@/components/Home/StatsTab";
import type { GameSettingsMap } from "@/data/game-menu";
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
  return (
    <ModalFull title="Stats" iconName="chart" onClose={onClose}>
      <StatsTab
        settingsMap={settingsMap}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        contentPaddingTop={0}
        contentPaddingBottom={0}
      />
    </ModalFull>
  );
}
