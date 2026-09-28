import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { hairline, Meter, Pill } from "@/components/ui/Nocturne";
import { isGameEnabled } from "@/data/games-data";
import { GAMES_DATA } from "@/data/games-registry";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { foldForSearch, localizeGameTitle } from "@/i18n/content";
import { Icon } from "@/icons";
import { FontWeight, layoutDims, rgba, theme } from "@/styles/styles";
import type { Href } from "expo-router";
import { Image } from "expo-image";
import { useMemo, useRef, useState } from "react";
import { FlatList, Platform, Pressable, TextInput, View } from "react-native";
import { FavButton } from "./FavButton";
import { gameArt, useGameCategory } from "./HomeArt";
import { HomeHeaderBackground } from "./HomeHeader";
import { useTabReadyImage } from "./TabReady";

type Filter = "all" | "unplayed" | "favorites";
type Sort = "az" | "difficulty" | "recent";
/** The Recent order lists this many games, last played first. */
const RECENT_COUNT = 20;

type SearchTabProps = {
  allEnabledGames: HomeGameEntry[];
  unplayedGamePaths: string[];
  favorites: Set<string>;
  recentPaths: string[];
  onToggleFavorite: (path: string) => void;
  showHeaderBackground: boolean;
  onScrolledChange: (isScrolled: boolean) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
};

export function SearchTab({
  allEnabledGames,
  unplayedGamePaths,
  favorites,
  recentPaths,
  onToggleFavorite,
  showHeaderBackground,
  onScrolledChange,
  contentPaddingTop,
  contentPaddingBottom,
}: SearchTabProps) {
  const { ui, spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("az");
  const [sortOpen, setSortOpen] = useState(false);
  const pageSidePadding = spacing(layoutDims.pagePadding);
  const unplayed = useMemo(
    () => new Set(unplayedGamePaths),
    [unplayedGamePaths],
  );

  const games = useMemo(() => {
    const normalizedQuery = foldForSearch(query.trim());
    const title = ([path, game]: HomeGameEntry) =>
      localizeGameTitle(game, path, language);
    let list: HomeGameEntry[] =
      sort === "recent"
        ? recentPaths
            .map((path) => [path, GAMES_DATA[path]] as HomeGameEntry)
            .filter(([, game]) => isGameEnabled(game))
            .slice(0, RECENT_COUNT)
        : [...allEnabledGames];
    list = list.filter(([path, game]) => {
      if (filter === "unplayed" && !unplayed.has(path)) return false;
      if (filter === "favorites" && !favorites.has(path)) return false;
      // Match the translated title, the English title and its aliases.
      return (
        !normalizedQuery ||
        [title([path, game]), game.title, ...(game.aliases ?? [])].some(
          (name) => foldForSearch(name).includes(normalizedQuery),
        )
      );
    });
    if (sort === "az")
      list.sort((a, b) => title(a).localeCompare(title(b), language));
    if (sort === "difficulty")
      list.sort(
        (a, b) =>
          a[1].rating.difficulty - b[1].rating.difficulty ||
          title(a).localeCompare(title(b), language),
      );
    return list;
  }, [
    allEnabledGames,
    favorites,
    filter,
    language,
    query,
    recentPaths,
    sort,
    unplayed,
  ]);

  const sortLabels: Record<Sort, string> = {
    az: t("search.sortAZ"),
    difficulty: t("search.sortDifficulty"),
    recent: t("search.sortRecent"),
  };

  const webInputProps =
    Platform.OS === "web"
      ? ({ id: "home-tab-search", name: "home-tab-search" } as object)
      : undefined;

  const header = (
    <View style={{ gap: spacing(14), marginBottom: spacing(6), zIndex: 2 }}>
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
          onChangeText={setQuery}
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
              setQuery("");
              inputRef.current?.blur();
            }}
            hitSlop={spacing(8)}
          >
            <Icon name="close" size={spacing(20)} color={theme.dim} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: spacing(8) }}>
        <Pill
          label={t("search.all")}
          selected={filter === "all"}
          onPress={() => setFilter("all")}
        />
        <Pill
          label={t("search.unplayed")}
          selected={filter === "unplayed"}
          onPress={() => setFilter("unplayed")}
        />
        <Pill
          label={t("sections.favorites")}
          iconName="star-outline"
          selected={filter === "favorites"}
          onPress={() => setFilter("favorites")}
        />
      </View>

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
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing(4),
          }}
        >
          <Text size="xs" weight={400} color={theme.ink}>
            {sortLabels[sort]}
          </Text>
          <Icon
            name={sortOpen ? "expand-less" : "expand-more"}
            size={spacing(16)}
            color={theme.dim}
          />
        </Pressable>
      </View>
      {sortOpen && (
        <View
          style={{
            alignSelf: "flex-end",
            minWidth: spacing(150),
            marginTop: -spacing(6),
            padding: spacing(4),
            borderRadius: spacing(12),
            backgroundColor: theme.raise,
            borderWidth: 1,
            borderColor: hairline(),
          }}
        >
          {(Object.keys(sortLabels) as Sort[]).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
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
              }}
            >
              <Text
                size="sm"
                weight={400}
                color={option === sort ? theme.accent : theme.ink}
              >
                {sortLabels[option]}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={games}
        keyExtractor={([path]) => path}
        style={{ flex: 1 }}
        onScroll={(event) =>
          onScrolledChange(event.nativeEvent.contentOffset.y > 1)
        }
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          alignSelf: "center",
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
          paddingHorizontal: pageSidePadding,
        }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        ListHeaderComponent={header}
        renderItem={({ item: [path, game] }) => (
          <GameRow
            path={path}
            game={game}
            isFavorite={favorites.has(path)}
            onToggleFavorite={onToggleFavorite}
          />
        )}
      />
      <HomeHeaderBackground showBackground={showHeaderBackground} />
    </View>
  );
}

/** A game in the results: its art, name, family and difficulty. */
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
  const category = useGameCategory();
  const source = gameArt(game);
  const ready = useTabReadyImage(source);
  const artSize = spacing(52);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: hairline(),
      }}
    >
      <Pressable
        onPress={() => launchGame(path as Href)}
        accessibilityRole="button"
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing(14),
          paddingVertical: spacing(10),
        }}
      >
        <Image
          source={source}
          cachePolicy="memory"
          contentFit="cover"
          style={{
            width: artSize,
            height: artSize,
            borderRadius: spacing(6),
            backgroundColor: game.gameColorDark,
          }}
          {...ready}
        />
        <View style={{ flex: 1, minWidth: 0, gap: spacing(5) }}>
          <Text size="md" weight={500} numberOfLines={1}>
            {localizeGameTitle(game, path, language)}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing(10),
            }}
          >
            <Text size="xs" weight={300} color={theme.dim} numberOfLines={1}>
              {category(game)}
            </Text>
            <Meter
              value={game.rating.difficulty / 100}
              style={{ width: spacing(44) }}
            />
          </View>
        </View>
      </Pressable>
      <FavButton
        isFavorite={isFavorite}
        onToggleFavorite={() => onToggleFavorite(path)}
        size={spacing(40)}
        iconSize={spacing(20)}
        activeColor={theme.accent}
        inactiveColor={theme.faint}
      />
    </View>
  );
}
