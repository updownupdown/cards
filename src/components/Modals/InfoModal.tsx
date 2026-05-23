import { buttonStyles } from "@/styles/buttonStyles";
import { modalStyles } from "@/styles/modalStyles";
import { textStyles } from "@/styles/textStyles";
import { usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import {
  calculateWinRate,
  getGameInfo,
  loadStatsMap,
  normalizeGamePath,
  recordAttempt,
  recordResult,
  type GameStats,
  type GameStatsMap,
} from "../../data/game-menu";
import { Icon } from "../../icons";
import { Button } from "../Button/Button";
import { Colors } from "@/styles/styles";

export const EMPTY_STATS: GameStats = {
  attempts: 0,
  wins: 0,
  losses: 0,
};

type Props = {
  ended?: boolean;
  won?: boolean;
};

export default function InfoModal({ ended, won }: Props) {
  const pathname = normalizeGamePath(usePathname());
  const info = getGameInfo(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const [statsMap, setStatsMap] = useState<GameStatsMap>({});
  const attemptedPathRef = useRef<string | null>(null);
  const prevEndedRef = useRef(false);

  const currentStats = statsMap[pathname] ?? EMPTY_STATS;

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
      <Button
        style={[buttonStyles.headerButton]}
        onPress={() => setMenuOpen(true)}
        iconName="menu"
        iconColor={Colors.K400}
      />

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={modalStyles.modalBackdrop}>
          <View style={[modalStyles.modalCard]}>
            <View style={modalStyles.modalHeader}>
              <Text style={textStyles.h3}>{info.title}</Text>

              <Button
                style={buttonStyles.headerButton}
                onPress={() => setMenuOpen(false)}
                iconName="close"
              />
            </View>

            <ScrollView contentContainerStyle={modalStyles.modalContent}>
              <View style={modalStyles.sectionCard}>
                <Text style={textStyles.h3}>How to Play</Text>
                {info.howToPlay.map((line) => (
                  <Text key={line} style={textStyles.default}>
                    - {line}
                  </Text>
                ))}
              </View>

              <View style={modalStyles.sectionCard}>
                <Text style={textStyles.h3}>Statistics</Text>
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
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
