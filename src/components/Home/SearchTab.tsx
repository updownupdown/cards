import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { glassEdge, glassFill } from "@/components/ui/FloatingBar";
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
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { FavButton } from "./FavButton";
import { SEARCH_HOME_TAB_INDEX } from "./home-view-state";
import { useStarfield } from "./Starfield";

const FILTERS = ["all", "unplayed", "favorites", "unbeaten", "won"] as const;
type Filter = (typeof FILTERS)[number];

// Up arrows run low to high, down arrows high to low.
const SORTS = [
  "az",
  "recent",
  "easiest",
  "hardest",
  "leastLuck",
  "mostLuck",
  "leastPlayed",
  "mostPlayed",
] as const;
type Sort = (typeof SORTS)[number];

/** The Recent order lists this many games, last played first. */
const RECENT_COUNT = 20;
/** Width of the index letters' column, in the A–Z order. */
const INDEX_WIDTH = 44;
/** Every result row is this tall, so the index knows where sections start. */
const ROW_HEIGHT = 52;
/** The list's space above its first row. */
const LIST_TOP = 8;

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<HomeGameEntry, Section>,
);

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
  const scrollY = useRef(new Animated.Value(0)).current;
  const starfield = useStarfield();
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: Platform.OS !== "web",
        // The sky behind moves with the list.
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) =>
          starfield?.reportScroll(
            SEARCH_HOME_TAB_INDEX,
            event.nativeEvent.contentOffset.y,
          ),
      }),
    [scrollY, starfield],
  );

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
    if (sort === "easiest") by(([, game]) => game.rating.difficulty);
    if (sort === "hardest") by(([, game]) => -game.rating.difficulty);
    if (sort === "leastLuck") by(([, game]) => game.rating.luck);
    if (sort === "mostLuck") by(([, game]) => -game.rating.luck);
    if (sort === "leastPlayed") by((entry) => attempts(entry));
    if (sort === "mostPlayed") by((entry) => -attempts(entry));
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

  const sortOptions: Record<
    Sort,
    { label: string; icon?: IconName; accessibilityLabel?: string }
  > = {
    az: { label: t("search.sortAZ") },
    recent: { label: t("search.sortRecent") },
    easiest: {
      label: t("search.sortDifficulty"),
      icon: "arrow-up",
      accessibilityLabel: t("search.sortEasiest"),
    },
    hardest: {
      label: t("search.sortDifficulty"),
      icon: "arrow-down",
      accessibilityLabel: t("search.sortHardest"),
    },
    leastLuck: {
      label: t("search.sortLuck"),
      icon: "arrow-up",
      accessibilityLabel: t("search.sortLeastLuck"),
    },
    mostLuck: {
      label: t("search.sortLuck"),
      icon: "arrow-down",
      accessibilityLabel: t("search.sortMostLuck"),
    },
    leastPlayed: {
      label: t("search.sortPlays"),
      icon: "arrow-up",
      accessibilityLabel: t("search.sortLeastPlayed"),
    },
    mostPlayed: {
      label: t("search.sortPlays"),
      icon: "arrow-down",
      accessibilityLabel: t("search.sortMostPlayed"),
    },
  };
  const filterLabels: Record<Filter, string> = {
    all: t("search.all"),
    unplayed: t("search.unplayed"),
    favorites: t("sections.favorites"),
    unbeaten: t("search.unbeaten"),
    won: t("search.won"),
  };

  const column = {
    width: "100%",
    maxWidth: ui.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: pageSidePadding,
  } as const;

  return (
    <View style={{ flex: 1 }}>
      {/* Starts under the header, so the index letters stick just below it,
          and rows end at the header's foot: the header needs no background
          of its own, and the sky shows through it. */}
      <View style={{ flex: 1, marginTop: headerHeight }}>
        <AnimatedSectionList
          sections={sections}
          keyExtractor={([path]) => path}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          // On the web, "on-drag" dismisses on any scroll, and filtering the
          // list scrolls it: the field lost focus after every letter. A drag
          // by the finger closes the keyboard there instead.
          keyboardDismissMode={Platform.OS === "web" ? "none" : "on-drag"}
          {...(Platform.OS === "web"
            ? ({ onTouchMove: () => Keyboard.dismiss() } as object)
            : null)}
          stickySectionHeadersEnabled={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingTop: spacing(LIST_TOP),
            paddingBottom: contentPaddingBottom,
          }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={16}
          maxToRenderPerBatch={16}
          windowSize={7}
          // On the web the letters ride in the list itself (see
          // StickyIndexLetters), so the browser scrolls them with the rows.
          ListHeaderComponent={
            indexed && Platform.OS === "web" ? (
              <StickyIndexLetters sections={sections} />
            ) : null
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
        {indexed && Platform.OS !== "web" && (
          <IndexLetters sections={sections} scrollY={scrollY} />
        )}
      </View>

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
        }}
      >
        <View
          style={[
            column,
            { gap: spacing(16), paddingBottom: spacing(10), zIndex: 2 },
          ]}
        >
          <SearchBox query={query} onChange={setQuery} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            // Room above and below for the pills' shadows.
            style={{
              marginHorizontal: -pageSidePadding,
              marginVertical: -spacing(10),
            }}
            contentContainerStyle={{
              paddingHorizontal: pageSidePadding,
              paddingVertical: spacing(10),
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
            <Text size="sm" weight={400} color={theme.dim}>
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
                color={theme.accent}
              />
            </Pressable>
            {/* Hangs from the button, its right edge on the chevron's. */}
            {sortOpen && (
              <View
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: spacing(8),
                  minWidth: spacing(200),
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
                      sortOptions[option].accessibilityLabel ??
                      sortOptions[option].label
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
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
        {/* A tap anywhere outside the menu closes it. */}
        {sortOpen && (
          <Pressable
            accessibilityLabel={t("search.sortBy")}
            onPress={() => setSortOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 10000,
              zIndex: 1,
            }}
          />
        )}
      </View>
    </View>
  );
}

function SortLabel({
  option,
  color,
}: {
  option: { label: string; icon?: IconName };
  color: string;
}) {
  const { spacing } = useResponsiveMetrics();
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: spacing(4) }}
    >
      <Text size="sm" weight={500} color={color}>
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
      // The fill of the floating bars, without their shadow, and round
      // ended like them.
      style={{
        backgroundColor: glassFill(),
        borderRadius: spacing(24),
        height: spacing(48),
        borderWidth: 1,
        borderColor: query ? rgba(theme.accent, 0.5) : glassEdge(),
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing(18),
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
        placeholderTextColor={theme.dim}
        autoCapitalize="none"
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          color: theme.ink,
          fontSize: font(16),
          fontFamily: FontWeight[400],
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
 * The index down the left, like a printed index: each section's letter sits
 * beside its first row, stays at the top while its games scroll past, and is
 * pushed off by the next letter, so only one is ever at the top. All of it is
 * worked out from the scroll position, since every row is the same height.
 */
function IndexLetters({
  sections,
  scrollY,
}: {
  sections: Section[];
  scrollY: Animated.Value;
}) {
  const { spacing, font, ui } = useResponsiveMetrics();
  const letterStyle = useLetterStyle();
  const letterHeight = font(36);
  const rowHeight = spacing(ROW_HEIGHT);
  const starts: number[] = [];
  let top = spacing(LIST_TOP);
  for (const section of sections) {
    starts.push(top);
    top += section.data.length * rowHeight;
  }
  const far = 100000;
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { overflow: "hidden", pointerEvents: "none" },
      ]}
    >
      <View
        style={{
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          alignSelf: "center",
          flex: 1,
        }}
      >
        {sections.map((section, index) => {
          const start = starts[index];
          // Pushed off once the next letter reaches it.
          const leave = (starts[index + 1] ?? far) - letterHeight - spacing(6);
          const translateY = scrollY.interpolate({
            inputRange: [
              start - far,
              start,
              Math.max(start, leave),
              Math.max(start, leave) + far,
            ],
            outputRange: [far, 0, 0, -far],
          });
          return (
            <Animated.View
              key={section.key}
              style={{
                position: "absolute",
                top: 0,
                left: spacing(layoutDims.pagePadding),
                transform: [{ translateY }],
              }}
            >
              <Text weight={500} color={theme.accent} style={letterStyle}>
                {section.key}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

/** The style of an index letter, beside its section's first row. */
function useLetterStyle() {
  const { spacing, font } = useResponsiveMetrics();
  return {
    fontSize: font(22),
    lineHeight: font(36),
    paddingTop: spacing(6),
  };
}

/**
 * The index on the web. Driving the letters from scroll events, as
 * IndexLetters does, leaves them a frame or more behind the list there, since
 * the browser scrolls the page off the main thread. Instead each letter sits
 * in a box as tall as its section, inside the list, and sticks to the top of
 * the list with CSS: the browser moves it with the rows, holds it at the top
 * while its games scroll past, and lets the next section's box push it off.
 */
export function StickyIndexLetters({ sections }: { sections: Section[] }) {
  const { spacing, ui } = useResponsiveMetrics();
  const letterStyle = useLetterStyle();
  const rowHeight = spacing(ROW_HEIGHT);
  let top = 0;
  return (
    // No height of its own, so the rows start where they would without it.
    <View style={{ height: 0, zIndex: 1, pointerEvents: "none" }}>
      <View
        style={{
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          alignSelf: "center",
        }}
      >
        {sections.map((section) => {
          const start = top;
          const height = section.data.length * rowHeight;
          top += height;
          return (
            <View
              key={section.key}
              testID={`index ${section.key}`}
              style={{
                position: "absolute",
                top: start,
                height,
                left: spacing(layoutDims.pagePadding),
              }}
            >
              <View
                // Not in React Native's types, but react-native-web passes it
                // through, as its own sticky headers do.
                style={{ position: "sticky" as "relative", top: 0 }}
              >
                <Text weight={500} color={theme.accent} style={letterStyle}>
                  {section.key}
                </Text>
              </View>
            </View>
          );
        })}
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
        height: spacing(ROW_HEIGHT),
        flexDirection: "row",
        alignItems: "center",
        gap: spacing(12),
        borderBottomWidth: 1,
        borderBottomColor: hairline(),
      }}
    >
      <Pressable
        onPress={() => launchGame(path as Href)}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={{
          flex: 1,
          alignSelf: "stretch",
          justifyContent: "center",
          outline: "none",
        }}
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
        inactiveColor={theme.dim}
      />
    </View>
  );
}
