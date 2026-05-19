import { usePathname, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  calculateWinRate,
  GAME_MENU_INFO,
  getGameInfo,
  loadStatsMap,
  normalizeGamePath,
  recordAttempt,
  recordResult,
  type GameStats,
  type GameStatsMap,
} from "./game-menu";

type HomeButtonProps = {
  ended?: boolean;
  won?: boolean;
};

const EMPTY_STATS: GameStats = {
  attempts: 0,
  wins: 0,
  losses: 0,
};

export default function HomeButton({ ended, won }: HomeButtonProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = normalizeGamePath(usePathname());
  const info = getGameInfo(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const [statsMap, setStatsMap] = useState<GameStatsMap>({});
  const attemptedPathRef = useRef<string | null>(null);
  const prevEndedRef = useRef(false);

  const currentStats = statsMap[pathname] ?? EMPTY_STATS;

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
    prevEndedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    if (attemptedPathRef.current === pathname) return;
    attemptedPathRef.current = pathname;

    let cancelled = false;
    recordAttempt(pathname).then((nextMap) => {
      if (!cancelled) setStatsMap(nextMap);
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!ended || prevEndedRef.current) return;
    prevEndedRef.current = true;
    if (typeof won !== "boolean") return;

    let cancelled = false;
    recordResult(pathname, won).then((nextMap) => {
      if (!cancelled) setStatsMap(nextMap);
    });

    return () => {
      cancelled = true;
    };
  }, [ended, won, pathname]);

  function goHomeFromMenu() {
    setMenuOpen(false);
    router.push("/");
  }

  return (
    <>
      <View style={[styles.menuBtnWrap, { top: insets.top + 8 }]}>
        <Pressable style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
          <View style={styles.hamburgerIcon}>
            <View style={styles.hamburgerBar} />
            <View style={styles.hamburgerBar} />
            <View style={styles.hamburgerBar} />
          </View>
        </Pressable>
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { marginTop: insets.top + 12 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Menu</Text>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setMenuOpen(false)}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <Pressable style={styles.homeActionBtn} onPress={goHomeFromMenu}>
                <Text style={styles.homeActionText}>Home</Text>
              </Pressable>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  How to Play: {info.title}
                </Text>
                {info.howToPlay.map((line) => (
                  <Text key={line} style={styles.ruleLine}>
                    - {line}
                  </Text>
                ))}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Statistics</Text>
                <Text style={styles.statsHeadline}>Current game</Text>
                <Text style={styles.statsLine}>
                  Attempts: {currentStats.attempts}
                </Text>
                <Text style={styles.statsLine}>Wins: {currentStats.wins}</Text>
                <Text style={styles.statsLine}>
                  Losses: {currentStats.losses}
                </Text>
                <Text style={styles.statsLine}>
                  Win rate: {calculateWinRate(currentStats)}
                </Text>

                <Text style={styles.statsHeadline}>All games</Text>
                {orderedStatsRows.map((row) => (
                  <Text key={row.path} style={styles.statsLine}>
                    {row.title}: {row.stats.attempts} attempts, {row.stats.wins}
                    W/{row.stats.losses}L ({calculateWinRate(row.stats)})
                  </Text>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuBtnWrap: {
    position: "absolute",
    left: 8,
    zIndex: 100,
    elevation: 4,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#ececec",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#c6c6c6",
  },
  hamburgerIcon: {
    width: 20,
    gap: 3,
  },
  hamburgerBar: {
    height: 2,
    borderRadius: 1,
    backgroundColor: "#222",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  modalCard: {
    width: "100%",
    maxWidth: 860,
    height: "88%",
    backgroundColor: "#f3f3f3",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cecece",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#d7d7d7",
    backgroundColor: "#e9e9e9",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: "#b5b5b5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f7f7f7",
  },
  closeBtnText: {
    fontWeight: "600",
  },
  modalContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 32,
  },
  homeActionBtn: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#dedede",
    borderWidth: 1,
    borderColor: "#bcbcbc",
  },
  homeActionText: {
    fontWeight: "700",
    fontSize: 16,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfdfdf",
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  ruleLine: {
    fontSize: 14,
    lineHeight: 20,
    color: "#202020",
  },
  statsHeadline: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "700",
  },
  statsLine: {
    fontSize: 14,
    lineHeight: 20,
  },
});
