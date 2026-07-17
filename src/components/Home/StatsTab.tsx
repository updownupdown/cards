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
import { isGameEnabled } from "@/data/games-data";
import { GAMES_DATA } from "@/data/games-registry";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import type { IconName } from "@/icons";
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
  icon: IconName;
  row: StatsRow;
};

type SortKey = "title" | "attempts" | "wins" | "losses" | "winRate" | "best";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

const winRateValue = (stats: GameStats) =>
  stats.attempts > 0 ? stats.wins / stats.attempts : 0;

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
            return winRateValue(left.stats) - winRateValue(right.stats);
          case "best":
            return (
              (left.stats.highestScore ?? 0) - (right.stats.highestScore ?? 0)
            );
        }
      })();

      if (comparison !== 0) {
        return comparison * directionMultiplier;
      }

      return left.title.localeCompare(right.title);
    });
  }, [playedRows, sortState]);

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
      "Most attempts without wins",
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

  const renderSortableHeader = (label: string, key: SortKey) => {
    const isActive = sortState.key === key;
    const iconName =
      sortState.direction === "asc" ? "expand-less" : "expand-more";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${label}`}
        key={key}
        onPress={() => toggleSort(key)}
        style={[
          flexStyles.rowCentered,
          {
            flexDirection: label === "Game" ? "row-reverse" : "row",
            justifyContent: "flex-end",
            gap: 2,
            flex: label === "Game" ? gameTitleFlex : 1,
            outline: "none",
          },
        ]}
      >
        {isActive ? (
          <Icon name={iconName} size={14} color={Colors.accentGreen} />
        ) : null}

        <Text
          size="sm"
          weight={500}
          style={[
            {
              color: isActive ? Colors.accentGreen : Colors.K400,
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
            <ScrollView
              style={{ maxHeight: fullStatsMaxHeight }}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <View style={[flexStyles.fullWidth]}>
                {/* Header */}
                <View
                  style={{
                    position: "sticky",
                    zIndex: 2,
                    top: 0,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingBottom: 8,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: Colors.K700,
                    marginBottom: 8,
                    backgroundColor: Colors.background,
                  }}
                >
                  {renderSortableHeader("Game", "title")}
                  {renderSortableHeader("Win", "wins")}
                  {renderSortableHeader("Lose", "losses")}
                  {renderSortableHeader("W%", "winRate")}
                  {renderSortableHeader("Best", "best")}
                </View>

                {/* Rows */}
                {sortedPlayedRows.map((row) => (
                  <View
                    key={row.path}
                    style={[
                      flexStyles.rowCentered,
                      {
                        position: "relative",
                        zIndex: 1,
                        justifyContent: "flex-start",
                        paddingVertical: 6,
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
                      size="sm"
                      weight={500}
                      style={{ flex: 1, textAlign: "right" }}
                      color={row.stats.wins === 0 ? Colors.K700 : Colors.K200}
                    >
                      {row.stats.wins}
                    </Text>
                    <Text
                      size="sm"
                      weight={500}
                      style={{ flex: 1, textAlign: "right" }}
                      color={row.stats.losses === 0 ? Colors.K700 : Colors.K200}
                    >
                      {row.stats.losses}
                    </Text>
                    <Text
                      size="sm"
                      weight={500}
                      style={{ flex: 1, textAlign: "right" }}
                      color={
                        row.stats.attempts === 0 ? Colors.K700 : Colors.K200
                      }
                    >
                      {calculateWinRate(row.stats)}
                    </Text>
                    <Text
                      size="sm"
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
                        : row.stats.highestScore}
                    </Text>
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
                backgroundColor: rgba(Colors.K950, 0.4),
                boxShadow: `inset 0 0 20px ${rgba(Colors.black, 0.2)}`,
              }}
            >
              <HomeSectionTitle
                title={persona.title}
                subtitle={persona.subtitle}
                iconName={persona.icon}
                pageSidePadding={spacing(4)}
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
                accentColor={game.cardColorText}
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
