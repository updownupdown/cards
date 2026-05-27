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
import { homeStyles } from "@/styles/homeStyles";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";

export const StatsTab = () => {
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
    <ScrollView
      contentContainerStyle={homeStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Stats for ALL games */}
      <View style={styles.gameStats}>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeaderRow}>
            <Text
              style={[textStyles.default, styles.colTitle, styles.headerText]}
            >
              Game
            </Text>
            <Text
              style={[textStyles.default, styles.colNum, styles.headerText]}
            >
              Att
            </Text>
            <Text
              style={[textStyles.default, styles.colNum, styles.headerText]}
            >
              Win
            </Text>
            <Text
              style={[textStyles.default, styles.colNum, styles.headerText]}
            >
              Loss
            </Text>
            <Text
              style={[textStyles.default, styles.colRate, styles.headerText]}
            >
              Win %
            </Text>
          </View>

          {/* Rows */}
          {orderedStatsRows.map((row) => (
            <View key={row.path} style={styles.tableRow}>
              <Text
                style={[textStyles.default, styles.colTitle]}
                numberOfLines={1}
              >
                {row.title}
              </Text>
              <Text style={[textStyles.default, styles.colNum]}>
                {row.stats.attempts}
              </Text>
              <Text style={[textStyles.default, styles.colNum]}>
                {row.stats.wins}
              </Text>
              <Text style={[textStyles.default, styles.colNum]}>
                {row.stats.losses}
              </Text>
              <Text style={[textStyles.default, styles.colRate]}>
                {calculateWinRate(row.stats)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  gameStats: {
    ...flexStyles.colCentered,
    alignItems: "stretch",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
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
    fontWeight: "bold",
  },
  colTitle: {
    flex: 3,
    paddingRight: 8,
  },
  colNum: {
    flex: 1.2,
    textAlign: "right",
  },
  colRate: {
    flex: 1.5,
    textAlign: "right",
  },
});
