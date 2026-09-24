import { Text } from "@/components/common/Text";
import { GameUserStats } from "@/components/Home/GameUserStats";
import { HomeCard } from "@/components/Home/HomeCard";
import { HomeSectionTitle } from "@/components/Home/HomeSectionTitle";
import {
  calculateWinRate,
  formatPlayTime,
  getGameSettings,
  EMPTY_STATS,
  type GameSettingsMap,
  type GameStats,
} from "@/data/game-menu";
import { isGameEnabled } from "@/data/games-data";
import { GAMES_DATA } from "@/data/games-registry";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { formatPercent } from "@/i18n/format";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba, layoutDims } from "@/styles/styles";
import { Link, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

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
  row: StatsRow;
};

type StatsColumn = "game" | "won" | "lost" | "winPercent" | "best" | "time";

type SortKey =
  | "title"
  | "attempts"
  | "wins"
  | "losses"
  | "winRate"
  | "best"
  | "time";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

const winRateValue = (stats: GameStats) => {
  return stats.wins > 0 && stats.losses > 0
    ? stats.wins / (stats.wins + stats.losses)
    : null;
};

const gameTitleFlex = 2.4;

export function StatsTab({
  settingsMap,
  favorites,
  onToggleFavorite,
  contentPaddingTop,
  contentPaddingBottom,
}: StatsTabProps) {
  const [sortState, setSortState] = useState<SortState>({
    key: "title",
    direction: "asc",
  });
  const { ui, spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const { height: viewportHeight } = useViewportDimensions();

  const scaledPageSidePadding = spacing(layoutDims.pagePadding);
  const contentMaxWidth = ui.contentMaxWidth;
  const sectionTopPadding = spacing(14);
  const fullStatsMaxHeight = Math.max(spacing(220), viewportHeight * 0.6);

  const orderedStatsRows = useMemo<StatsRow[]>(
    () =>
      Object.entries(GAMES_DATA)
        .filter(([, gameInfo]) => isGameEnabled(gameInfo))
        .map(([path, gameInfo]) => ({
          path,
          title: localizeGameTitle(gameInfo, path, language),
          // Stored entries omit default values (and stats added later, like
          // fastestTimeMs), so normalize them before display.
          stats: settingsMap[path]
            ? getGameSettings(settingsMap, path).stats
            : EMPTY_STATS,
        }))
        .sort((a, b) => a.title.localeCompare(b.title, language)),
    [language, settingsMap],
  );

  const playedRows = useMemo(
    () => orderedStatsRows.filter((row) => row.stats.attempts > 0),
    [orderedStatsRows],
  );

  const sortedPlayedRows = useMemo(() => {
    const directionMultiplier = sortState.direction === "asc" ? 1 : -1;

    return [...playedRows].sort((left, right) => {
      const comparison = (() => {
        switch (sortState.key) {
          case "title":
            return left.title.localeCompare(right.title);
          case "attempts":
            return left.stats.attempts - right.stats.attempts;
          case "wins":
            return left.stats.wins - right.stats.wins;
          case "losses":
            return left.stats.losses - right.stats.losses;
          case "winRate":
            return (
              (winRateValue(left.stats) ?? 0) - (winRateValue(right.stats) ?? 0)
            );
          case "best":
            return (
              (left.stats.highestScore ?? 0) - (right.stats.highestScore ?? 0)
            );
          case "time": {
            // Games without a timed win sort after those with one.
            const leftTime = left.stats.fastestTimeMs;
            const rightTime = right.stats.fastestTimeMs;
            if (leftTime == null || rightTime == null) {
              if (leftTime == null && rightTime == null) return 0;
              return leftTime == null ? 1 : -1;
            }
            return leftTime - rightTime;
          }
        }
      })();

      if (comparison !== 0) {
        return comparison * directionMultiplier;
      }

      return left.title.localeCompare(right.title);
    });
  }, [playedRows, sortState]);

  const totals = useMemo(() => {
    return playedRows.reduce(
      (acc, row) => {
        acc.wins += row.stats.wins;
        acc.losses += row.stats.losses;
        acc.attempts += row.stats.attempts;

        return acc;
      },
      {
        wins: 0,
        losses: 0,
        attempts: 0,
        best: null as number | null,
      },
    );
  }, [playedRows]);

  const personas = useMemo<Persona[]>(() => {
    if (playedRows.length === 0) {
      return [];
    }

    // The Nemesis: lowest win rate (tie-break: most played).
    const nemesis = [...playedRows].sort(
      (a, b) =>
        (winRateValue(a.stats) ?? 0) - (winRateValue(b.stats) ?? 0) ||
        b.stats.attempts - a.stats.attempts,
    )[0];

    // The Comfort Pick: highest win rate (tie-break: most played).
    const comfort = [...playedRows].sort(
      (a, b) =>
        (winRateValue(b.stats) ?? 0) - (winRateValue(a.stats) ?? 0) ||
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
          (winRateValue(b.stats) ?? 0) / b.stats.attempts -
          (winRateValue(a.stats) ?? 0) / a.stats.attempts,
      )[0];

    const entries: Persona[] = [];
    const push = (
      key: string,
      title: string,
      subtitle: string,
      row: StatsRow | undefined,
    ) => {
      if (row) {
        entries.push({ key, title: title, subtitle, row });
      }
    };

    push(
      "nemesis",
      t("statsTab.personas.nemesis.title"),
      t("statsTab.personas.nemesis.subtitle"),
      nemesis,
    );
    push(
      "comfort",
      t("statsTab.personas.comfort.title"),
      t("statsTab.personas.comfort.subtitle"),
      comfort,
    );
    push(
      "whale",
      t("statsTab.personas.whale.title"),
      t("statsTab.personas.whale.subtitle"),
      whale,
    );
    push(
      "underdog",
      t("statsTab.personas.underdog.title"),
      t("statsTab.personas.underdog.subtitle"),
      underdog,
    );

    return entries;
  }, [playedRows, t]);

  const toggleSort = (key: SortKey) => {
    setSortState((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: key === "title" ? "asc" : "desc",
      };
    });
  };

  // Headers are abbreviated to fit their columns; screen readers get the
  // full column name.
  const renderSortableHeader = (column: StatsColumn, key: SortKey) => {
    const label = t(`statsTab.columns.${column}`);
    const isActive = sortState.key === key;
    const iconName =
      sortState.direction === "asc" ? "expand-less" : "expand-more";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("statsTab.sortBy", {
          column: t(`statsTab.columnNames.${column}`),
        })}
        key={key}
        onPress={() => toggleSort(key)}
        style={[
          flexStyles.rowCentered,
          {
            flexDirection: key === "title" ? "row-reverse" : "row",
            justifyContent: "flex-end",
            gap: 2,
            flex: key === "title" ? gameTitleFlex : 1,
            outline: "none",
          },
        ]}
      >
        {isActive ? (
          <Icon name={iconName} size={14} color={Colors.white} />
        ) : null}

        <Text
          size="sm"
          weight={500}
          numberOfLines={1}
          style={[
            {
              color: isActive ? Colors.white : Colors.K400,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom * 1.4,
        gap: spacing(40),
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* No stats to show */}
      {playedRows.length === 0 && (
        <View
          style={[
            flexStyles.colCentered,
            {
              gap: spacing(20),
              maxWidth: contentMaxWidth / 1.5,
              minHeight:
                viewportHeight - contentPaddingTop - contentPaddingBottom,
              flex: 1,
              alignSelf: "center",
            },
          ]}
        >
          <Text
            size="xl"
            style={[
              flexStyles.colCentered,
              {
                textAlign: "center",
              },
            ]}
          >
            {t("statsTab.empty.title")}
          </Text>
          <Text
            color={Colors.K400}
            style={[
              flexStyles.colCentered,
              {
                textAlign: "center",
              },
            ]}
          >
            {t("statsTab.empty.body")}
          </Text>
        </View>
      )}

      {/* Full stats table */}
      {playedRows.length > 0 && (
        <View
          style={{
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: scaledPageSidePadding,
            paddingTop: sectionTopPadding,
          }}
        >
          <View
            style={{
              width: "100%",
              gap: sectionTopPadding,
              borderWidth: 1,
              borderColor: Colors.K800,
              backgroundColor: Colors.K875,
              paddingVertical: spacing(12),
              borderRadius: spacing(12),
              boxShadow: `inset 0 0  ${spacing(18)}px ${rgba(Colors.black, 0.25)}, 0 0 ${spacing(12)}px ${rgba(Colors.K400, 0.1)}`,
            }}
          >
            <HomeSectionTitle
              title={t("statsTab.fullStats.title")}
              subtitle={
                playedRows.length === 0
                  ? t("statsTab.fullStats.noStats")
                  : t("statsTab.fullStats.onlyPlayed")
              }
              iconName="chart"
              pageSidePadding={scaledPageSidePadding}
              contentMaxWidth={contentMaxWidth}
            />

            <View
              style={{
                paddingHorizontal: scaledPageSidePadding,
                gap: sectionTopPadding,
              }}
            >
              {playedRows.length > 0 && (
                <View style={[flexStyles.fullWidth]}>
                  {/* Header, outside the scrolling rows so it stays
                        visible on every platform (position:sticky only works
                        on web) */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingBottom: 8,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: Colors.K750,
                      marginBottom: 8,
                      backgroundColor: Colors.K875,
                    }}
                  >
                    {renderSortableHeader("game", "title")}
                    {renderSortableHeader("won", "wins")}
                    {renderSortableHeader("lost", "losses")}
                    {renderSortableHeader("winPercent", "winRate")}
                    {renderSortableHeader("best", "best")}
                    {renderSortableHeader("time", "time")}
                  </View>

                  <ScrollView
                    style={{ maxHeight: fullStatsMaxHeight }}
                    showsVerticalScrollIndicator
                    nestedScrollEnabled
                  >
                    {/* Rows */}
                    {sortedPlayedRows.map((row, index) => (
                      <View
                        key={row.path}
                        style={[
                          flexStyles.rowCentered,
                          {
                            position: "relative",
                            zIndex: 1,
                            justifyContent: "flex-start",
                            paddingVertical: 8,
                            marginBottom:
                              index === sortedPlayedRows.length - 1
                                ? spacing(20)
                                : 0,
                          },
                        ]}
                      >
                        <Link href={row.path as Href} asChild>
                          <Text
                            size="sm"
                            weight={500}
                            color={Colors.accentBlue}
                            style={{ flex: gameTitleFlex }}
                            numberOfLines={1}
                          >
                            {row.title}
                          </Text>
                        </Link>
                        <Text
                          size="xs"
                          weight={500}
                          style={{ flex: 1, textAlign: "right" }}
                          color={
                            row.stats.wins === 0 ? Colors.K700 : Colors.K200
                          }
                        >
                          {row.stats.wins}
                        </Text>
                        <Text
                          size="xs"
                          weight={500}
                          style={{ flex: 1, textAlign: "right" }}
                          color={
                            row.stats.losses === 0 ? Colors.K700 : Colors.K200
                          }
                        >
                          {row.stats.losses}
                        </Text>
                        <Text
                          size="xs"
                          weight={500}
                          style={{ flex: 1, textAlign: "right" }}
                          color={
                            row.stats.wins === 0 && row.stats.losses === 0
                              ? Colors.K700
                              : Colors.K200
                          }
                        >
                          {calculateWinRate(row.stats)}
                        </Text>
                        <Text
                          size="xs"
                          weight={500}
                          style={{ flex: 1, textAlign: "right" }}
                          color={
                            row.stats.highestScore === null
                              ? Colors.K700
                              : Colors.K200
                          }
                        >
                          {row.stats.highestScore === null
                            ? "-"
                            : row.stats.highestScore.toLocaleString(language)}
                        </Text>
                        <Text
                          size="xs"
                          weight={500}
                          style={{ flex: 1, textAlign: "right" }}
                          color={
                            row.stats.fastestTimeMs == null
                              ? Colors.K700
                              : Colors.K200
                          }
                        >
                          {row.stats.fastestTimeMs == null
                            ? "-"
                            : formatPlayTime(row.stats.fastestTimeMs)}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Total row, below the scrolling rows */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingTop: 8,
                      paddingBottom: 8,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: Colors.K750,
                      marginTop: 8,
                      backgroundColor: Colors.K875,
                    }}
                  >
                    <Text
                      size="sm"
                      weight={600}
                      style={{ flex: gameTitleFlex }}
                    >
                      {t("statsTab.total")}
                    </Text>
                    <Text
                      size="sm"
                      weight={600}
                      style={{ flex: 1, textAlign: "right" }}
                      color={totals.wins === 0 ? Colors.K700 : Colors.K200}
                    >
                      {totals.wins}
                    </Text>
                    <Text
                      size="sm"
                      weight={600}
                      style={{ flex: 1, textAlign: "right" }}
                      color={totals.losses === 0 ? Colors.K700 : Colors.K200}
                    >
                      {totals.losses}
                    </Text>
                    <Text
                      size="sm"
                      weight={600}
                      style={{ flex: 1, textAlign: "right" }}
                      color={totals.attempts === 0 ? Colors.K700 : Colors.K200}
                    >
                      {totals.wins > 0 && totals.losses > 0
                        ? formatPercent(
                            totals.wins / (totals.wins + totals.losses),
                          )
                        : "-"}
                    </Text>
                    <Text
                      size="sm"
                      weight={600}
                      style={{ flex: 1, textAlign: "right" }}
                      color={totals.best === null ? Colors.K700 : Colors.K200}
                    >
                      {totals.best === null ? "-" : totals.best.toLocaleString(language)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

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
              paddingHorizontal: scaledPageSidePadding,
              paddingTop: sectionTopPadding,
            }}
          >
            {/* Card and stats wrap */}
            <View
              style={{
                width: "100%",
                borderRadius: spacing(10),
                padding: spacing(8),
                gap: spacing(8),
                backgroundColor: rgba(game.gameColorDark, 0.4),
                boxShadow: `inset 0 0 0 ${spacing(1)}px  ${rgba(game.gameColorPale, 0.15)}, ${spacing(1)}px ${spacing(2)}px ${spacing(12)}px ${rgba(Colors.black, 0.2)}`,
              }}
            >
              <HomeSectionTitle
                title={persona.title}
                subtitle={persona.subtitle}
                pageSidePadding={spacing(12)}
                contentMaxWidth={contentMaxWidth}
              />

              <HomeCard
                path={persona.row.path}
                game={game}
                size="large"
                onToggleFavorite={onToggleFavorite}
                isFavorite={favorites.has(persona.row.path)}
              />

              <GameUserStats
                stats={persona.row.stats}
                showFastestTime
                accentColor={game.gameColorPale}
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
