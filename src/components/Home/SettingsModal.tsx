import {
  clearLastGameSession,
  DEFAULT_GLOBAL_SETTINGS,
  resetAllSettings,
} from "@/data/game-menu";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import Constants from "expo-constants";
import React from "react";
import { ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { AddToHomeScreenNotice } from "../common/AddToHomeScreenNotice";
import { SettingControl } from "../common/SettingControl";
import ModalFull from "../Modals/ModalFull";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors } from "@/styles/styles";
import { Text } from "../common/Text";

function formatBuildDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface Props {
  onClose: () => void;
  onHomeDataInvalidated: () => void;
}

export const SettingsModal = ({ onClose, onHomeDataInvalidated }: Props) => {
  const { settings, updateSettings, isLoading } = useGlobalSettings();
  const modalStyles = useModalStyles();
  const [isResetConfirmationVisible, setIsResetConfirmationVisible] =
    React.useState(false);
  const [isResettingData, setIsResettingData] = React.useState(false);
  const { spacing } = useResponsiveMetrics();

  const onCloseAndRefresh = () => {
    onHomeDataInvalidated();
    onClose();
  };

  if (isLoading) {
    return null; // Or a loading indicator
  }

  return (
    <ModalFull title="Settings" onClose={onCloseAndRefresh}>
      <ScrollView
        contentContainerStyle={[modalStyles.scrollContent, { flex: 1 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            flexStyles.fullHeight,
            flexStyles.gap40,
          ]}
        >
          <View
            style={[
              flexStyles.colCentered,
              flexStyles.fullWidth,
              flexStyles.flex1,
              { gap: 20 },
            ]}
          >
            <SettingControl
              label="Resume last game on startup"
              value={settings.resumeLastGame}
              type="boolean"
              onChange={(val) => {
                void updateSettings({ resumeLastGame: val });
                if (!val) {
                  void clearLastGameSession();
                }
              }}
            />
          </View>

          <AddToHomeScreenNotice />

          {isResetConfirmationVisible ? (
            <View
              style={[
                flexStyles.rowCentered,
                { gap: spacing(16), flexWrap: "wrap" },
              ]}
            >
              <Button
                size="md"
                uppercase={false}
                onPress={() => setIsResetConfirmationVisible(false)}
                text="Cancel"
                flat
                disabled={isResettingData}
              />

              <Button
                size="md"
                uppercase={false}
                onPress={async () => {
                  setIsResettingData(true);
                  try {
                    updateSettings(DEFAULT_GLOBAL_SETTINGS);
                    await resetAllSettings();
                    onHomeDataInvalidated();
                    setIsResetConfirmationVisible(false);
                  } finally {
                    setIsResettingData(false);
                  }
                }}
                text="Confirm reset"
                theme="red"
                disabled={isResettingData}
              />
            </View>
          ) : (
            <Button
              size="md"
              uppercase={false}
              onPress={() => setIsResetConfirmationVisible(true)}
              text="Reset all game data"
              flat
            />
          )}

          <Text size="sm" weight={300} color={Colors.K400}>
            {"Last build: " +
              (Constants.expoConfig?.extra?.buildDate
                ? formatBuildDate(Constants.expoConfig.extra.buildDate)
                : "N/A")}
          </Text>
        </View>
      </ScrollView>
    </ModalFull>
  );
};
