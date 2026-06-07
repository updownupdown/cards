import { DEFAULT_GLOBAL_SETTINGS, resetGameSettings } from "@/data/game-menu";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { flexStyles } from "@/styles/flexStyles";
import { homeStyles } from "@/styles/homeStyles";
import { textStyles } from "@/styles/textStyles";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../Button/Button";
import { SettingControl } from "../common/SettingControl";
import { useToast } from "../common/Toast";

export const SettingsTab = () => {
  const { settings, updateSettings, isLoading } = useGlobalSettings();
  const showToast = useToast();

  if (isLoading) {
    return null; // Or a loading indicator
  }

  return (
    <ScrollView
      contentContainerStyle={homeStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.settingsSection}>
        <Text style={textStyles.h3}>Global Settings</Text>

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
