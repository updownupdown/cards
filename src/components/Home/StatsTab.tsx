import { Text } from "@/components/common/Text";
import { GameUserStats } from "@/components/Home/GameUserStats";
import { HomeCard } from "@/components/Home/HomeCard";
import { HomeSectionTitle } from "@/components/Home/HomeSectionTitle";
import {
  calculateWinRate,
  EMPTY_STATS,
  type GameSettingsMap,
  type GameStats,
} from "@/data/game-menu";
import { GAMES_DATA } from "@/data/games-registry";
import { isGameEnabled } from "@/data/games-data";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import type { IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, HomePadding, rgba } from "@/styles/styles";
import { Link, type Href } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

type StatsTabProps = {
  settingsMap: GameSettingsMap;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
};

type StatsRow = {
  path: string;
  title: string;
  stats: GameStats;
};

type Persona = {
  key: string;
  title: string;
  subtitle: string;
  icon: IconName;
  row: StatsRow;
};

const winRateValue = (stats: GameStats) =>
  stats.attempts > 0 ? stats.wins / stats.attempts : 0;

export function StatsTab({
  settingsMap,
  favorites,
  onToggleFavorite,
  contentPaddingTop,
  contentPaddingBottom,
}: StatsTabProps) {
  const { ui, spacing } = useResponsiveMetrics();
  const { height: viewportHeight } = useViewportDimensions();

  const pageSidePadding = spacing(HomePadding);
  const contentMaxWidth = ui.contentMaxWidth;
  const sectionTopPadding = spacing(14);
  const cardGap = spacing(12);
  const fullStatsMaxHeight = Math.max(spacing(220), viewportHeight * 0.6);

  const orderedStatsRows = useMemo<StatsRow[]>(
    () =>
      Object.entries(GAMES_DATA)
        .filter(([, gameInfo]) => isGameEnabled(gameInfo))
        .map(([path, gameInfo]) => ({
          path,
          title: gameInfo.title,
          stats: settingsMap[path]?.stats ?? EMPTY_STATS,
        }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [settingsMap],
  );

  const playedRows = useMemo(
    () => orderedStatsRows.filter((row) => row.stats.attempts > 0),
    [orderedStatsRows],
  );

  const hasAnyHighestScore = useMemo(
    () =>
      playedRows.some(
        (row) =>
          typeof row.stats.highestScore === "number" &&
          Number.isFinite(row.stats.highestScore),
      ),
    [playedRows],
  );

  const personas = useMemo<Persona[]>(() => {
    if (playedRows.length === 0) {
      return [];
    }

    // The Nemesis: lowest win rate (tie-break: most played).
    const nemesis = [...playedRows].sort(
      (a, b) =>
        winRateValue(a.stats) - winRateValue(b.stats) ||
        b.stats.attempts - a.stats.attempts,
    )[0];

    // The Comfort Pick: highest win rate (tie-break: most played).
    const comfort = [...playedRows].sort(
      (a, b) =>
        winRateValue(b.stats) - winRateValue(a.stats) ||
        b.stats.attempts - a.stats.attempts,
    )[0];

    // The White Whale: most attempts with zero wins.
    const whale = [...playedRows]
      .filter((row) => row.stats.wins === 0)
      .sort((a, b) => b.stats.attempts - a.stats.attempts)[0];

    // The Underdog: rarely played but often won (high win rate, low attempts).
    const underdog = [...playedRows]
      .filter((row) => row.stats.wins > 0)
      .sort(
        (a, b) =>
          winRateValue(b.stats) / b.stats.attempts -
          winRateValue(a.stats) / a.stats.attempts,
      )[0];

    const entries: Persona[] = [];
    const push = (
      key: string,
      title: string,
      subtitle: string,
      icon: IconName,
      row: StatsRow | undefined,
    ) => {
      if (row) {
        entries.push({ key, title: title, subtitle, icon, row });
      }
    };

    push("nemesis", "The Nemesis", "Lowest win rate", "skull", nemesis);
    push("comfort", "The Comfort Pick", "Highest win rate", "heart", comfort);
    push(
      "whale",
      "The White Whale",
      "Most attempts with zero wins",
      "whale",
      whale,
    );
    push(
      "underdog",
      "The Underdog",
      "High win rate, low attempts",
      "dice",
      underdog,
    );

    return entries;
  }, [playedRows]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
        gap: spacing(40),
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Full stats table */}
      <View
        style={{
          width: "100%",
          maxWidth: contentMaxWidth,
          alignSelf: "center",
          gap: sectionTopPadding,
        }}
      >
        <HomeSectionTitle
          title="Full Stats"
          subtitle={
            playedRows.length === 0
              ? "No stats to show"
              : "Only played games are shown"
          }
          iconName="chart"
          pageSidePadding={pageSidePadding}
          contentMaxWidth={contentMaxWidth}
        />

        <View
          style={{
            paddingHorizontal: pageSidePadding,
            gap: sectionTopPadding,
          }}
        >
          {playedRows.length > 0 && (
            <ScrollView
              style={{ maxHeight: fullStatsMaxHeight }}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
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
                {playedRows.map((row) => (
                  <View key={row.path} style={styles.tableRow}>
                    <Link href={row.path as Href} asChild>
                      <Text
                        size="sm"
                        weight={500}
                        color={Colors.accentBlue}
                        style={StyleSheet.flatten([styles.colTitle])}
                        numberOfLines={1}
                      >
                        {row.title}
                      </Text>
                    </Link>
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
            </ScrollView>
          )}
        </View>
      </View>

      {/* Persona award sections */}
      {personas.map((persona) => {
        const game = GAMES_DATA[persona.row.path];
        if (!game) return null;

        return (
          <View
            key={persona.key}
            style={{
              width: "100%",
              maxWidth: contentMaxWidth,
              alignSelf: "center",
            }}
          >
            <HomeSectionTitle
              title={persona.title}
              subtitle={persona.subtitle}
              iconName={persona.icon}
              pageSidePadding={pageSidePadding}
              contentMaxWidth={contentMaxWidth}
            />

            <View
              style={{
                width: "100%",
                paddingHorizontal: pageSidePadding,
                paddingTop: sectionTopPadding,
              }}
            >
              {/* Card and stats wrap */}
              <View
                style={{
                  width: "100%",
                  borderRadius: spacing(10),
                  backgroundColor: rgba(Colors.K950, 0.4),
                }}
              >
                <HomeCard
                  path={persona.row.path}
                  game={game}
                  size="large"
                  onToggleFavorite={onToggleFavorite}
                  isFavorite={favorites.has(persona.row.path)}
                  style={{ width: "100%" }}
                />

                <GameUserStats
                  stats={persona.row.stats}
                  accentColor={game.cardColorText}
                />
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    ...flexStyles.rowCentered,
    justifyContent: "flex-start",
    paddingVertical: 6,
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
