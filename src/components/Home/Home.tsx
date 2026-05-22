import { Icon } from "@/icons";
import { homeStyles } from "@/styles/homeStyles";
import { Link, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  calculateWinRate,
  GAME_MENU_INFO,
  GameStatsMap,
  getGameInfo,
  HOME_GAME_ENTRIES,
  loadFavoriteGames,
  loadStatsMap,
  sortHomeGames,
  toggleFavoriteGame,
} from "../../data/game-menu";
import { textStyles } from "@/styles/textStyles";
import { EMPTY_STATS } from "@/components/Modals/InfoModal";
import { Colors } from "@/styles/styles";

export default function Home() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const [statsMap, setStatsMap] = useState<GameStatsMap>({});

  useEffect(() => {
    let cancelled = false;
    loadStatsMap().then((loaded) => {
      if (!cancelled) setStatsMap(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadFavoriteGames().then((loaded) => {
      if (!cancelled) setFavorites(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const orderedGames = useMemo(
    () => sortHomeGames(HOME_GAME_ENTRIES, favorites),
    [favorites],
  );
  const favoriteGames = useMemo(
    () => orderedGames.filter((game) => favorites.has(game.path)),
    [orderedGames, favorites],
  );
  const nonFavoriteGames = useMemo(
    () => orderedGames.filter((game) => !favorites.has(game.path)),
    [orderedGames, favorites],
  );

  async function onToggleFavorite(path: string) {
    const updated = await toggleFavoriteGame(path);
    setFavorites(new Set(updated));
  }

  const orderedStatsRows = useMemo(
    () =>
      Object.entries(GAME_MENU_INFO)
        .map(([path, gameInfo]) => ({
          path,
          title: gameInfo.title,
          stats: statsMap[path] ?? EMPTY_STATS,
        }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [statsMap],
  );

  return (
    <ScrollView contentContainerStyle={homeStyles.scrollContent}>
      <View style={homeStyles.linkCol}>
        {favoriteGames.length > 0 ? (
          <>
            {/* "Favorites" Header */}
            <View style={homeStyles.sectionHeaderRow}>
              <Text style={homeStyles.sectionHeader}>Favorites</Text>
            </View>

            {/* Favourites */}
            {favoriteGames.map((game) => (
              <View key={game.path} style={homeStyles.gameRow}>
                <Link href={game.path as Href} style={homeStyles.gameButton}>
                  {game.label}
                </Link>
                <Pressable
                  style={[homeStyles.starBtn, homeStyles.starBtnOn]}
                  onPress={() => onToggleFavorite(game.path)}
                >
                  <Icon name="star" color={Colors.accentOrange} />
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        {/* "All Games" Heading */}
        <View style={homeStyles.sectionHeaderRow}>
          <Text style={homeStyles.sectionHeader}>All Games</Text>
        </View>

        {/* Other Games */}
        {nonFavoriteGames.map((game) => (
          <View key={game.path} style={homeStyles.gameRow}>
            <Link href={game.path as Href} style={homeStyles.gameButton}>
              {game.label}
            </Link>
            <Pressable
              style={homeStyles.starBtn}
              onPress={() => onToggleFavorite(game.path)}
            >
              <Icon name="star-outline" color={Colors.K500} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* Stats for ALL games */}
      <View style={homeStyles.gameStats}>
        <Text style={textStyles.h3}>Games Stats</Text>
        {orderedStatsRows.map((row) => (
          <Text key={row.path} style={textStyles.default}>
            {row.title}: A: {row.stats.attempts}, W: {row.stats.wins}, L:{" "}
            {row.stats.losses}, ({calculateWinRate(row.stats)})
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}
