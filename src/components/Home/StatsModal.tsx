import { Text } from "@/components/common/Text";
import { EMPTY_STATS } from "@/data/game-menu";
import { GAMES_DATA, isGameEnabled } from "@/data/games-data";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  calculateWinRate,
  loadGameSettingsMap,
  type GameSettingsMap,
} from "@/data/game-menu";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import ModalFull from "../Modals/ModalFull";
import { modalStyles } from "@/styles/modalStyles";

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
        .filter(([_, gameInfo]) => isGameEnabled(gameInfo))
        .map(([path, gameInfo]) => ({
          path,
          title: gameInfo.title,
          stats: settingsMap[path]?.stats ?? EMPTY_STATS,
        }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [settingsMap],
  );

  const hasAnyHighestScore = useMemo(
    () =>
      orderedStatsRows.some(
        (row) =>
          typeof row.stats.highestScore === "number" &&
          Number.isFinite(row.stats.highestScore),
      ),
    [orderedStatsRows],
  );

  return (
    <ModalFull title="Stats" onClose={onClose}>
      <ScrollView
        contentContainerStyle={modalStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats for ALL games */}
        <View style={styles.gameStats}>
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeaderRow}>
              <Text size="sm" style={[styles.colTitle, styles.headerText]}>
                Game
              </Text>
              <Text size="sm" style={[styles.colNum, styles.headerText]}>
                Tried
              </Text>
              <Text size="sm" style={[styles.colNum, styles.headerText]}>
                Won
              </Text>
              <Text size="sm" style={[styles.colNum, styles.headerText]}>
                Lost
              </Text>
              <Text size="sm" style={[styles.colRate, styles.headerText]}>
                Win %
              </Text>
              {hasAnyHighestScore && (
                <Text size="sm" style={[styles.colBest, styles.headerText]}>
                  Best
                </Text>
              )}
            </View>

            {/* Rows */}
            {orderedStatsRows.map((row) => (
              <View key={row.path} style={styles.tableRow}>
                <Text size="sm" style={styles.colTitle} numberOfLines={1}>
                  {row.title}
                </Text>
                <Text size="sm" style={styles.colNum}>
                  {row.stats.attempts}
                </Text>
                <Text size="sm" style={styles.colNum}>
                  {row.stats.wins}
                </Text>
                <Text size="sm" style={styles.colNum}>
                  {row.stats.losses}
                </Text>
                <Text size="sm" style={styles.colRate}>
                  {calculateWinRate(row.stats)}
                </Text>
                {hasAnyHighestScore && (
                  <Text size="sm" style={styles.colBest}>
                    {row.stats.highestScore === null
                      ? "-"
                      : row.stats.highestScore}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ModalFull>
  );
};

const styles = StyleSheet.create({
  gameStats: {
    ...flexStyles.colCentered,
    alignItems: "stretch",
    gap: 16,
  },
  table: {
    width: "100%",
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.K700,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    alignItems: "center",
  },
  headerText: {
    color: Colors.K400,
    fontFamily: FontWeight[500],
  },
  colTitle: {
    flex: 3,
    paddingRight: 8,
  },
  colNum: {
    flex: 1.2,
    fontFamily: FontWeight[500],
    textAlign: "right",
  },
  colRate: {
    flex: 1.5,
    fontFamily: FontWeight[500],
    textAlign: "right",
  },
  colBest: {
    flex: 1.4,
    fontFamily: FontWeight[500],
    textAlign: "right",
  },
});
