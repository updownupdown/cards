import { RichText } from "@/components/common/RichText";
import { Text } from "@/components/common/Text";
import { getSettingApplyBehaviorText } from "@/data/game-settings";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useGameSpecificSettings } from "@/hooks/useGameSpecificSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors } from "@/styles/styles";
import { usePathname } from "expo-router";
import { useRef } from "react";
import { ScrollView, View } from "react-native";
import {
  calculateWinRate,
  getGameInfo,
  normalizeGamePath,
  type GameSettings,
} from "../../data/game-menu";
import { Button } from "../Button/Button";
import { SettingControl } from "../common/SettingControl";
import ModalFull from "./ModalFull";
import { lightenHexColor } from "@/utils/utils";

type Props = {
  onClose: () => void;
  onReloadGame?: () => void;
};

export default function GameModal({ onClose, onReloadGame }: Props) {
  const pathname = normalizeGamePath(usePathname());
  const info = getGameInfo(pathname);
  const { settings, updateSettings, isLoading } = useGameSettings(pathname);
  const gameSpecificSettings = useGameSpecificSettings(pathname);
  const { spacing } = useResponsiveMetrics();
  const modalStyles = useModalStyles();

  // Track when a setting that only applies on the next deal is changed so the
  // game can be reloaded once the modal closes.
  const reloadOnCloseRef = useRef(false);

  if (isLoading || settings === undefined) return null;

  const howToPlayText = info.howToPlay ?? info.briefRules;

  function onGameSettingChange<K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K],
  ) {
    if (settings && value !== settings[key]) {
      const definition = gameSpecificSettings.find((s) => s.key === key);
      if (definition?.applyBehavior === "next-game") {
        reloadOnCloseRef.current = true;
      }
    }
    void updateSettings({ [key]: value } as Partial<GameSettings>);
  }

  function handleClose() {
    if (reloadOnCloseRef.current) {
      reloadOnCloseRef.current = false;
      onReloadGame?.();
    }
    onClose();
  }

  return (
    <>
      <ModalFull
        onClose={handleClose}
        title={info.title}
        titleColor={info.cardColorText}
        backgroundColor={info.cardColorBg}
      >
        {/* Scroll view */}
        <ScrollView
          contentContainerStyle={modalStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats and favourite */}
          <View style={modalStyles.statsAndFav}>
            <View style={modalStyles.stats}>
              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>Tried</Text>
                <Text style={modalStyles.statsTextValue}>
                  {settings.stats.attempts}
                </Text>
              </View>

              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>Won</Text>
                <Text style={modalStyles.statsTextValue}>
                  {settings.stats.wins}
                </Text>
              </View>

              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>Lost</Text>
                <Text style={modalStyles.statsTextValue}>
                  {settings.stats.losses}
                </Text>
              </View>

              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>Win %</Text>
                <Text style={modalStyles.statsTextValue}>
                  {calculateWinRate(settings.stats)}
                </Text>
              </View>

              {settings.stats.highestScore !== null && (
                <View style={modalStyles.stat}>
                  <Text style={modalStyles.statsTextLabel}>Best</Text>
                  <Text style={modalStyles.statsTextValue}>
                    {settings.stats.highestScore}
                  </Text>
                </View>
              )}
            </View>

            <Button
              onPress={() =>
                updateSettings({ isFavorite: !settings.isFavorite })
              }
              iconName={settings.isFavorite ? "star" : "star-outline"}
              size="xs"
              textOnly
              iconSize={42}
              iconColor={
                settings.isFavorite ? Colors.favoriteStar : Colors.accentBlue
              }
            />
          </View>

          {/* About and Settings */}
          <View
            style={[
              flexStyles.colCentered,
              flexStyles.fullWidth,
              {
                gap: spacing(12),
              },
            ]}
          >
            {/* Tips mode toggle */}
            <View
              style={[
                flexStyles.colCentered,
                flexStyles.fullWidth,
                {
                  alignItems: "flex-start",
                  padding: spacing(16),
                  paddingTop: spacing(12),
                  paddingRight: spacing(12),
                  backgroundColor: lightenHexColor(info.cardColorBg, 0.1),
                  borderRadius: spacing(8),
                },
              ]}
            >
              <SettingControl
                label="Show Quick Tips"
                labelColor={info.cardColorText}
                helpText="Show step-by-step guidance while you play."
                value={settings.tipsMode}
                type="boolean"
                onChange={(value) =>
                  onGameSettingChange("tipsMode", Boolean(value))
                }
              />
            </View>

            {/* Game Settings */}
            {gameSpecificSettings.length > 0 &&
              gameSpecificSettings.map((setting) => (
                <View
                  key={setting.key}
                  style={[
                    flexStyles.colCentered,
                    flexStyles.fullWidth,
                    {
                      alignItems: "flex-start",
                      padding: spacing(16),
                      backgroundColor: lightenHexColor(info.cardColorBg, 0.1),
                      borderRadius: spacing(8),
                    },
                  ]}
                >
                  <SettingControl
                    label={setting.label}
                    labelColor={info.cardColorText}
                    helpText={
                      setting.description ??
                      getSettingApplyBehaviorText(setting.applyBehavior)
                    }
                    value={settings[setting.key]}
                    type={setting.type}
                    options={setting.options}
                    onChange={(value) =>
                      onGameSettingChange(
                        setting.key,
                        value as GameSettings[typeof setting.key],
                      )
                    }
                  />
                </View>
              ))}

            {/* About Text */}
            {info.about && (
              <View
                style={[
                  flexStyles.colCentered,
                  flexStyles.fullWidth,
                  {
                    alignItems: "flex-start",
                    padding: spacing(24),
                    gap: spacing(12),
                    backgroundColor: lightenHexColor(info.cardColorBg, 0.1),
                    borderRadius: spacing(8),
                  },
                ]}
              >
                <View
                  style={[
                    flexStyles.rowCentered,
                    flexStyles.fullWidth,
                    flexStyles.spaceBetween,
                  ]}
                >
                  <Text
                    size="xxl"
                    weight={300}
                    color={info.cardColorText}
                    style={flexStyles.flex1}
                  >
                    About
                  </Text>
                  <Icon name="info" size={28} color={info.cardColorText} />
                </View>

                <RichText content={info.about} size="md" weight={300} />

                {/* By Line */}
                {info.byLine && (
                  <Text style={modalStyles.byLine}>{info.byLine}</Text>
                )}
              </View>
            )}
          </View>

          {/* How to Play */}
          <HowToPlay
            howToPlayText={howToPlayText}
            headingColor={info.cardColorText}
          />
        </ScrollView>
      </ModalFull>
    </>
  );
}

export const HowToPlay = ({
  howToPlayText,
  headingColor,
}: {
  howToPlayText: string[];
  headingColor: string;
}) => {
  return (
    <View
      style={[
        flexStyles.colCentered,
        flexStyles.fullWidth,
        flexStyles.gap20,
        {
          alignItems: "flex-start",
        },
      ]}
    >
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          flexStyles.spaceBetween,
        ]}
      >
        <Text
          size="xl"
          weight={300}
          color={headingColor}
          style={flexStyles.flex1}
        >
          How to Play
        </Text>
        <Icon name="instructions" size={32} color={headingColor} />
      </View>

      <RichText
        content={howToPlayText}
        size="md"
        weight={300}
        headingColor={headingColor}
      />
    </View>
  );
};
