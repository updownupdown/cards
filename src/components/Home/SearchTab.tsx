import { Text } from "@/components/common/Text";
import { RadioButtons } from "@/components/common/RadioButtons";
import { RangeSlider } from "@/components/common/RangeSlider";
import { HomeCard } from "@/components/Home/HomeCard";
import { GameStatsNames, statKeys } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { Icon } from "@/icons";
import {
  Colors,
  FontWeight,
  layoutDims,
  rgba,
  transitionStyles,
} from "@/styles/styles";
import { useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useImmer } from "use-immer";
import { HomeCardSizeControl, type HomeCardSize } from "./HomeCardSizeControl";
import { flexStyles } from "@/styles/flexStyles";

type StatsFilters = Record<GameStatsNames, { min: number; max: number }>;
type Filters = {
  played: "all" | "unplayed";
  statsFilters: StatsFilters;
};
type SearchMode = "search" | "filter" | null;

const DEFAULT_FILTERS: Filters = {
  played: "all",
  statsFilters: {
    complexity: { min: 0, max: 100 },
    difficulty: { min: 0, max: 100 },
    luck: { min: 0, max: 100 },
  },
};

type SearchTabProps = {
  allEnabledGames: HomeGameEntry[];
  unplayedGamePaths: string[];
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  cardSize: HomeCardSize;
  onCardSizeChange: (size: HomeCardSize) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
};

export function SearchTab({
  allEnabledGames,
  unplayedGamePaths,
  favorites,
  onToggleFavorite,
  cardSize,
  onCardSizeChange,
  contentPaddingTop,
  contentPaddingBottom,
}: SearchTabProps) {
  const { ui, spacing, font } = useResponsiveMetrics();
  const { width: viewportWidth } = useViewportDimensions();
  const inputRef = useRef<TextInput>(null);
  const [mode, setMode] = useState<SearchMode>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useImmer<Filters>(DEFAULT_FILTERS);
  const pageSidePadding = spacing(layoutDims.pagePadding);
  const contentWidth = Math.min(ui.contentMaxWidth, viewportWidth);
  const cardGap = spacing(12);
  const mediumCardWidth: `${number}%` = ui.isTablet ? "31.5%" : "48.5%";
  const controlHeight = spacing(52);
  const borderRadius = spacing(8);
  const unplayedPaths = useMemo(
    () => new Set(unplayedGamePaths),
    [unplayedGamePaths],
  );

  const filteredGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allEnabledGames.filter(([path, game]) => {
      if (mode === "search") {
        return (
          !normalizedQuery || game.title.toLowerCase().includes(normalizedQuery)
        );
      }
      if (mode !== "filter") return true;
      if (filters.played === "unplayed" && !unplayedPaths.has(path))
        return false;
      return statKeys.every((stat) => {
        const value = game.rating[stat];
        const range = filters.statsFilters[stat];
        return value >= range.min && value <= range.max;
      });
    });
  }, [allEnabledGames, filters, mode, query, unplayedPaths]);

  const clearSearch = () => {
    setQuery("");
    setMode(null);
    inputRef.current?.blur();
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setMode(null);
  };

  const webInputProps =
    Platform.OS === "web"
      ? ({ id: "home-tab-search", name: "home-tab-search" } as any)
      : undefined;

  const filtersSection = (
    <View
      style={{
        width: "100%",
        gap: spacing(12),
        padding: spacing(20),
        paddingTop: 0,
      }}
    >
      <RadioButtons
        options={[
          { value: "all", label: "All" },
          { value: "unplayed", label: "Unplayed" },
        ]}
        selectedValue={filters.played}
        onChange={(value) =>
          setFilters((draft) => {
            draft.played = value;
          })
        }
        selectedBackgroundColor={Colors.K850}
        buttonStyle={{
          height: spacing(40),
          borderRadius: spacing(20),
          flex: 1,
        }}
        containerStyle={{
          width: "100%",
          backgroundColor: Colors.K950,
          height: spacing(52),
          borderRadius: spacing(26),
          padding: spacing(6),
          marginBottom: spacing(12),
        }}
      />

      {statKeys.map((statName) => (
        <RangeSlider
          key={statName}
          label={statName}
          min={0}
          max={100}
          value={filters.statsFilters[statName]}
          onRangeChange={(range) =>
            setFilters((draft) => {
              draft.statsFilters[statName] = range;
            })
          }
        />
      ))}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
        paddingHorizontal: pageSidePadding,
        gap: spacing(16),
      }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          alignSelf: "center",
          gap: spacing(40),
        }}
      >
        <HomeCardSizeControl
          contentWidth={contentWidth}
          value={cardSize}
          onChange={onCardSizeChange}
        />

        <View style={{ flexDirection: "row", gap: spacing(12), minWidth: 0 }}>
          {mode !== "filter" && (
            <View
              accessibilityRole="search"
              style={[
                transitionStyles.all05sec,
                {
                  height: controlHeight,
                  flex: 1,
                  minWidth: 0,
                  borderRadius,
                  backgroundColor: Colors.K875,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: spacing(12),
                  gap: spacing(10),
                  boxShadow: `inset 0 0 ${spacing(12)}px ${rgba(Colors.black, 0.12)}`,
                },
              ]}
            >
              <Icon
                name="search"
                size={spacing(28)}
                color={mode === "search" ? Colors.K200 : Colors.K500}
              />
              <TextInput
                ref={inputRef}
                {...webInputProps}
                value={query}
                onFocus={() => setMode("search")}
                onChangeText={setQuery}
                placeholder="Search..."
                placeholderTextColor={Colors.K600}
                autoCapitalize="none"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "100%",
                  color: Colors.K100,
                  fontSize: font(16),
                  fontFamily: FontWeight[300],
                  outline: "none",
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={clearSearch}
                hitSlop={spacing(8)}
                disabled={mode !== "search"}
                style={[
                  transitionStyles.all05sec,
                  { opacity: mode === "search" ? 1 : 0 },
                ]}
              >
                <Icon name="close" size={spacing(28)} color={Colors.K500} />
              </Pressable>
            </View>
          )}

          {mode !== "search" &&
            (mode === "filter" ? (
              <View
                style={[
                  flexStyles.colCentered,
                  {
                    width: "100%",
                    gap: spacing(6),
                    backgroundColor: Colors.K900,
                    borderRadius,
                    boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(12)}px ${rgba(Colors.black, 0.4)}`,
                  },
                ]}
              >
                <View
                  style={{
                    width: "100%",
                    height: controlHeight,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingRight: spacing(16),
                    paddingLeft: spacing(12),
                    gap: spacing(8),
                  }}
                >
                  <Icon name="filter" size={spacing(24)} color={Colors.K300} />
                  <Text
                    size="md"
                    weight={400}
                    color={Colors.K200}
                    style={{ flex: 1 }}
                  >
                    Filter
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Reset filters"
                    onPress={resetFilters}
                    style={{
                      marginLeft: "auto",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing(6),
                    }}
                  >
                    <Text size="sm" weight={500} color={Colors.K600}>
                      Reset filters
                    </Text>
                    <Icon name="close" size={spacing(24)} color={Colors.K600} />
                  </Pressable>
                </View>

                {filtersSection}
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filters"
                onPress={() => setMode("filter")}
                style={{
                  height: controlHeight,
                  borderRadius,
                  backgroundColor: Colors.K900,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingRight: spacing(16),
                  paddingLeft: spacing(12),
                  gap: spacing(8),
                  boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(12)}px ${rgba(Colors.black, 0.25)}`,
                }}
              >
                <Icon name="filter" size={spacing(24)} color={Colors.K300} />
                <Text size="md" weight={400} color={Colors.K200}>
                  Filter
                </Text>
              </Pressable>
            ))}
        </View>

        <View
          style={{
            width: "100%",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            rowGap: cardGap,
          }}
        >
          {filteredGames.map(([path, game]) => (
            <HomeCard
              key={path}
              path={path}
              game={game}
              size={cardSize}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.has(path)}
              style={{
                width: cardSize === "medium" ? mediumCardWidth : "100%",
                flexGrow: cardSize === "medium" ? 0 : 1,
              }}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
