import { buttonStyles } from "@/styles/buttonStyles";
import { modalStyles } from "@/styles/modalStyles";
import { Colors } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import {
  calculateWinRate,
  getGameInfo,
  loadStatsMap,
  normalizeGamePath,
  recordAttempt,
  recordResult,
  toggleFavoriteGame,
  type GameStats,
  type GameStatsMap,
} from "../../data/game-menu";
import { Button } from "../Button/Button";
import ModalFull from "./ModalFull";

export const EMPTY_STATS: GameStats = {
  attempts: 0,
  wins: 0,
  losses: 0,
};

type Props = {
  onClose: () => void;
  currentStats: GameStats;
};

export default function InfoModal({ currentStats, onClose }: Props) {
  const pathname = normalizeGamePath(usePathname());
  const info = getGameInfo(pathname);

  const rules = info.rules ?? info.howToPlay;

  async function onToggleFavorite(path: string) {
    const updated = await toggleFavoriteGame(path);
    // setFavorites(new Set(updated));
  }

  return (
    <>
      <ModalFull onClose={onClose} showHomeButton>
        {/* Scroll view */}
        <ScrollView contentContainerStyle={modalStyles.scrollContent}>
          {/* Title */}
          <Text style={textStyles.h1}>{info.title}</Text>

          {/* Stats and favourite */}
          <View style={modalStyles.statsAndFav}>
            <View style={modalStyles.stats}>
              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>Attempts</Text>
                <Text style={modalStyles.statsTextValue}>
                  {currentStats.attempts}
                </Text>
              </View>

              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>Wins</Text>
                <Text style={modalStyles.statsTextValue}>
                  {currentStats.wins}
                </Text>
              </View>

              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>Lost</Text>
                <Text style={modalStyles.statsTextValue}>
                  {currentStats.losses}
                </Text>
              </View>

              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>Win rate</Text>
                <Text style={modalStyles.statsTextValue}>
                  {calculateWinRate(currentStats)}
                </Text>
              </View>
            </View>

            <Button onPress={() => {}} iconName="star-outline" size="text" />
          </View>

          {/* Rules */}
          <View style={modalStyles.rules}>
            {rules.map((line) => (
              <Text key={line} style={modalStyles.rulesText}>
                {line}
              </Text>
            ))}
          </View>
        </ScrollView>

        {/* Play button */}
        <View style={modalStyles.modalFooter}>
          <Button onPress={onClose} size="large" text="Play" fullWidth />
        </View>
      </ModalFull>
    </>
  );
}
