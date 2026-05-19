import { Link, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  HOME_GAME_ENTRIES,
  loadFavoriteGames,
  sortHomeGames,
  toggleFavoriteGame,
} from "../components/Home/game-menu";

export default function HomeScreen() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.linkCol}>
        {favoriteGames.length > 0 ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Favourites</Text>
            </View>
            {favoriteGames.map((game) => (
              <View key={game.path} style={styles.row}>
                <Link href={game.path as Href} style={styles.linkText}>
                  {game.label}
                </Link>
                <Pressable
                  style={[styles.starBtn, styles.starBtnOn]}
                  onPress={() => onToggleFavorite(game.path)}
                >
                  <Text style={styles.starBtnText}>Unstar</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>All Games</Text>
        </View>
        {nonFavoriteGames.map((game) => (
          <View key={game.path} style={styles.row}>
            <Link href={game.path as Href} style={styles.linkText}>
              {game.label}
            </Link>
            <Pressable
              style={styles.starBtn}
              onPress={() => onToggleFavorite(game.path)}
            >
              <Text style={styles.starBtnText}>Star</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 16,
  },
  linkCol: {
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "stretch",
    gap: 6,
    minHeight: "100%",
    width: "100%",
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeaderRow: {
    marginTop: 8,
    marginBottom: 2,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  sectionHeader: {
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#334155",
    fontFamily: "Outfit_600SemiBold",
  },
  linkText: {
    fontSize: 16,
    backgroundColor: "#aaa",
    paddingVertical: 14,
    flex: 1,
    textAlign: "center",
    boxShadow: "1px 2px 4px rgba(0,0,0,.1), 2px 4px 20px rgba(0,0,0,.1)",
    fontFamily: "Outfit_300Light",
  },
  starBtn: {
    width: 74,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#d1d5db",
  },
  starBtnOn: {
    backgroundColor: "#f59e0b",
  },
  starBtnText: {
    fontFamily: "Outfit_500Medium",
    color: "#111827",
  },
});
