import { HomeSectionTitle } from "@/components/Home/HomeSectionTitle";
import { RandomGameRoller } from "@/components/Home/RandomGameRoller";
import type { GameSettingsMap } from "@/data/game-menu";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { layoutDims } from "@/styles/styles";
import { useMemo } from "react";
import { ScrollView } from "react-native";

type RandomTabProps = {
  allEnabledGames: HomeGameEntry[];
  unplayedGamePaths: string[];
  settingsMap: GameSettingsMap;
  isActive: boolean;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
};

export function RandomTab({
  allEnabledGames,
  unplayedGamePaths,
  settingsMap,
  isActive,
  favorites,
  onToggleFavorite,
  contentPaddingTop,
  contentPaddingBottom,
}: RandomTabProps) {
  const { ui, spacing } = useResponsiveMetrics();
  const pageSidePadding = spacing(layoutDims.pagePadding);
  const unplayedGames = useMemo(() => {
    const unplayed = new Set(unplayedGamePaths);
    return allEnabledGames.filter(([path]) => unplayed.has(path));
  }, [allEnabledGames, unplayedGamePaths]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
      }}
      showsVerticalScrollIndicator={false}
    >
      <RandomGameRoller
        allEntries={allEnabledGames}
        unplayedEntries={unplayedGames}
        settingsMap={settingsMap}
        isActive={isActive}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        contentMaxWidth={ui.contentMaxWidth}
        pageSidePadding={pageSidePadding}
      />
    </ScrollView>
  );
}
