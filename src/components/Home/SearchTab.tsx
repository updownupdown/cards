import { Text } from "@/components/common/Text";
import { RadioButtons } from "@/components/common/RadioButtons";
import { RangeSlider } from "@/components/common/RangeSlider";
import { HomeCard } from "@/components/Home/HomeCard";
import { RandomGameRoller } from "@/components/Home/RandomGameRoller";
import { GameStatsNames, statKeys } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { foldForSearch, localizeGameTitle } from "@/i18n/content";
import { Icon } from "@/icons";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import {
  Colors,
  FontWeight,
  layoutDims,
  rgba,
  transitionStyles,
} from "@/styles/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Platform, Pressable, TextInput, View } from "react-native";
import { useImmer } from "use-immer";
import { HomeCardSizeControl, type HomeCardSize } from "./HomeCardSizeControl";
import { flexStyles } from "@/styles/flexStyles";
import { DICE_ROLL_DURATION, ROLLING_DICE_COUNT } from "./RollingDice";

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
  onScrolledChange: (isScrolled: boolean) => void;
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
  onScrolledChange,
  contentPaddingTop,
  contentPaddingBottom,
}: SearchTabProps) {
  const { ui, spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const { t: tCommon } = useTranslation("common");
  const language = useDisplayLanguage();
  const { width: viewportWidth } = useViewportDimensions();
  const inputRef = useRef<TextInput>(null);
  const [mode, setMode] = useState<SearchMode>(null);
  const [query, setQuery] = useState("");
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [randomEntries, setRandomEntries] = useState<HomeGameEntry[]>([]);
  const [isRandomRolling, setIsRandomRolling] = useState(false);
  const [randomRollKey, setRandomRollKey] = useState(0);
  const [filters, setFilters] = useImmer<Filters>(DEFAULT_FILTERS);
  const randomRollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pageSidePadding = spacing(layoutDims.pagePadding);
  const contentWidth = Math.min(
    ui.contentMaxWidth,
    viewportWidth - pageSidePadding * 2,
  );
  const cardGap = spacing(12);
  const cardColumns = cardSize === "medium" ? (ui.isTablet ? 3 : 2) : 1;
  const cardColumnWidth =
    (contentWidth - cardGap * (cardColumns - 1)) / cardColumns;
  const controlHeight = spacing(52);
  const controlBorderRadius = controlHeight / 2;
  const filterPanelBorderRadius = spacing(16);
  const unplayedPaths = useMemo(
    () => new Set(unplayedGamePaths),
    [unplayedGamePaths],
  );

  const filteredGames = useMemo(() => {
    const normalizedQuery = foldForSearch(query.trim());
    return allEnabledGames.filter(([path, game]) => {
      if (mode === "search") {
        // Match the translated title, the English title and its aliases.
        return (
          !normalizedQuery ||
          [
            localizeGameTitle(game, path, language),
            game.title,
            ...(game.aliases ?? []),
          ].some((name) => foldForSearch(name).includes(normalizedQuery))
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
  }, [allEnabledGames, filters, language, mode, query, unplayedPaths]);
  const hasSearchText = query.trim().length > 0;

  const rollRandomGames = useCallback(() => {
    const available = [...filteredGames];
    const selected: HomeGameEntry[] = [];

    while (available.length > 0 && selected.length < ROLLING_DICE_COUNT) {
      const index = Math.floor(Math.random() * available.length);
      selected.push(available[index]);
      available.splice(index, 1);
    }
    if (selected.length === 0) return;

    setIsRandomMode(true);
    setIsRandomRolling(true);
    setRandomRollKey((current) => current + 1);
    if (randomRollTimeoutRef.current)
      clearTimeout(randomRollTimeoutRef.current);
    randomRollTimeoutRef.current = setTimeout(() => {
      setRandomEntries(selected);
      setIsRandomRolling(false);
      randomRollTimeoutRef.current = null;
    }, DICE_ROLL_DURATION);
  }, [filteredGames]);

  const clearRandomGames = useCallback(() => {
    if (randomRollTimeoutRef.current)
      clearTimeout(randomRollTimeoutRef.current);
    randomRollTimeoutRef.current = null;
    setIsRandomRolling(false);
    setRandomEntries([]);
    setIsRandomMode(false);
  }, []);

  useEffect(
    () => () => {
      if (randomRollTimeoutRef.current)
        clearTimeout(randomRollTimeoutRef.current);
    },
    [],
  );

  const clearSearch = () => {
    setQuery("");
    setIsRandomMode(false);
    setMode(null);
    inputRef.current?.blur();
  };

  const onChangeSearchText = (value: string) => {
    if (value) setIsRandomMode(false);
    setQuery(value);
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
          { value: "all", label: t("search.all") },
          { value: "unplayed", label: t("search.unplayed") },
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
          label={tCommon(`stats.${statName}`)}
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
    <FlatList
      key={isRandomMode ? "random" : `${cardSize}-${cardColumns}`}
      data={isRandomMode ? [] : filteredGames}
      keyExtractor={([path]) => path}
      numColumns={cardColumns}
      style={{ flex: 1 }}
      onScroll={(event) =>
        onScrolledChange(event.nativeEvent.contentOffset.y > 1)
      }
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
        paddingHorizontal: pageSidePadding,
        rowGap: cardGap,
      }}
      columnWrapperStyle={
        cardColumns > 1
          ? {
              alignSelf: "center",
              gap: cardGap,
              justifyContent: "flex-start",
            }
          : undefined
      }
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      ListHeaderComponent={
        <View
          style={{
            width: "100%",
            maxWidth: ui.contentMaxWidth,
            alignSelf: "center",
            gap: spacing(32),
            marginBottom: spacing(20),
          }}
        >
          <HomeCardSizeControl value={cardSize} onChange={onCardSizeChange} />

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
                    borderRadius: controlBorderRadius,
                    backgroundColor: rgba(Colors.K850, 0.7),
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: spacing(12),
                    gap: spacing(10),
                    ...homeSurfaceShadow(spacing),
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
                  onChangeText={onChangeSearchText}
                  placeholder={t("search.placeholder")}
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
                  accessibilityLabel={t("search.clear")}
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

            {mode !== "search" && mode !== "filter" && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("random.roll")}
                onPress={rollRandomGames}
                disabled={filteredGames.length === 0}
                style={{
                  width: controlHeight,
                  height: controlHeight,
                  borderRadius: controlBorderRadius,
                  backgroundColor: rgba(Colors.K900, 0.7),
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: filteredGames.length === 0 ? 0.5 : 1,
                  ...homeSurfaceShadow(spacing),
                }}
              >
                <Icon name="dice" size={spacing(24)} color={Colors.K300} />
              </Pressable>
            )}

            {mode !== "search" &&
              (mode === "filter" ? (
                <View
                  style={[
                    flexStyles.colCentered,
                    {
                      width: "100%",
                      gap: spacing(6),
                      backgroundColor: rgba(Colors.K900, 0.8),
                      borderRadius: filterPanelBorderRadius,
                      ...homeSurfaceShadow(spacing),
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
                    <Icon
                      name="filter"
                      size={spacing(24)}
                      color={Colors.K300}
                    />
                    <Text
                      size="md"
                      weight={400}
                      color={Colors.K200}
                      style={{ flex: 1 }}
                    >
                      {t("search.filter")}
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("search.resetFilters")}
                      onPress={resetFilters}
                      style={{
                        marginLeft: "auto",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing(6),
                      }}
                    >
                      <Text size="sm" weight={500} color={Colors.K600}>
                        {t("search.resetFilters")}
                      </Text>
                      <Icon
                        name="close"
                        size={spacing(24)}
                        color={Colors.K600}
                      />
                    </Pressable>
                  </View>

                  {filtersSection}
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("search.filters")}
                  onPress={() => setMode("filter")}
                  style={{
                    width: controlHeight,
                    height: controlHeight,
                    borderRadius: controlBorderRadius,
                    backgroundColor: rgba(Colors.K900, 0.7),
                    alignItems: "center",
                    justifyContent: "center",
                    ...homeSurfaceShadow(spacing),
                  }}
                >
                  <Icon name="filter" size={spacing(24)} color={Colors.K300} />
                </Pressable>
              ))}
          </View>

          {!hasSearchText && isRandomMode && (
            <RandomGameRoller
              entries={randomEntries}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              rolling={isRandomRolling}
              rollKey={randomRollKey}
              onClear={clearRandomGames}
            />
          )}
        </View>
      }
      renderItem={({ item: [path, game] }) => (
        <View
          style={{
            alignSelf: "center",
            width: cardColumnWidth,
            maxWidth: cardColumnWidth,
          }}
        >
          <HomeCard
            path={path}
            game={game}
            size={cardSize}
            onToggleFavorite={onToggleFavorite}
            isFavorite={favorites.has(path)}
            style={{ width: "100%" }}
          />
        </View>
      )}
    />
  );
}
