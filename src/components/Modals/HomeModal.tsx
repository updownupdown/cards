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
import { router } from "expo-router";
import React from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { AddToHomeScreenNotice } from "../common/AddToHomeScreenNotice";
import { SettingControl } from "../common/SettingControl";
import { Text } from "../common/Text";
import ModalFull from "./ModalFull";

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

  const footerText = { size: "xs", weight: 300, color: Colors.K600 } as const;
  const footerLink = {
    size: "xs",
    weight: 500,
    color: Colors.accentBlue,
  } as const;

  return (
    <ModalFull showLogo onClose={onCloseAndRefresh}>
      <ScrollView
        contentContainerStyle={[
          modalStyles.scrollContent,
          flexStyles.colCentered,
          flexStyles.fullWidth,
          {
            flexGrow: 1,
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
            { gap: spacing(24) },
          ]}
        >
          <SettingControl
            label="Resume game on startup"
            description="Reopen the last game when the app starts."
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
            label="Show animations"
            description="Weather and scenery effects behind the cards."
            value={settings.showAnimations}
            type="boolean"
            onChange={(val) => {
              void updateSettings({ showAnimations: val });
            }}
          />
          <SettingControl
            label="Show tips"
            description="Show a quick start summary for new games."
            value={settings.showTipsForNewGames}
            type="boolean"
            onChange={(val) => {
              void updateSettings({ showTipsForNewGames: val });
            }}
          />
          <SettingControl
            label="Keep screen awake"
            description="Keeps the screen on for 10 minutes after your last touch."
            value={settings.keepScreenAwake}
            type="boolean"
            onChange={(val) => {
              void updateSettings({ keepScreenAwake: val });
            }}
          />
          {/* Vibration isn't available in browsers, so native only. */}
          {Platform.OS !== "web" && (
            <SettingControl
              label="Haptic feedback"
              description="Vibrates on card drag and drop, and game wins. Haptics must be enabled in your phone settings."
              value={settings.hapticFeedback}
              type="boolean"
              onChange={(val) => {
                void updateSettings({ hapticFeedback: val });
              }}
            />
          )}
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

        {/* Footer: credits, links and data reset, kept small at the bottom. */}
        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            { gap: spacing(6), marginTop: "auto" },
          ]}
        >
          <Text {...footerText} style={{ textAlign: "center" }}>
            Starfield background by{" "}
            <Text
              {...footerLink}
              onPress={() =>
                void Linking.openURL("https://unsplash.com/@olenkasergienko")
              }
            >
              Olena Bohovyk
            </Text>
          </Text>

          <Text {...footerText} style={{ textAlign: "center" }}>
            Tao Te Ching translation by{" "}
            <Text
              {...footerLink}
              onPress={() =>
                void Linking.openURL(
                  "https://www.goodreads.com/author/show/5667733.John_H_McDonald",
                )
              }
            >
              John H. McDonald
            </Text>
          </Text>

          <Text
            {...footerLink}
            style={{ textAlign: "center" }}
            onPress={() => {
              onClose();
              router.push("/privacy");
            }}
          >
            Privacy Policy
          </Text>

          {isResetConfirmationVisible ? (
            <View
              style={[
                flexStyles.rowCentered,
                { gap: spacing(14), flexWrap: "wrap" },
              ]}
            >
              <Text {...footerText}>Erase all progress and settings?</Text>
              <Button
                textOnly
                size="xs"
                uppercase={false}
                text="Cancel"
                disabled={isResettingData}
                onPress={() => setIsResetConfirmationVisible(false)}
              />
              <Button
                textOnly
                size="xs"
                uppercase={false}
                text="Reset"
                theme={Colors.cardSelectRed}
                disabled={isResettingData}
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
              />
            </View>
          ) : (
            <Button
              textOnly
              size="xs"
              uppercase={false}
              text="Reset all app data"
              theme={Colors.cardSelectRed}
              onPress={() => setIsResetConfirmationVisible(true)}
            />
          )}
        </View>
      </ScrollView>
    </ModalFull>
  );
};
