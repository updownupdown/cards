import {
  clearLastGameSession,
  DEFAULT_GLOBAL_SETTINGS,
  resetAllSettings,
} from "@/data/game-menu";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors } from "@/styles/styles";
import Constants from "expo-constants";
import React from "react";
import { Linking, ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { AddToHomeScreenNotice } from "../common/AddToHomeScreenNotice";
import { SettingControl } from "../common/SettingControl";
import { Text } from "../common/Text";
import { GameCreators } from "./GameCreators";
import ModalFull, { ModalHeading } from "./ModalFull";

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

export const HomeModal = ({ onClose, onHomeDataInvalidated }: Props) => {
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
    return null;
  }

  return (
    <ModalFull showLogo onClose={onCloseAndRefresh}>
      <ScrollView
        contentContainerStyle={[
          modalStyles.scrollContent,
          flexStyles.colCentered,
          flexStyles.fullWidth,
          {
            gap: spacing(30),
            paddingVertical: spacing(30),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            flexStyles.flex1,
            { gap: spacing(20) },
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
          <SettingControl
            label="Show background animations"
            value={settings.showAnimations}
            type="boolean"
            onChange={(val) => {
              void updateSettings({ showAnimations: val });
            }}
          />
        </View>

        <AddToHomeScreenNotice />

        <View
          style={[
            flexStyles.colStart,
            flexStyles.fullWidth,
            flexStyles.spaceBetween,
            {
              gap: spacing(12),
              padding: spacing(20),
              paddingTop: spacing(16),
              borderRadius: spacing(12),
              borderWidth: 1,
              borderColor: Colors.K800,
            },
          ]}
        >
          <ModalHeading
            color={Colors.K200}
            title="Design & Development"
            iconName="attribution"
          />

          <Text>James Carmichael</Text>
          <Text
            size="sm"
            weight={500}
            color={Colors.accentBlue}
            onPress={() =>
              void Linking.openURL("https://github.com/updownupdown/")
            }
          >
            GitHub
          </Text>
        </View>

        <View
          style={[
            flexStyles.colStart,
            flexStyles.fullWidth,
            flexStyles.spaceBetween,
            {
              gap: spacing(12),
              padding: spacing(20),
              paddingTop: spacing(16),
              borderRadius: spacing(12),
              borderWidth: 1,
              borderColor: Colors.K800,
            },
          ]}
        >
          <GameCreators />
        </View>

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
                  onClose();
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
            text="Reset all app data"
          />
        )}

        <Text size="sm" weight={300} color={Colors.K600}>
          {"Last build: " +
            (Constants.expoConfig?.extra?.buildDate
              ? formatBuildDate(Constants.expoConfig.extra.buildDate)
              : "N/A")}
        </Text>
      </ScrollView>
    </ModalFull>
  );
};
