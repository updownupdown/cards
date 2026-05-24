import { EMPTY_STATS } from "@/data/game-menu";
import { GAMES_DATA } from "@/data/games-data";
import { textStyles } from "@/styles/textStyles";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  calculateWinRate,
  loadGameSettingsMap,
  type GameSettingsMap,
} from "@/data/game-menu";
import ModalFull from "../Modals/ModalFull";
import { modalStyles } from "@/styles/modalStyles";
import { flexStyles } from "@/styles/flexStyles";

interface Props {
  onClose: () => void;
}

export const StatsModal = ({ onClose }: Props) => {
  const [settingsMap, setSettingsMap] = useState<GameSettingsMap>({});

  useEffect(() => {
    let cancelled = false;
    loadGameSettingsMap().then((loaded) => {
      if (!cancelled) setSettingsMap(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const orderedStatsRows = useMemo(
    () =>
      Object.entries(GAMES_DATA)
        .map(([path, gameInfo]) => ({
          path,
          title: gameInfo.title,
          stats: settingsMap[path]?.stats ?? EMPTY_STATS,
        }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [settingsMap],
  );

  return (
    <ModalFull onClose={onClose}>
      <ScrollView contentContainerStyle={modalStyles.scrollContent}>
        {/* Stats for ALL games */}
        <View style={styles.gameStats}>
          <Text style={textStyles.h3}>Games Stats</Text>
          {orderedStatsRows.map((row) => (
            <Text key={row.path} style={textStyles.default}>
              {row.title}: A: {row.stats.attempts}, W: {row.stats.wins}, L:{" "}
              {row.stats.losses}, ({calculateWinRate(row.stats)})
            </Text>
          ))}
        </View>
      </ScrollView>
    </ModalFull>
  );
};

const styles = StyleSheet.create({
  gameStats: {
    ...flexStyles.colCentered,
    alignItems: "flex-start",
    padding: 20,
    textAlign: "left",
    gap: 8,
  },
});
