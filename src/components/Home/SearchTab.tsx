import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { hairline, Meter, Pill } from "@/components/ui/Nocturne";
import type { GameSettingsMap } from "@/data/game-menu";
import { isGameEnabled } from "@/data/games-data";
import { GAMES_DATA } from "@/data/games-registry";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { foldForSearch, localizeGameTitle } from "@/i18n/content";
import { Icon, type IconName } from "@/icons";
import { FontWeight, layoutDims, rgba, theme } from "@/styles/styles";
import type { Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { FavButton } from "./FavButton";

const FILTERS = [
  "all",
  "unplayed",
  "favorites",
  "unbeaten",
  "won",
  "skill",
] as const;
type Filter = (typeof FILTERS)[number];

const SORTS = [
  "az",
  "recent",
  "mostPlayed",
  "easiest",
  "hardest",
  "luck",
] as const;
type Sort = (typeof SORTS)[number];

/** The Recent order lists this many games, last played first. */
const RECENT_COUNT = 20;
/** Low luck: games that leave this little to chance, out of 100. */
const LOW_LUCK = 30;
/** Width of the index letters' column, in the A–Z order. */
const INDEX_WIDTH = 44;

type SearchTabProps = {
  allEnabledGames: HomeGameEntry[];
  settingsMap: GameSettingsMap;
  favorites: Set<string>;
  recentPaths: string[];
  onToggleFavorite: (path: string) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
};

type Section = { key: string; data: HomeGameEntry[] };

export function SearchTab({
  allEnabledGames,
  settingsMap,
  favorites,
  recentPaths,
  onToggleFavorite,
  contentPaddingTop,
  contentPaddingBottom,
}: SearchTabProps) {
  const { ui, spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("az");
  const [sortOpen, setSortOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const pageSidePadding = spacing(layoutDims.pagePadding);
  const indexed = sort === "az";

  const stats = (path: string) => settingsMap[path]?.stats;

  const games = useMemo(() => {
    const normalizedQuery = foldForSearch(query.trim());
    const title = ([path, game]: HomeGameEntry) =>
      localizeGameTitle(game, path, language);
    const attempts = ([path]: HomeGameEntry) => stats(path)?.attempts ?? 0;
    const wins = ([path]: HomeGameEntry) => stats(path)?.wins ?? 0;
    let list: HomeGameEntry[] =
      sort === "recent"
        ? recentPaths
            .map((path) => [path, GAMES_DATA[path]] as HomeGameEntry)
            .filter(([, game]) => isGameEnabled(game))
            .slice(0, RECENT_COUNT)
        : [...allEnabledGames];
    list = list.filter((entry) => {
      const [path, game] = entry;
      if (filter === "unplayed" && attempts(entry) > 0) return false;
      if (filter === "favorites" && !favorites.has(path)) return false;
      if (filter === "unbeaten" && (attempts(entry) === 0 || wins(entry) > 0))
        return false;
      if (filter === "won" && wins(entry) === 0) return false;
      if (filter === "skill" && game.rating.luck > LOW_LUCK) return false;
      // Match the translated title, the English title and its aliases.
      return (
        !normalizedQuery ||
        [title(entry), game.title, ...(game.aliases ?? [])].some((name) =>
          foldForSearch(name).includes(normalizedQuery),
        )
      );
    });
    const byTitle = (a: HomeGameEntry, b: HomeGameEntry) =>
      title(a).localeCompare(title(b), language);
    const by = (value: (entry: HomeGameEntry) => number) =>
      list.sort((a, b) => value(a) - value(b) || byTitle(a, b));
    if (sort === "az") list.sort(byTitle);
    if (sort === "mostPlayed") by((entry) => -attempts(entry));
    if (sort === "easiest") by(([, game]) => game.rating.difficulty);
    if (sort === "hardest") by(([, game]) => -game.rating.difficulty);
    if (sort === "luck") by(([, game]) => game.rating.luck);
    return list;
  }, [
    allEnabledGames,
    favorites,
    filter,
    language,
    query,
    recentPaths,
    settingsMap,
    sort,
  ]);

  // In A–Z order, a section per first letter; otherwise one list.
  const sections = useMemo<Section[]>(() => {
    if (!indexed) return [{ key: "", data: games }];
    const byLetter = new Map<string, HomeGameEntry[]>();
    for (const entry of games) {
      const letter = foldForSearch(
        localizeGameTitle(entry[1], entry[0], language),
      )
        .charAt(0)
        .toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "#";
      byLetter.set(key, [...(byLetter.get(key) ?? []), entry]);
    }
    return [...byLetter].map(([key, data]) => ({ key, data }));
  }, [games, indexed, language]);

  const sortOptions: Record<Sort, { label: string; icon?: IconName }> = {
    az: { label: t("search.sortAZ") },
    recent: { label: t("search.sortRecent") },
    mostPlayed: { label: t("search.sortMostPlayed") },
    easiest: { label: t("search.sortDifficulty"), icon: "arrow-up" },
    hardest: { label: t("search.sortDifficulty"), icon: "arrow-down" },
    luck: { label: t("search.sortLuck") },
  };
  const filterLabels: Record<Filter, string> = {
    all: t("search.all"),
    unplayed: t("search.unplayed"),
    favorites: t("sections.favorites"),
    unbeaten: t("search.unbeaten"),
    won: t("search.won"),
    skill: t("search.skill"),
  };

  const column = {
    width: "100%",
    maxWidth: ui.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: pageSidePadding,
  } as const;

  return (
    <View style={{ flex: 1 }}>
      <SectionList
        sections={sections}
        keyExtractor={([path]) => path}
        // Starts under the header, so the index letters stick just below it.
        style={{ flex: 1, marginTop: headerHeight }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={indexed}
        contentContainerStyle={{
          paddingTop: spacing(8),
          paddingBottom: contentPaddingBottom,
        }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={16}
        maxToRenderPerBatch={16}
        windowSize={7}
        renderSectionHeader={({ section }) =>
          indexed ? <IndexLetter letter={section.key} /> : null
        }
        renderItem={({ item: [path, game] }) => (
          <View
            style={[
              column,
              indexed && {
                paddingLeft: pageSidePadding + spacing(INDEX_WIDTH),
              },
            ]}
          >
            <GameRow
              path={path}
              game={game}
              isFavorite={favorites.has(path)}
              onToggleFavorite={onToggleFavorite}
            />
          </View>
        )}
      />

      {/* The search box, filters, count and order stay at the top. */}
      <View
        onLayout={(event) =>
          setHeaderHeight(Math.ceil(event.nativeEvent.layout.height))
        }
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          paddingTop: contentPaddingTop,
          backgroundColor: theme.night,
        }}
      >
        <View
          style={[column, { gap: spacing(12), paddingBottom: spacing(10) }]}
        >
          <SearchBox query={query} onChange={setQuery} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ marginHorizontal: -pageSidePadding }}
            contentContainerStyle={{
              paddingHorizontal: pageSidePadding,
              gap: spacing(8),
            }}
          >
            {FILTERS.map((key) => (
              <Pill
                key={key}
                label={filterLabels[key]}
                selected={filter === key}
                onPress={() => setFilter(key)}
              />
            ))}
          </ScrollView>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text size="xs" weight={300} color={theme.dim}>
              {t("search.count", { count: games.length })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("search.sortBy")}
              aria-expanded={sortOpen}
              onPress={() => setSortOpen((open) => !open)}
              hitSlop={spacing(8)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing(4),
                outline: "none",
              }}
            >
              <SortLabel option={sortOptions[sort]} color={theme.ink} />
              <Icon
                name={sortOpen ? "expand-less" : "expand-more"}
                size={spacing(16)}
                color={theme.dim}
              />
            </Pressable>
          </View>
        </View>
        {/* The rows fade out as they pass under the header. */}
        <LinearGradient
          colors={[theme.night, rgba(theme.night, 0)]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -spacing(18),
            height: spacing(18),
            pointerEvents: "none",
          }}
        />

        {/* Laid over the list, rather than pushing it down. */}
        {sortOpen && (
          <>
            <Pressable
              accessibilityLabel={t("search.sortBy")}
              onPress={() => setSortOpen(false)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 10000,
              }}
            />
            <View
              style={[
                column,
                {
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  alignItems: "flex-end",
                  marginTop: -spacing(6),
                },
              ]}
            >
              <View
                style={{
                  minWidth: spacing(180),
                  padding: spacing(4),
                  borderRadius: spacing(12),
                  backgroundColor: theme.raise,
                  borderWidth: 1,
                  borderColor: hairline(),
                  boxShadow: `0 ${spacing(8)}px ${spacing(24)}px ${rgba("#000000", 0.45)}`,
                }}
              >
                {SORTS.map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityLabel={
                      option === "easiest"
                        ? t("search.sortEasiest")
                        : option === "hardest"
                          ? t("search.sortHardest")
                          : sortOptions[option].label
                    }
                    accessibilityState={{ selected: option === sort }}
                    onPress={() => {
                      setSort(option);
                      setSortOpen(false);
                    }}
                    style={{
                      paddingVertical: spacing(9),
                      paddingHorizontal: spacing(12),
                      borderRadius: spacing(8),
                      backgroundColor:
                        option === sort ? rgba(theme.accent, 0.12) : undefined,
                      outline: "none",
                    }}
                  >
                    <SortLabel
                      option={sortOptions[option]}
                      color={option === sort ? theme.accent : theme.ink}
                      size="sm"
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function SortLabel({
  option,
  color,
  size = "xs",
}: {
  option: { label: string; icon?: IconName };
  color: string;
  size?: "xs" | "sm";
}) {
  const { spacing } = useResponsiveMetrics();
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: spacing(4) }}
    >
      <Text size={size} weight={400} color={color}>
        {option.label}
      </Text>
      {option.icon && (
        <Icon name={option.icon} size={spacing(14)} color={color} />
      )}
    </View>
  );
}

function SearchBox({
  query,
  onChange,
}: {
  query: string;
  onChange: (query: string) => void;
}) {
  const { spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const inputRef = useRef<TextInput>(null);
  const webInputProps =
    Platform.OS === "web"
      ? ({ id: "home-tab-search", name: "home-tab-search" } as object)
      : undefined;
  return (
    <View
      accessibilityRole="search"
      style={{
        height: spacing(48),
        borderRadius: spacing(14),
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: query ? rgba(theme.accent, 0.4) : hairline(),
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing(14),
        gap: spacing(10),
      }}
    >
      <Icon name="search" size={spacing(20)} color={theme.dim} />
      <TextInput
        ref={inputRef}
        {...webInputProps}
        value={query}
        onChangeText={onChange}
        placeholder={t("search.placeholder")}
        placeholderTextColor={theme.faint}
        autoCapitalize="none"
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          color: theme.ink,
          fontSize: font(16),
          fontFamily: FontWeight[300],
          outline: "none",
        }}
      />
      {query ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("search.clear")}
          onPress={() => {
            onChange("");
            inputRef.current?.blur();
          }}
          hitSlop={spacing(8)}
        >
          <Icon name="close" size={spacing(20)} color={theme.dim} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * A section's letter in the index down the left, like a printed index: it
 * stays at the top while its games scroll past, until the next one pushes
 * it off. It takes no height itself, so it sits beside the first row.
 */
function IndexLetter({ letter }: { letter: string }) {
  const { spacing, font, ui } = useResponsiveMetrics();
  return (
    <View
      style={{
        height: 0,
        zIndex: 1,
        width: "100%",
        maxWidth: ui.contentMaxWidth,
        alignSelf: "center",
      }}
    >
      {/* Opaque, so a letter covers the one before where both are stuck
          (the web keeps every passed letter stuck, one over another). */}
      <View
        style={{
          position: "absolute",
          left: spacing(layoutDims.pagePadding) - spacing(4),
          top: 0,
          width: spacing(INDEX_WIDTH),
          paddingTop: spacing(6),
          paddingBottom: spacing(10),
          paddingLeft: spacing(4),
          backgroundColor: theme.night,
        }}
      >
        <Text
          serif
          weight={500}
          color={theme.accent}
          style={{ fontSize: font(30), lineHeight: font(36) }}
        >
          {letter}
        </Text>
      </View>
    </View>
  );
}

/** A game in the results: its name, then its difficulty and its star. */
function GameRow({
  path,
  game,
  isFavorite,
  onToggleFavorite,
}: {
  path: string;
  game: HomeGameEntry[1];
  isFavorite: boolean;
  onToggleFavorite: (path: string) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const language = useDisplayLanguage();
  const title = localizeGameTitle(game, path, language);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing(12),
        borderBottomWidth: StyleSheet.hairlineWidth * 2,
        borderBottomColor: hairline(),
      }}
    >
      <Pressable
        onPress={() => launchGame(path as Href)}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={{ flex: 1, paddingVertical: spacing(14), outline: "none" }}
      >
        <Text size="md" weight={400} numberOfLines={1}>
          {title}
        </Text>
      </Pressable>
      <Meter
        value={game.rating.difficulty / 100}
        style={{ width: spacing(40) }}
      />
      <FavButton
        isFavorite={isFavorite}
        onToggleFavorite={() => onToggleFavorite(path)}
        size={spacing(36)}
        iconSize={spacing(20)}
        activeColor={theme.accent}
        inactiveColor={theme.faint}
      />
    </View>
  );
}
