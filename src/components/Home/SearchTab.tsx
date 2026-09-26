import { Text } from "@/components/common/Text";
import { Button } from "@/components/Button/Button";
import { RadioButtons } from "@/components/common/RadioButtons";
import { RangeSlider } from "@/components/common/RangeSlider";
import { HomeCard } from "@/components/Home/HomeCard";
import { GameStatsNames, statKeys } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useKeyboardLift } from "@/hooks/useKeyboardLift";
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
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useImmer } from "use-immer";
import { HomeHeaderBackground } from "./HomeHeader";
import { HomeCardSizeControl, type HomeCardSize } from "./HomeCardSizeControl";
import {
  findCentreEntry,
  useCardSizeTransition,
} from "./useCardSizeTransition";
import { flexStyles } from "@/styles/flexStyles";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";

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
  showHeaderBackground: boolean;
  onScrolledChange: (isScrolled: boolean) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  searchControlBottom: number;
};

export function SearchTab({
  allEnabledGames,
  unplayedGamePaths,
  favorites,
  onToggleFavorite,
  cardSize,
  onCardSizeChange,
  showHeaderBackground,
  onScrolledChange,
  contentPaddingTop,
  contentPaddingBottom,
  searchControlBottom,
}: SearchTabProps) {
  const { ui, spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const { t: tCommon } = useTranslation("common");
  const language = useDisplayLanguage();
  const { width: viewportWidth } = useViewportDimensions();
  const inputRef = useRef<TextInput>(null);
  const [mode, setMode] = useState<SearchMode>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useImmer<Filters>(DEFAULT_FILTERS);
  const pageSidePadding = spacing(layoutDims.pagePadding);
  const contentWidth = Math.min(
    ui.contentMaxWidth,
    viewportWidth - pageSidePadding * 2,
  );
  const cardGap = spacing(12);
  const cardColumns = cardSize === "medium" ? (ui.isTablet ? 3 : 2) : 1;
  const cardColumnWidth =
    (contentWidth - cardGap * (cardColumns - 1)) / cardColumns;
  const controlHeight = spacing(layoutDims.searchControlHeight);
  const controlBorderRadius = controlHeight / 2;
  const unplayedPaths = useMemo(
    () => new Set(unplayedGamePaths),
    [unplayedGamePaths],
  );
  const keyboardLift = useKeyboardLift(
    searchControlBottom,
    spacing(layoutDims.pagePadding * 0.5),
  );
  const containerRef = useRef<View>(null);
  const listRef = useRef<FlatList<HomeGameEntry>>(null);
  const cardRefs = useRef(new Map<string, View>());
  const scrollFailedRef = useRef(0);
  const scrollToAnchorRef = useRef<(attemptsLeft: number) => void>(() => {});

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

  const { opacity: listOpacity, changeCardSize } = useCardSizeTransition({
    cardSize,
    onCardSizeChange,
    captureAnchor: async () => {
      const centre = await findCentreEntry(
        containerRef.current,
        cardRefs.current,
      );
      if (!centre) return null;
      const index = filteredGames.findIndex(([path]) => path === centre.key);
      return index < 0 ? null : { index };
    },
    restoreAnchor: ({ index }) => {
      const row = Math.floor(index / cardColumns);
      const scrollToAnchor = (attemptsLeft: number) => {
        // Rows that were never rendered have no measured height yet, so the
        // failure handler jumps near them and retries once they are measured.
        scrollFailedRef.current = attemptsLeft - 1;
        listRef.current?.scrollToIndex({
          index: row,
          viewPosition: 0.5,
          animated: false,
        });
      };
      scrollToAnchorRef.current = scrollToAnchor;
      scrollToAnchor(3);
    },
  });

  const clearSearch = () => {
    setQuery("");
    setMode(null);
    inputRef.current?.blur();
  };

  const onChangeSearchText = (value: string) => {
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
        selectedBackgroundColor={Colors.suitsRed}
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
    <View ref={containerRef} style={{ flex: 1 }}>
      <Animated.View style={{ flex: 1, opacity: listOpacity }}>
        <FlatList
          ref={listRef}
          onScrollToIndexFailed={({ averageItemLength, index }) => {
            listRef.current?.scrollToOffset({
              offset: averageItemLength * index,
              animated: false,
            });
            if (scrollFailedRef.current > 0) {
              const attemptsLeft = scrollFailedRef.current;
              setTimeout(() => scrollToAnchorRef.current(attemptsLeft), 50);
            }
          }}
          key={`${cardSize}-${cardColumns}`}
          data={filteredGames}
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
            // Clear the floating search control, then leave the same
            // comfortable gap after the last card that the other tabs use.
            paddingBottom: Math.max(
              contentPaddingBottom,
              searchControlBottom + controlHeight + spacing(48),
            ),
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
              <View style={{ height: controlHeight }} />

              <View style={{ flexDirection: "row", gap: spacing(12) }}>
                {mode !== "filter" && (
                  <Button
                    accessibilityLabel={t("search.filters")}
                    text={t("search.filters")}
                    iconName="filter"
                    iconSize={spacing(24)}
                    size="sm"
                    uppercase={false}
                    theme={rgba(Colors.K900, 0.7)}
                    onPress={() => setMode("filter")}
                    style={{
                      flex: 1,
                      height: controlHeight,
                      borderRadius: controlBorderRadius,
                      ...homeSurfaceShadow(spacing),
                    }}
                  />
                )}

                {mode === "filter" && (
                  <View
                    style={[
                      flexStyles.colCentered,
                      {
                        width: "100%",
                        gap: spacing(6),
                        backgroundColor: rgba(Colors.K900, 0.8),
                        borderRadius: controlBorderRadius,
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
                        paddingLeft: spacing(20),
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
                        {t("search.filters")}
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
                )}
              </View>
            </View>
          }
          renderItem={({ item: [path, game] }) => (
            <View
              ref={(view) => {
                if (view) cardRefs.current.set(path, view);
                else cardRefs.current.delete(path);
              }}
              collapsable={false}
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
      </Animated.View>
      <HomeHeaderBackground showBackground={showHeaderBackground} />
      <View
        style={[
          pointerEventsStyles.boxNone,
          {
            position: "absolute",
            top: contentPaddingTop,
            left: pageSidePadding,
            right: pageSidePadding,
            zIndex: 9,
          },
        ]}
      >
        <HomeCardSizeControl value={cardSize} onChange={changeCardSize} />
      </View>

      <Animated.View
        style={[
          pointerEventsStyles.boxNone,
          {
            position: Platform.OS === "web" ? "fixed" : "absolute",
            left: 0,
            right: 0,
            bottom: searchControlBottom,
            zIndex: 7,
            paddingHorizontal: spacing(layoutDims.pagePadding * 0.5),
            transform: [{ translateY: keyboardLift }],
          },
        ]}
      >
        <View
          accessibilityRole="search"
          style={[
            transitionStyles.all05sec,
            {
              width: "100%",
              maxWidth: ui.contentMaxWidth - spacing(layoutDims.pagePadding),
              alignSelf: "center",
              height: controlHeight,
              minWidth: 0,
              borderRadius: controlBorderRadius,
              borderWidth: spacing(2),
              borderColor:
                mode === "search"
                  ? rgba(Colors.K500, 0.65)
                  : rgba(Colors.K800, 0.65),
              backgroundColor: rgba(Colors.K800, 0.96),
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
            color={mode === "search" ? Colors.K100 : Colors.K400}
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
            <Icon name="close" size={spacing(28)} color={Colors.K400} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
