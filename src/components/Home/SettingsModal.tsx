import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import ModalFull from "../Modals/ModalFull";
import { textStyles } from "@/styles/textStyles";
import { modalStyles } from "@/styles/modalStyles";
import { flexStyles } from "@/styles/flexStyles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { SettingControl } from "../common/SettingControl";
import { ThemeName } from "@/data/game-menu";

interface Props {
  onClose: () => void;
}

export const SettingsModal = ({ onClose }: Props) => {
  const { settings, updateSettings, isLoading } = useGlobalSettings();

  if (isLoading) {
    return null; // Or a loading indicator
  }

  return (
    <ModalFull onClose={onClose}>
      <ScrollView contentContainerStyle={modalStyles.scrollContent}>
        <View style={styles.settingsSection}>
          <Text style={textStyles.h3}>Global Settings</Text>

          <SettingControl
            label="Theme"
            value={settings.theme}
            type="string"
            options={[
              { label: "Dark", value: "dark" },
              { label: "Light", value: "light" },
            ]}
            onChange={(val) => updateSettings({ theme: val as ThemeName })}
          />

          <SettingControl
            label="Show Hints"
            value={settings.showHints}
            type="boolean"
            onChange={(val) => updateSettings({ showHints: val })}
          />
        </View>
      </ScrollView>
    </ModalFull>
  );
};

const styles = StyleSheet.create({
  settingsSection: {
    ...flexStyles.colCentered,
    alignItems: "flex-start",
    padding: 20,
    width: "100%",
    gap: 16,
  },
});
