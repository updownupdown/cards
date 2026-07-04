import { DEFAULT_GLOBAL_SETTINGS, resetAllSettings } from "@/data/game-menu";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { flexStyles } from "@/styles/flexStyles";
import { modalStyles } from "@/styles/modalStyles";
import React from "react";
import { ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { SettingControl } from "../common/SettingControl";
import ModalFull from "../Modals/ModalFull";

interface Props {
  onClose: () => void;
}

export const SettingsModal = ({ onClose }: Props) => {
  const { settings, updateSettings, isLoading } = useGlobalSettings();

  if (isLoading) {
    return null; // Or a loading indicator
  }

  return (
    <ModalFull title="Settings" onClose={onClose}>
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
            ]}
          >
            <SettingControl
              label="Show game intros"
              value={settings.showIntros}
              type="boolean"
              onChange={(val) => updateSettings({ showIntros: val })}
            />
          </View>

          <Button
            size="md"
            uppercase={false}
            onPress={() => {
              updateSettings(DEFAULT_GLOBAL_SETTINGS);
              resetAllSettings();
            }}
            text="Reset EVERYTHING (settings, stats, history, and favorites)"
            textOnly
          />
        </View>
      </ScrollView>
    </ModalFull>
  );
};
