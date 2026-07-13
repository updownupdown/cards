import { Text } from "@/components/common/Text";
import { HomeCard } from "@/components/Home/HomeCard";
import { RandomGameRoller } from "@/components/Home/RandomGameRoller";
import { GameTag, GameTagNames } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, HomePadding, rgba } from "@/styles/styles";
import { roundToPixel } from "@/utils/utils";
import { useMemo, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { HomeSectionTitle } from "./HomeSectionTitle";
import { QUICK_TRANSITION_STYLE } from "../Button/Button";

type CardSize = "small" | "medium" | "large";

type DiscoverTabProps = {
  allEnabledGames: HomeGameEntry[];
  allEnabledGamePaths: string[];
  unplayedGamePaths: string[];
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  hasLoaded: boolean;
  contentPaddingTop: number;
  contentPaddingBottom: number;
};

export function DiscoverTab({
  allEnabledGames,
  allEnabledGamePaths,
  unplayedGamePaths,
  favorites,
  onToggleFavorite,
  hasLoaded,
  contentPaddingTop,
  contentPaddingBottom,
}: DiscoverTabProps) {
  const { ui, spacing } = useResponsiveMetrics();
  const { width: viewportWidth, height: viewportHeight } =
    useViewportDimensions();
  const { settings, updateSettings } = useGlobalSettings();

  const [expandedTags, setExpandedTags] = useState<Set<GameTag>>(new Set());
  const [scrollY, setScrollY] = useState(0);

  const unplayedGames = useMemo(() => {
    const unplayedSet = new Set(unplayedGamePaths);
    return allEnabledGames.filter(([path]) => unplayedSet.has(path));
  }, [allEnabledGames, unplayedGamePaths]);

  const cardSize: CardSize = settings.discoverCardSize ?? "large";

  const pageSidePadding = spacing(HomePadding);
  const contentMaxWidth = ui.contentMaxWidth;
  const renderedContentWidth = Math.min(contentMaxWidth, viewportWidth);
  const sectionTopPadding = spacing(14);
  const cardGap = spacing(12);
  const rowInnerWidth = Math.max(0, renderedContentWidth - pageSidePadding * 2);
  const mediumCardWidth = Math.max(
    0,
    roundToPixel((rowInnerWidth - cardGap) / (ui.isTablet ? 3 : 2)),
  );
  const isMediumLayout = cardSize === "medium";

  const gamesByTag = useMemo(() => {
    const map = new Map<GameTag, HomeGameEntry[]>();
    (Object.values(GameTag) as GameTag[]).forEach((tag) => {
      map.set(tag, []);
    });
    allEnabledGames.forEach((entry) => {
      (entry[1].tags ?? []).forEach((tag) => {
        map.get(tag)?.push(entry);
      });
    });
    return map;
  }, [allEnabledGames]);

  const visibleTags = useMemo(
    () =>
      (Object.values(GameTag) as GameTag[]).filter(
        (tag) => (gamesByTag.get(tag)?.length ?? 0) > 0,
      ),
    [gamesByTag],
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  };

  const onSelectSize = (size: CardSize) => {
    if (cardSize === size) return;
    updateSettings({ discoverCardSize: size });
  };

  const onToggleTag = (tag: GameTag) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const sizeToggleIcons: [CardSize, IconName][] = [
    ["small", "list-small"],
    ["medium", "list-medium"],
    ["large", "list-large"],
  ];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
      }}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* Card size toggle */}
      <View
        style={{
          width: "100%",
          maxWidth: contentMaxWidth,
          paddingHorizontal: pageSidePadding,
          alignSelf: "center",
        }}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              backgroundColor: Colors.K875,
              borderRadius: spacing(10),
              padding: spacing(6),
              gap: spacing(6),
            },
          ]}
        >
          {sizeToggleIcons.map(([size, iconName]) => {
            const isActive = cardSize === size;
            const buttonSize = spacing(42);

            return (
              <Pressable
                key={size}
                onPress={() => onSelectSize(size)}
                style={[
                  flexStyles.rowCentered,
                  flexStyles.flex1,
                  {
                    ...QUICK_TRANSITION_STYLE,
                    height: buttonSize,
                    paddingHorizontal: spacing(12),
                    gap: spacing(12),
                    borderRadius: spacing(6),
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isActive ? Colors.K700 : "transparent",
                  },
                ]}
              >
                <Icon
                  name={iconName}
                  size={spacing(20)}
                  color={isActive ? Colors.K100 : Colors.K400}
                />
                <Text
                  size="sm"
                  weight={500}
                  color={Colors.K200}
                  style={{ textTransform: "capitalize" }}
                >
                  {size}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tag accordions */}
      <View
        style={{
          width: "100%",
          maxWidth: contentMaxWidth,
          alignSelf: "center",
          paddingHorizontal: pageSidePadding,
          paddingTop: sectionTopPadding,
          paddingBottom: spacing(60),
          gap: spacing(8),
        }}
      >
        {visibleTags.map((tag) => {
          const isExpanded = expandedTags.has(tag);
          const tagGames = gamesByTag.get(tag) ?? [];

          return (
            <View key={tag} style={{ width: "100%" }}>
              <Pressable
                onPress={() => onToggleTag(tag)}
                style={[
                  flexStyles.rowCentered,
                  flexStyles.spaceBetween,
                  {
                    ...QUICK_TRANSITION_STYLE,
                    width: "100%",
                    gap: spacing(16),
                    paddingHorizontal: spacing(16),
                    paddingVertical: spacing(12),
                    borderRadius: spacing(8),
                    backgroundColor: isExpanded ? Colors.suitsRed : Colors.K900,
                    outline: "none",
                  },
                ]}
              >
                <View
                  style={[
                    flexStyles.rowCentered,
                    flexStyles.flex1,
                    flexStyles.spaceBetween,
                  ]}
                >
                  <Text
                    size="md"
                    weight={500}
                    color={isExpanded ? Colors.white : Colors.K200}
                  >
                    {GameTagNames[tag]}
                  </Text>
                  <Text
                    size="sm"
                    weight={400}
                    color={isExpanded ? rgba(Colors.white, 0.8) : Colors.K400}
                  >
                    {tagGames.length}
                  </Text>
                </View>

                <Icon
                  name={isExpanded ? "expand-less" : "expand-more"}
                  size={spacing(24)}
                  color={isExpanded ? Colors.white : Colors.K200}
                />
              </Pressable>

              {isExpanded && (
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
                  {tagGames.map(([path, game]) => (
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
              )}
            </View>
          );
        })}
      </View>

      {/* Roll the dice */}
      <View
        style={{
          width: "100%",
          maxWidth: contentMaxWidth,
          alignSelf: "center",
          paddingHorizontal: pageSidePadding,
        }}
      >
        <HomeSectionTitle
          title="Play a Random Game"
          iconName="dice"
          pageSidePadding={0}
          contentMaxWidth={contentMaxWidth}
        />
      </View>

      <RandomGameRoller
        allEntries={allEnabledGames}
        unplayedEntries={unplayedGames}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        hasLoaded={hasLoaded}
        contentMaxWidth={contentMaxWidth}
        pageSidePadding={pageSidePadding}
        scrollY={scrollY}
        viewportHeight={viewportHeight}
      />
    </ScrollView>
  );
}
