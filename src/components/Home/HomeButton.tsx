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
import { buttonStyles } from "@/styles/buttonStyles";
import { Icon } from "../icons";
import { Colors, MaxContentHeight, MaxContentWidth } from "@/constants/theme";
import { textStyles } from "@/styles/textStyles";

type MenuButtonProps = {
  ended?: boolean;
  won?: boolean;
};

const EMPTY_STATS: GameStats = {
  attempts: 0,
  wins: 0,
  losses: 0,
};

export default function MenuButton({ ended, won }: MenuButtonProps) {
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

  return (
    <>
      <Pressable
        style={buttonStyles.headerButton}
        onPress={() => setMenuOpen(true)}
      >
        <Icon name="menu" />
      </Pressable>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard]}>
            <View style={styles.modalHeader}>
              <Text style={textStyles.title}>{info.title}</Text>

              <Pressable
                style={styles.closeBtn}
                onPress={() => setMenuOpen(false)}
              >
                <Icon name="close" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.sectionCard}>
                <Text style={textStyles.title}>How to Play</Text>
                {info.howToPlay.map((line) => (
                  <Text key={line} style={textStyles.default}>
                    - {line}
                  </Text>
                ))}
              </View>

              <View style={styles.sectionCard}>
                <Text style={textStyles.title}>Statistics</Text>
                <Text style={textStyles.default}>
                  Attempts: {currentStats.attempts}
                </Text>
                <Text style={textStyles.default}>
                  Wins: {currentStats.wins}
                </Text>
                <Text style={textStyles.default}>
                  Losses: {currentStats.losses}
                </Text>
                <Text style={textStyles.default}>
                  Win rate: {calculateWinRate(currentStats)}
                </Text>

                {/* Stats for ALL games */}
                {/* <Text style={textStyles.default}>All games</Text>
                {orderedStatsRows.map((row) => (
                  <Text key={row.path} style={textStyles.default}>
                    {row.title}: {row.stats.attempts} attempts, {row.stats.wins}
                    W/{row.stats.losses}L ({calculateWinRate(row.stats)})
                  </Text>
                ))} */}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  modalCard: {
    width: "100%",
    maxWidth: MaxContentWidth,
    height: "100%",
    maxHeight: MaxContentHeight,
    backgroundColor: Colors.K100,
    borderRadius: 8,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    padding: 12,
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
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.K200,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
});
