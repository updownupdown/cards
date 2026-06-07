import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../Button/Button";
import { LoadingOverlay } from "../common/LoadingOverlay";
import { GamesList } from "./GamesList";
import { SettingsModal } from "./SettingsModal";
import { StatsModal } from "./StatsModal";
import { Colors, FontWeight, rgba } from "@/styles/styles";

export const homePadding = 20;

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  useEffect(() => {
    // Delay rendering heavy components so the UI can mount and fade in first.
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <LoadingOverlay isLoaded={!!isLoaded} />

      {showStatsModal && (
        <StatsModal onClose={() => setShowStatsModal(false)} />
      )}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      <View
        style={[
          {
            flex: 1,
            backgroundColor: Colors.background,
            paddingTop: homePadding,
            paddingHorizontal: homePadding * 1.5,
          },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              position: "relative",
              zIndex: 2,
              paddingBottom: homePadding * 0.5,
              boxShadow: `0 0 20px ${rgba(Colors.background, 1)}`,
            },
          ]}
        >
          <Text
            style={[
              flexStyles.flex1,
              textStyles.default,
              {
                paddingLeft: homePadding,
                fontFamily: FontWeight[200],
                fontSize: 22,
              },
            ]}
          >
            Solo Suite
          </Text>

          <Button
            iconName="chart"
            onPress={() => setShowStatsModal(true)}
            style={[styles.headerBtn]}
          />

          <Button
            iconName="settings"
            onPress={() => setShowSettingsModal(true)}
            style={[styles.headerBtn]}
          />
        </View>

        <GamesList />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    backgroundColor: "unset",
    boxShadow: "unset",
    paddingHorizontal: 12,
  },
});
