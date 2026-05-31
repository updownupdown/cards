import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { textStyles } from "@/styles/textStyles";
import { flexStyles } from "@/styles/flexStyles";
import { homeStyles } from "@/styles/homeStyles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { SettingControl } from "../common/SettingControl";
import { ThemeName } from "@/data/game-menu";

export const SettingsTab = () => {
  const { settings, updateSettings, isLoading } = useGlobalSettings();

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
