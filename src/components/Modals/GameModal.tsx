import { Text } from "@/components/common/Text";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useGameSpecificSettings } from "@/hooks/useGameSpecificSettings";
import { SettingControl } from "../common/SettingControl";
import { useModalStyles } from "@/styles/modalStyles";
import { usePathname } from "expo-router";
import { ScrollView, View } from "react-native";
import { getSettingApplyBehaviorText } from "@/data/game-settings";
import {
  calculateWinRate,
  getGameInfo,
  normalizeGamePath,
  type GameSettings,
} from "../../data/game-menu";
import { Button } from "../Button/Button";
import ModalFull from "./ModalFull";
import { Colors } from "@/styles/styles";
import { flexStyles } from "@/styles/flexStyles";
import { Icon, IconName } from "@/icons";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";

interface ModalSectionProps {
  title?: string;
  iconName?: IconName;
  children: React.ReactNode;
}

const ModalSection = ({ children, title, iconName }: ModalSectionProps) => {
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
      {(title || iconName) && (
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            {
              borderTopWidth: 1,
              borderTopColor: Colors.K800,
              paddingTop: 20,
            },
          ]}
        >
          {title && (
            <Text
              size="lg"
              weight={500}
              color={Colors.K100}
              style={flexStyles.flex1}
            >
              {title}
            </Text>
          )}
          {iconName && <Icon name={iconName} size={32} color={Colors.K500} />}
        </View>
      )}

      {children}
    </View>
  );
};

type Props = {
  onClose: () => void;
};

export default function GameModal({ onClose }: Props) {
  const pathname = normalizeGamePath(usePathname());
  const info = getGameInfo(pathname);
  const { settings, updateSettings, isLoading } = useGameSettings(pathname);
  const gameSpecificSettings = useGameSpecificSettings(pathname);
  const { spacing } = useResponsiveMetrics();
  const modalStyles = useModalStyles();

  if (isLoading || settings === undefined) return null;

  const howToPlayText = info.howToPlay ?? info.briefRules;

  function onGameSettingChange<K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K],
  ) {
    void updateSettings({ [key]: value } as Partial<GameSettings>);
  }

  return (
    <>
      <ModalFull onClose={onClose} showHomeButton>
        {/* Scroll view */}
        <ScrollView
          contentContainerStyle={modalStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View
            style={[
              flexStyles.colCentered,
              flexStyles.fullWidth,
              flexStyles.gap4,
              { alignItems: "flex-start" },
            ]}
          >
            <Text
              size="xl"
              weight={500}
              textTransform="uppercase"
              style={{ color: Colors.K100 }}
            >
              {info.title}
            </Text>

            {/* By Line */}
            {info.byLine && (
              <Text style={modalStyles.byLine}>{info.byLine}</Text>
            )}
          </View>

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

          {/* Game Settings */}
          {gameSpecificSettings.length > 0 && (
            <ModalSection title="Game Settings" iconName="settings">
              <View style={modalStyles.gameSettings}>
                {gameSpecificSettings.map((setting) => (
                  <View key={setting.key} style={flexStyles.fullWidth}>
                    <SettingControl
                      label={setting.label}
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
                    {(setting.description || setting.applyBehavior) && (
                      <Text
                        size="sm"
                        color={Colors.K600}
                        style={{
                          paddingTop: spacing(10),
                        }}
                      >
                        {setting.description ??
                          getSettingApplyBehaviorText(setting.applyBehavior)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </ModalSection>
          )}

          {/* About Text */}
          {info.about && (
            <ModalSection>
              {info.about.map((line) => (
                <Text key={line} style={modalStyles.aboutText}>
                  {line}
                </Text>
              ))}
            </ModalSection>
          )}

          {/* How to Play */}
          <ModalSection title="How to Play" iconName="instructions">
            {howToPlayText.map((line) => (
              <Text key={line} style={modalStyles.rulesText}>
                {line}
              </Text>
            ))}
          </ModalSection>
        </ScrollView>
      </ModalFull>
    </>
  );
}
