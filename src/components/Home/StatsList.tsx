import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Button } from "@/components/Button/Button";
import { getScaledTextSize, Text } from "@/components/common/Text";
import { HomeCard } from "@/components/Home/HomeCard";
import {
  formatPlayTime,
  getGameSettings,
  EMPTY_STATS,
  type GameSettingsMap,
  type GameStats,
} from "@/data/game-menu";
import { isGameEnabled, type GameMenuInfo } from "@/data/games-data";
import { GAMES_DATA } from "@/data/games-registry";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { formatPercent } from "@/i18n/format";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba, layoutDims } from "@/styles/styles";
import { type Href } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

type StatsListProps = {
  settingsMap: GameSettingsMap;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  /** Called after a game is launched, so the modal can close. */
  onOpenGame?: () => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
};

export type StatsRow = {
  path: string;
  title: string;
  stats: GameStats;
};

type PersonaKey =
  "comfort" | "nemesis" | "whale" | "faithful" | "rivalry" | "natural";

export type Persona = {
  key: PersonaKey;
  row: StatsRow;
};

type StatsColumn = "game" | "won" | "lost" | "winPercent" | "best" | "time";

type SortKey = "title" | "wins" | "losses" | "winRate" | "best" | "time";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

// Win rate based awards need this many wins, so one lucky or unlucky game
// can't decide them.
export const PERSONA_MIN_WINS = 3;
// The White Whale needs this many losses.
const WHALE_MIN_LOSSES = 3;
// How far from 50% a game can be and still count as a rivalry.
const RIVALRY_MAX_SPREAD = 0.1;
// Below these screen widths, award cards get narrower so their stats aren't
// cut off, and the headline stats become a 2x2 grid.
export const NARROW_AWARD_SCREEN_WIDTH = 380;
export const NARROW_HEADLINE_SCREEN_WIDTH = 360;

const winRateValue = (stats: GameStats) => {
  const decided = stats.wins + stats.losses;
  return decided > 0 ? stats.wins / decided : null;
};

const formatWinRate = (wins: number, losses: number) =>
  wins + losses > 0 ? formatPercent(wins / (wins + losses)) : "-";

// Win rate colours, from 0% through 50% to 100%.
const WIN_RATE_COLORS = [
  Colors.cardSelectRed,
  Colors.cardSelectYellow,
  Colors.cardSelectGreen,
] as const;

const mixHexColors = (from: string, to: string, amount: number) => {
  const channel = (hex: string, index: number) =>
    parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  return `#${[0, 1, 2]
    .map((index) =>
      Math.round(
        channel(from, index) +
          (channel(to, index) - channel(from, index)) * amount,
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};

/** Red at 0%, yellow at 50%, green at 100%; dim when nothing was decided. */
export const winRateColor = (wins: number, losses: number) => {
  if (wins + losses === 0) return Colors.K700;
  const rate = wins / (wins + losses);
  return rate < 0.5
    ? mixHexColors(WIN_RATE_COLORS[0], WIN_RATE_COLORS[1], rate * 2)
    : mixHexColors(WIN_RATE_COLORS[1], WIN_RATE_COLORS[2], rate * 2 - 1);
};

/** Rows with no value sort last in either direction. */
const compareNullable = (
  left: number | null,
  right: number | null,
  directionMultiplier: number,
) => {
  if (left == null || right == null) {
    if (left == null && right == null) return 0;
    return left == null ? 1 : -1;
  }
  return (left - right) * directionMultiplier;
};

/** The first row by `compare`, or undefined when there are none. */
const best = (
  rows: StatsRow[],
  compare: (a: StatsRow, b: StatsRow) => number,
) => [...rows].sort(compare)[0] as StatsRow | undefined;

/**
 * Picks each award's game. Awards are decided in order, and a game can only
 * win one. When an award's top game has already won an earlier award, the
 * award is skipped instead of going to the runner-up, so every subtitle stays
 * true.
 */
export function pickPersonas(playedRows: StatsRow[]): Persona[] {
  const rate = (row: StatsRow) => winRateValue(row.stats) ?? 0;
  const winners = playedRows.filter(
    (row) => row.stats.wins >= PERSONA_MIN_WINS,
  );
  const maxRate = Math.max(...winners.map(rate));
  const minRate = Math.min(...winners.map(rate));
  // Highest and lowest win rate only mean something with a spread to compare.
  const hasRateSpread = winners.length >= 2 && maxRate > minRate;

  const candidates: [PersonaKey, StatsRow | undefined][] = [
    // Highest win rate (tie-break: most wins).
    [
      "comfort",
      hasRateSpread
        ? best(
            winners,
            (a, b) => rate(b) - rate(a) || b.stats.wins - a.stats.wins,
          )
        : undefined,
    ],
    // Lowest win rate (tie-break: most losses).
    [
      "nemesis",
      hasRateSpread
        ? best(
            winners,
            (a, b) => rate(a) - rate(b) || b.stats.losses - a.stats.losses,
          )
        : undefined,
    ],
    // Most plays without a single win.
    [
      "whale",
      best(
        playedRows.filter(
          (row) => row.stats.wins === 0 && row.stats.losses >= WHALE_MIN_LOSSES,
        ),
        (a, b) =>
          b.stats.attempts - a.stats.attempts ||
          b.stats.losses - a.stats.losses,
      ),
    ],
    // Most played (tie-break: most wins).
    [
      "faithful",
      playedRows.length >= 2
        ? best(
            playedRows,
            (a, b) =>
              b.stats.attempts - a.stats.attempts ||
              b.stats.wins - a.stats.wins,
          )
        : undefined,
    ],
    // Closest to an even split (tie-break: most games decided).
    [
      "rivalry",
      best(
        winners.filter(
          (row) =>
            row.stats.losses >= PERSONA_MIN_WINS &&
            Math.abs(rate(row) - 0.5) <= RIVALRY_MAX_SPREAD,
        ),
        (a, b) =>
          Math.abs(rate(a) - 0.5) - Math.abs(rate(b) - 0.5) ||
          b.stats.wins + b.stats.losses - (a.stats.wins + a.stats.losses),
      ),
    ],
    // Fewest plays among games won 3+ times (tie-break: highest win rate).
    [
      "natural",
      best(
        winners,
        (a, b) => a.stats.attempts - b.stats.attempts || rate(b) - rate(a),
      ),
    ],
  ];

  const taken = new Set<string>();
  const personas: Persona[] = [];
  for (const [key, row] of candidates) {
    if (!row || taken.has(row.path)) continue;
    taken.add(row.path);
    personas.push({ key, row });
  }
  return personas;
}

const gameTitleFlex = 2.4;

export function StatsList({
  settingsMap,
  favorites,
  onToggleFavorite,
  onOpenGame,
  contentPaddingTop,
  contentPaddingBottom,
}: StatsListProps) {
  const [sortState, setSortState] = useState<SortState>({
    key: "title",
    direction: "asc",
  });
  const [showTopButton, setShowTopButton] = useState(false);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);
  // Where the table header sits in the scroll content; it's stuck once the
  // scroll passes it.
  const tableHeaderY = useRef<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const { ui, spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const { width: viewportWidth, height: viewportHeight } =
    useViewportDimensions();
  const isHeadlineGrid = viewportWidth < NARROW_HEADLINE_SCREEN_WIDTH;
  const awardCardWidth = spacing(
    viewportWidth < NARROW_AWARD_SCREEN_WIDTH ? 135 : 161,
  );

  const scaledPageSidePadding = spacing(layoutDims.pagePadding);
  const contentMaxWidth = ui.contentMaxWidth;
  const sectionGap = spacing(28);
  const topButtonThreshold = spacing(200);

  const openGame = (path: string) => {
    launchGame(path as Href);
    onOpenGame?.();
  };

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
    const byTitle = (left: StatsRow, right: StatsRow) =>
      left.title.localeCompare(right.title, language);

    return [...playedRows].sort((left, right) => {
      const comparison = (() => {
        switch (sortState.key) {
          case "title":
            return byTitle(left, right) * directionMultiplier;
          case "wins":
            return (left.stats.wins - right.stats.wins) * directionMultiplier;
          case "losses":
            return (
              (left.stats.losses - right.stats.losses) * directionMultiplier
            );
          case "winRate":
            return compareNullable(
              winRateValue(left.stats),
              winRateValue(right.stats),
              directionMultiplier,
            );
          case "best":
            return compareNullable(
              left.stats.highestScore,
              right.stats.highestScore,
              directionMultiplier,
            );
          case "time":
            return compareNullable(
              left.stats.fastestTimeMs,
              right.stats.fastestTimeMs,
              directionMultiplier,
            );
        }
      })();

      return comparison !== 0 ? comparison : byTitle(left, right);
    });
  }, [language, playedRows, sortState]);

  const totals = useMemo(
    () =>
      playedRows.reduce(
        (acc, row) => {
          acc.wins += row.stats.wins;
          acc.losses += row.stats.losses;
          acc.attempts += row.stats.attempts;
          return acc;
        },
        { wins: 0, losses: 0, attempts: 0 },
      ),
    [playedRows],
  );

  const personas = useMemo(() => pickPersonas(playedRows), [playedRows]);

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

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setShowTopButton(scrollY > topButtonThreshold);
    setIsHeaderStuck(
      tableHeaderY.current !== null && scrollY > tableHeaderY.current,
    );
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
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

  const sectionStyle = {
    width: "100%",
    maxWidth: contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: scaledPageSidePadding,
  } as const;

  // No stats to show
  if (playedRows.length === 0) {
    return (
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
        <Text size="xl" style={{ textAlign: "center" }}>
          {t("statsTab.empty.title")}
        </Text>
        <Text color={Colors.K400} style={{ textAlign: "center" }}>
          {t("statsTab.empty.body")}
        </Text>
      </View>
    );
  }

  const headline = (
    <View
      key="headline"
      style={[
        sectionStyle,
        {
          flexDirection: "row",
          flexWrap: isHeadlineGrid ? "wrap" : "nowrap",
          columnGap: isHeadlineGrid ? 0 : spacing(8),
          rowGap: spacing(16),
          marginBottom: sectionGap,
        },
      ]}
    >
      <HeadlineStat
        isGrid={isHeadlineGrid}
        iconName="play-hand"
        label={t("statsTab.headline.played")}
        value={totals.attempts.toLocaleString(language)}
      />
      <HeadlineStat
        isGrid={isHeadlineGrid}
        iconName="star"
        label={t("statsTab.headline.won")}
        value={totals.wins.toLocaleString(language)}
      />
      <HeadlineStat
        isGrid={isHeadlineGrid}
        iconName="chart"
        label={t("statsTab.headline.winRate")}
        value={formatWinRate(totals.wins, totals.losses)}
      />
      <HeadlineStat
        isGrid={isHeadlineGrid}
        iconName="games"
        label={t("statsTab.headline.tried")}
        value={`${playedRows.length.toLocaleString(language)}/${orderedStatsRows.length.toLocaleString(language)}`}
      />
    </View>
  );

  const awards =
    personas.length > 0 ? (
      <View key="awards" style={[sectionStyle, { marginBottom: sectionGap }]}>
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(10) }}
        >
          {personas.map((persona) => {
            const game = GAMES_DATA[persona.row.path];
            if (!game) return null;

            return (
              <PersonaCard
                key={persona.key}
                title={t(`statsTab.personas.${persona.key}.title`)}
                subtitle={t(`statsTab.personas.${persona.key}.subtitle`)}
                row={persona.row}
                game={game}
                isFavorite={favorites.has(persona.row.path)}
                onToggleFavorite={onToggleFavorite}
                onOpenGame={onOpenGame}
                cardWidth={awardCardWidth}
              />
            );
          })}
        </View>
      </View>
    ) : null;

  // Sticks to the top of the modal while the rows scroll under it, so it
  // needs a solid background.
  const tableHeader = (
    <View
      key="tableHeader"
      onLayout={(event) => {
        tableHeaderY.current = event.nativeEvent.layout.y;
      }}
      style={{
        backgroundColor: Colors.K875,
        // Only while pinned, to show the rows are scrolling underneath.
        boxShadow: isHeaderStuck
          ? `0 ${spacing(6)}px ${spacing(8)}px -${spacing(4)}px ${rgba(Colors.black, 0.1875)}`
          : undefined,
      }}
    >
      <View
        style={[
          sectionStyle,
          {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 8,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: Colors.K750,
          },
        ]}
      >
        {renderSortableHeader("game", "title")}
        {renderSortableHeader("won", "wins")}
        {renderSortableHeader("lost", "losses")}
        {renderSortableHeader("winPercent", "winRate")}
        {renderSortableHeader("best", "best")}
        {renderSortableHeader("time", "time")}
      </View>
    </View>
  );

  const tableBody = (
    <View key="tableBody" style={[sectionStyle, { paddingTop: 4 }]}>
      {sortedPlayedRows.map((row) => (
        <Pressable
          key={row.path}
          accessibilityRole="link"
          accessibilityLabel={row.title}
          onPress={() => openGame(row.path)}
          style={({ pressed }) => [
            flexStyles.rowCentered,
            {
              justifyContent: "flex-start",
              paddingVertical: 8,
              marginHorizontal: -spacing(6),
              paddingHorizontal: spacing(6),
              borderRadius: spacing(6),
              backgroundColor: pressed
                ? rgba(Colors.white, 0.06)
                : "transparent",
              outline: "none",
            },
          ]}
        >
          <Text
            size="sm"
            weight={500}
            color={Colors.white}
            style={{ flex: gameTitleFlex }}
            numberOfLines={1}
          >
            {row.title}
          </Text>
          <StatCell value={row.stats.wins} />
          <StatCell value={row.stats.losses} />
          <StatCell
            value={formatWinRate(row.stats.wins, row.stats.losses)}
            color={winRateColor(row.stats.wins, row.stats.losses)}
          />
          <StatCell value={row.stats.highestScore?.toLocaleString(language)} />
          <StatCell
            value={
              row.stats.fastestTimeMs == null
                ? null
                : formatPlayTime(row.stats.fastestTimeMs)
            }
          />
        </Pressable>
      ))}

      {/* Total row. Best score and fastest time are per game, so they have
          no total. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 8,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Colors.K750,
          marginTop: 4,
        }}
      >
        <Text size="sm" weight={600} style={{ flex: gameTitleFlex }}>
          {t("statsTab.total")}
        </Text>
        <StatCell isTotal value={totals.wins} />
        <StatCell isTotal value={totals.losses} />
        <StatCell
          isTotal
          value={formatWinRate(totals.wins, totals.losses)}
          color={winRateColor(totals.wins, totals.losses)}
        />
        <View style={{ flex: 1 }} />
        <View style={{ flex: 1 }} />
      </View>
    </View>
  );

  // Sticky headers are found by child index, so leave out missing sections
  // rather than rendering null in their place.
  const sections = [headline, awards, tableHeader, tableBody].filter(
    (section) => section !== null,
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom * 1.4,
        }}
        stickyHeaderIndices={[sections.indexOf(tableHeader)]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {sections}
      </ScrollView>

      {showTopButton && (
        <View
          style={{
            position: "absolute",
            left: scaledPageSidePadding,
            bottom: spacing(16),
          }}
        >
          <Button
            accessibilityLabel={t("statsTab.backToTop")}
            text={t("statsTab.top")}
            iconName="arrow-up"
            size="md"
            theme={Colors.K750}
            onPress={scrollToTop}
          />
        </View>
      )}
    </View>
  );
}

/** A right-aligned table cell, dimmed when it is empty or zero. */
function StatCell({
  value,
  isTotal,
  color = Colors.K200,
}: {
  value: string | number | null | undefined;
  isTotal?: boolean;
  color?: string;
}) {
  const isEmpty = value == null || value === 0 || value === "-";

  return (
    <Text
      size={isTotal ? "sm" : "xs"}
      weight={isTotal ? 600 : 500}
      style={{ flex: 1, textAlign: "right" }}
      color={isEmpty ? Colors.K700 : color}
      numberOfLines={1}
    >
      {value ?? "-"}
    </Text>
  );
}

function HeadlineStat({
  iconName,
  label,
  value,
  isGrid,
}: {
  iconName: IconName;
  label: string;
  value: string;
  /** Half width, for the 2x2 grid on narrow screens. */
  isGrid: boolean;
}) {
  const { spacing, textScale } = useResponsiveMetrics();
  const labelSize = getScaledTextSize("xxs", textScale) * 1.25;
  const labelLineHeight = labelSize * 1.2;

  return (
    <View
      style={[
        flexStyles.colCentered,
        { minWidth: 0, gap: spacing(4) },
        isGrid ? { width: "50%" } : { flex: 1 },
      ]}
    >
      <Icon name={iconName} size={spacing(33)} color={Colors.suitsRed} shadow />
      <Text size="xl" weight={600} lineHeight={1.1} numberOfLines={1}>
        {value}
      </Text>
      {/* Always two lines, so every label lines up: "games\nplayed". */}
      <Text
        weight={400}
        color={Colors.K400}
        numberOfLines={2}
        style={{
          textAlign: "center",
          fontSize: labelSize,
          lineHeight: labelLineHeight,
          minHeight: labelLineHeight * 2,
        }}
      >
        {label.replace(" ", "\n")}
      </Text>
    </View>
  );
}

function PersonaCard({
  title,
  subtitle,
  row,
  game,
  isFavorite,
  onToggleFavorite,
  onOpenGame,
  cardWidth,
}: {
  title: string;
  subtitle: string;
  row: StatsRow;
  game: GameMenuInfo;
  isFavorite: boolean;
  onToggleFavorite: (path: string) => void;
  onOpenGame?: () => void;
  cardWidth: number;
}) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const labelColor = rgba(game.gameColorPale, 0.6);

  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: spacing(300),
        gap: spacing(12),
        padding: spacing(14.4),
        borderRadius: spacing(10),
        backgroundColor: Colors.K950,
        boxShadow: `0 ${spacing(2)}px ${spacing(10)}px ${rgba(Colors.black, 0.25)}`,
      }}
    >
      {/* Award name and rule */}
      <View style={[flexStyles.rowCentered, { gap: spacing(12) }]}>
        <Text
          size="md"
          weight={600}
          color={Colors.white}
          lineHeight={1.2}
          style={{ marginRight: "auto" }}
        >
          {title}
        </Text>
        <Text
          size="sm"
          weight={300}
          color={Colors.K300}
          lineHeight={1.2}
          style={{ flexShrink: 1, textAlign: "right" }}
        >
          {subtitle}
        </Text>
      </View>

      {/* Game card and stats */}
      <View style={[flexStyles.rowCentered, { gap: spacing(20) }]}>
        <HomeCard
          path={row.path}
          game={game}
          size="medium"
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onOpen={onOpenGame}
          style={{ width: cardWidth, flexShrink: 0 }}
        />
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            flexWrap: "wrap",
            rowGap: spacing(12),
          }}
        >
          <PersonaStat
            label={t("statsTab.columns.played")}
            value={row.stats.attempts}
            color={game.gameColorPale}
            labelColor={labelColor}
          />
          <PersonaStat
            label={t("statsTab.columns.won")}
            value={row.stats.wins}
            color={game.gameColorPale}
            labelColor={labelColor}
          />
          <PersonaStat
            label={t("statsTab.columns.lost")}
            value={row.stats.losses}
            color={game.gameColorPale}
            labelColor={labelColor}
          />
          <PersonaStat
            label={t("statsTab.columns.winPercent")}
            value={formatWinRate(row.stats.wins, row.stats.losses)}
            color={game.gameColorPale}
            labelColor={labelColor}
          />
        </View>
      </View>
    </View>
  );
}

function PersonaStat({
  label,
  value,
  color,
  labelColor,
}: {
  label: string;
  value: string | number;
  color: string;
  labelColor: string;
}) {
  // Half the width, so the four stats form a 2x2 grid, each centred in its
  // cell.
  return (
    <View style={{ width: "50%", alignItems: "center" }}>
      <Text
        size="md"
        weight={600}
        color={color}
        lineHeight={1.1}
        style={{ textAlign: "center" }}
      >
        {value}
      </Text>
      <Text
        size="xs"
        weight={400}
        color={labelColor}
        lineHeight={1.2}
        style={{ textAlign: "center" }}
      >
        {label}
      </Text>
    </View>
  );
}
