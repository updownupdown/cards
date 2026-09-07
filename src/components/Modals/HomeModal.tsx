import {
  clearLastGameSession,
  DEFAULT_GLOBAL_SETTINGS,
  populateTestGameProgress,
  resetAllSettings,
} from "@/data/game-menu";
import {
  populateTestNodesProgress,
  resetNodesProgress,
} from "@/data/nodes-progress";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors } from "@/styles/styles";
import { isLocalDevEnvironment } from "@/utils/utils";
import Constants from "expo-constants";
import React from "react";
import { Linking, ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { AddToHomeScreenNotice } from "../common/AddToHomeScreenNotice";
import { SettingControl } from "../common/SettingControl";
import { Text } from "../common/Text";
import ModalFull from "./ModalFull";

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
  const [isPopulatingTestData, setIsPopulatingTestData] = React.useState(false);
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
          <SettingControl
            label="Show tips for new games"
            value={settings.showTipsForNewGames}
            type="boolean"
            onChange={(val) => {
              void updateSettings({ showTipsForNewGames: val });
            }}
          />
        </View>

        <AddToHomeScreenNotice />

        {isLocalDevEnvironment() && (
          <Button
            size="md"
            uppercase={false}
            text="Populate test progress"
            iconName="nodes"
            theme="blue"
            disabled={isPopulatingTestData}
            onPress={async () => {
              setIsPopulatingTestData(true);
              try {
                await Promise.all([
                  populateTestGameProgress(),
                  populateTestNodesProgress(),
                ]);
                onHomeDataInvalidated();
                onClose();
              } finally {
                setIsPopulatingTestData(false);
              }
            }}
          />
        )}

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
                  await resetNodesProgress();
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
          Starfield background image by{" "}
          <Text
            size="sm"
            weight={500}
            color={Colors.accentBlue}
            onPress={() =>
              void Linking.openURL("https://unsplash.com/@olenkasergienko")
            }
          >
            Olena Bohovyk
          </Text>
        </Text>

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
