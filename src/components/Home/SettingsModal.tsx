import { DEFAULT_GLOBAL_SETTINGS, resetGameSettings } from "@/data/game-menu";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { flexStyles } from "@/styles/flexStyles";
import { modalStyles } from "@/styles/modalStyles";
import React from "react";
import { ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { SettingControl } from "../common/SettingControl";
import { useToast } from "../common/Toast";
import ModalFull from "../Modals/ModalFull";

interface Props {
  onClose: () => void;
}

export const SettingsModal = ({ onClose }: Props) => {
  const { settings, updateSettings, isLoading } = useGlobalSettings();
  const showToast = useToast();

  if (isLoading) {
    return null; // Or a loading indicator
  }

  return (
    <ModalFull title="Settings" iconName="settings" onClose={onClose}>
      <ScrollView
        contentContainerStyle={modalStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            flexStyles.gap40,
            {
              alignItems: "flex-start",
            },
          ]}
        >
          {/* <SettingControl
          label="Theme"
          value={settings.theme}
          type="string"
          options={[
            { label: "Dark", value: "dark" },
            { label: "Light", value: "light" },
          ]}
          onChange={(val) => updateSettings({ theme: val as ThemeName })}
        /> */}

          <SettingControl
            label="Show Hints"
            value={settings.showHints}
            type="boolean"
            onChange={(val) => updateSettings({ showHints: val })}
          />

          <Button
            onPress={() => {
              updateSettings(DEFAULT_GLOBAL_SETTINGS);
              resetGameSettings();
              showToast("Settings have been reset");
            }}
            text="Reset Settings"
          />
        </View>
      </ScrollView>
    </ModalFull>
  );
};
