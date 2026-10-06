import { StatsList, type StatsTab } from "@/components/Home/StatsList";
import { UnderlineTabs } from "@/components/ui/Nocturne";
import type { GameSettingsMap } from "@/data/game-menu";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { useState } from "react";
import ModalFull from "./ModalFull";

const TABS: StatsTab[] = ["progress", "personas", "games"];

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
  const [tab, setTab] = useState<StatsTab>("progress");

  return (
    <ModalFull title={t("statsModal.title")} iconName="chart" onClose={onClose}>
      {/* The tabs stay put while each one scrolls below them. */}
      <UnderlineTabs
        options={TABS.map((key) => ({
          value: key,
          label: t(`statsModal.tabs.${key}`),
        }))}
        value={tab}
        onChange={setTab}
      />
      <StatsList
        tab={tab}
        settingsMap={settingsMap}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        onOpenGame={onClose}
        // Clears the tabs' edge, and leaves room below the Total row for the
        // floating Top button.
        contentPaddingTop={spacing(20)}
        contentPaddingBottom={spacing(90)}
      />
    </ModalFull>
  );
}
