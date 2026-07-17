import { Text } from "@/components/common/Text";
import { HomeCard } from "@/components/Home/HomeCard";
import {
  GameStatsNames,
  GameTag,
  GameTagNames,
  statKeys,
} from "@/data/games-data";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba, layoutDims } from "@/styles/styles";
import { roundToPixel } from "@/utils/utils";
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useImmer } from "use-immer";
import { RadioButtons } from "../common/RadioButtons";
import { RangeSlider } from "../common/RangeSlider";

type CardSize = "small" | "medium" | "large";

type DiscoverTabProps = {
  allEnabledGames: HomeGameEntry[];
  unplayedGamePaths: string[];
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  contentPaddingBottom: number;
};

type Filters = {
  tag: GameTag | "all";
  played: "all" | "unplayed";
  statsFilters: StatsFilters;
};

type StatsFilters = Record<GameStatsNames, { min: number; max: number }>;

const DEFAULT_STATS_FILTERS: StatsFilters = {
  complexity: { min: 0, max: 100 },
  difficulty: { min: 0, max: 100 },
  luck: { min: 0, max: 100 },
};

const DEFAULT_FILTERS: Filters = {
  tag: "all",
  played: "all",
  statsFilters: DEFAULT_STATS_FILTERS,
};

export function DiscoverTab({
  allEnabledGames,
  unplayedGamePaths,
  favorites,
  onToggleFavorite,
  contentPaddingBottom,
}: DiscoverTabProps) {
  const { ui, spacing } = useResponsiveMetrics();
  const { width: viewportWidth } = useViewportDimensions();
  const { settings, updateSettings } = useGlobalSettings();

  const cardSize: CardSize = settings.discoverCardSize ?? "large";

  const pageSidePadding = spacing(layoutDims.pagePadding);
  const contentMaxWidth = ui.contentMaxWidth;
  const renderedContentWidth = Math.min(contentMaxWidth, viewportWidth);
  const cardGap = spacing(12);
  const rowInnerWidth = Math.max(0, renderedContentWidth - pageSidePadding * 2);
  const mediumCardWidth = Math.max(
    0,
    roundToPixel((rowInnerWidth - cardGap) / (ui.isTablet ? 3 : 2)),
  );
  const isMediumLayout = cardSize === "medium";

  const [filters, setFilters] = useImmer<Filters>(DEFAULT_FILTERS);

  const hasActiveFilters = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  }, [filters]);

  const filteredGames = useMemo(() => {
    const gamesToFilter = allEnabledGames.filter(([path, game]) => {
      // Filter by tag if a tag filter is set
      if (filters.tag !== "all" && !game.tags?.includes(filters.tag)) {
        return false;
      }

      // Filter by played/unplayed status if a filter is set
      if (filters.played === "unplayed" && unplayedGamePaths.includes(path)) {
        return false;
      }

      // Filter by stats if stats filters are set
      if (filters.statsFilters) {
        for (const stat in filters.statsFilters) {
          const { min, max } = filters.statsFilters[stat as GameStatsNames];
          const gameStatValue = game.rating[stat as GameStatsNames];
          if (gameStatValue < min || gameStatValue > max) {
            return false;
          }
        }
      }

      return true;
    });

    return gamesToFilter;
  }, [allEnabledGames, filters]);

  const onSelectSize = (size: CardSize) => {
    if (cardSize === size) return;
    updateSettings({ discoverCardSize: size });
  };

  const cardSizeToggleOptions = [
    {
      value: "small" as const,
      iconName: "list-small" as IconName,
    },
    {
      value: "medium" as const,
      iconName: "list-medium" as IconName,
    },
    {
      value: "large" as const,
      iconName: "list-large" as IconName,
    },
  ];

  return (
    <View
      style={[
        flexStyles.colCentered,
        flexStyles.fullWidth,
        { position: "relative", flex: 1 },
      ]}
    >
      {/* Filters top bar */}
      <View
        style={[
          flexStyles.rowCentered,
          {
            position: "absolute",
            top: spacing(layoutDims.pagePadding + layoutDims.menuBarHeight),
            left: "50%",
            transform: [{ translateX: "-50%" }],
            zIndex: 200,
            width: "100%",
            maxWidth: renderedContentWidth - spacing(layoutDims.pagePadding),
            alignSelf: "center",
            gap: spacing(20),
            height: spacing(layoutDims.menuBarHeight),
            borderRadius: spacing(layoutDims.menuBarHeight / 2),
            backgroundColor: rgba(Colors.K950, 0.9),
            boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.K900, 0.4)}, ${spacing(2)}px ${spacing(4)}px ${spacing(10)}px ${rgba(
              Colors.K900,
              0.4,
            )}`,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            setFilters(DEFAULT_FILTERS);
          }}
          style={[
            flexStyles.rowCentered,
            flexStyles.flex1,
            {
              gap: spacing(10),
              paddingLeft: spacing(layoutDims.pagePadding),
            },
          ]}
          disabled={!hasActiveFilters}
        >
          <Icon
            name="close"
            size={22}
            color={rgba(Colors.white, hasActiveFilters ? 1 : 0)}
          />
          <View style={[flexStyles.colStart, flexStyles.flex1]}>
            <Text
              size="md"
              weight={400}
              color={rgba(Colors.white, hasActiveFilters ? 1 : 0.4)}
            >
              {hasActiveFilters ? "Clear filters" : "No filters applied"}
            </Text>

            {hasActiveFilters && (
              <Text
                size="xs"
                weight={600}
                color={Colors.suitsRed}
                textTransform="uppercase"
              >
                {filteredGames.length} result
                {filteredGames.length !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
        </Pressable>

        {/* Card size toggle */}
        <RadioButtons
          options={cardSizeToggleOptions}
          selectedValue={cardSize}
          selectedBackgroundColor={Colors.background}
          onChange={(value) => {
            onSelectSize(value);
          }}
          iconSize={20}
          buttonStyle={{
            borderRadius: spacing(layoutDims.menuBarHeight / 2),
            width: spacing(layoutDims.menuBarHeight - 12),
            height: spacing(layoutDims.menuBarHeight - 12),
          }}
          containerStyle={{
            backgroundColor: "transparent",
            height: spacing(layoutDims.menuBarHeight),
            boxShadow: "none",
          }}
        />
      </View>
      <ScrollView
        style={[flexStyles.fullWidth, { flex: 1 }]}
        contentContainerStyle={{
          paddingTop:
            ui.gameHeaderHeight +
            spacing(layoutDims.pagePadding + layoutDims.menuBarHeight + 30),
          paddingBottom: contentPaddingBottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters and cards */}
        <View
          style={[
            flexStyles.fullWidth,
            {
              maxWidth: renderedContentWidth,
              alignSelf: "center",
              paddingHorizontal: pageSidePadding,
              paddingBottom: spacing(60),
              gap: spacing(30),
            },
          ]}
        >
          {/* Filters */}
          <View
            style={[
              flexStyles.rowStart,
              flexStyles.fullWidth,
              { gap: spacing(24) },
            ]}
          >
            {/* Tag Selector */}
            <RadioButtons
              vertical
              options={[
                { value: "all" as const, label: "All" },
                ...Object.entries(GameTagNames).map(([tag, name]) => ({
                  value: tag as GameTag,
                  label: name,
                })),
              ]}
              selectedValue={filters.tag}
              onChange={(value) => {
                setFilters((draft) => {
                  draft.tag = value as GameTag;
                });
              }}
              buttonStyle={{
                height: spacing(40),
              }}
              selectedBackgroundColor={Colors.suitsRed}
              textStyle={{
                fontSize: spacing(16),
              }}
              containerStyle={{
                backgroundColor: Colors.K900,
                flex: 1,
              }}
            />

            <View
              style={[
                flexStyles.colStart,
                flexStyles.flex1,
                { gap: spacing(20) },
              ]}
            >
              {/* Played/Unplayed Selector */}
              <RadioButtons
                options={[
                  { value: "all", label: "All" },
                  { value: "unplayed", label: "Unplayed" },
                ]}
                flexAllButFirst
                selectedValue={filters.played}
                onChange={(value) => {
                  setFilters((draft) => {
                    draft.played = value as "all" | "unplayed";
                  });
                }}
                selectedBackgroundColor={Colors.suitsRed}
                buttonStyle={{
                  height: spacing(40),
                }}
                textStyle={{
                  fontSize: spacing(16),
                }}
                containerStyle={{
                  backgroundColor: Colors.K900,
                  width: "100%",
                }}
              />

              {/* Stats Filters */}
              {Object.values(statKeys).map((statName) => (
                <RangeSlider
                  key={statName}
                  label={statName}
                  min={0}
                  max={100}
                  value={filters.statsFilters[statName as GameStatsNames]}
                  onRangeChange={(newValues) => {
                    setFilters((draft) => {
                      draft.statsFilters[statName as GameStatsNames] = {
                        min: newValues.min,
                        max: newValues.max,
                      };
                    });
                  }}
                />
              ))}
            </View>
          </View>

          {/* Games List */}
          <View
            style={{
              width: "100%",
              paddingTop: cardGap,
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              rowGap: cardGap,
              columnGap: isMediumLayout ? undefined : cardGap,
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
                  width: isMediumLayout ? mediumCardWidth : "100%",
                  flexGrow: isMediumLayout ? 0 : 1,
                }}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
