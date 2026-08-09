import { Text } from "@/components/common/Text";
import { getSettingApplyBehaviorText } from "@/data/game-settings";
import {
  useGameSettings,
  useGameSpecificSettings,
} from "@/hooks/useGameSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors, rgba } from "@/styles/styles";
import { darkenHexColor, isValidLink, lightenHexColor } from "@/utils/utils";
import { usePathname } from "expo-router";
import { useRef } from "react";
import { Linking, ScrollView, View, ViewStyle } from "react-native";
import {
  calculateWinRate,
  getGameInfo,
  normalizeGamePath,
  type GameSettings,
} from "../../data/game-menu";
import { Button } from "../Button/Button";
import { SettingControl } from "../common/SettingControl";
import { FavButton } from "../Home/FavButton";
import { shouldReloadGameAfterSettingChange } from "./game-modal-policy";
import ModalFull, { ModalHeading } from "./ModalFull";

type Props = {
  onClose: () => void;
  onReloadGame?: () => void;
  showRulesModal: () => void;
};

export default function GameModal({
  onClose,
  onReloadGame,
  showRulesModal,
}: Props) {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);
  const { settings, updateSettings, isLoading } = useGameSettings(pathname);
  const gameSpecificSettings = useGameSpecificSettings(pathname);
  const { spacing } = useResponsiveMetrics();
  const modalStyles = useModalStyles();

  // Track when a setting that only applies on the next deal is changed so the
  // game can be reloaded once the modal closes.
  const reloadOnCloseRef = useRef(false);

  if (isLoading || settings === undefined) return null;

  function onGameSettingChange<K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K],
  ) {
    const definition = gameSpecificSettings.find((s) => s.key === key);
    if (
      shouldReloadGameAfterSettingChange(
        settings?.[key],
        value,
        definition?.applyBehavior,
      )
    ) {
      reloadOnCloseRef.current = true;
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
        title={gameInfo.title}
        titleColor={gameInfo.gameColorPale}
        backgroundColor={gameInfo.gameColorDark}
      >
        {/* Scroll view */}
        <ScrollView
          contentContainerStyle={modalStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats and favourite */}
          <View
            style={[
              modalStyles.statsAndFav,
              { backgroundColor: darkenHexColor(gameInfo.gameColorDark, 0.2) },
            ]}
          >
            <FavButton
              isFavorite={settings.isFavorite}
              onToggleFavorite={(nextFavorite) => {
                void updateSettings({ isFavorite: nextFavorite });
              }}
              size={42}
              iconSize={42}
            />

            <View style={modalStyles.stats}>
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
          </View>

          <View
            style={[
              flexStyles.colStart,
              flexStyles.fullWidth,
              {
                gap: spacing(12),
              },
            ]}
          >
            {/* Game Settings */}
            <ModalHeading
              color={gameInfo.gameColorPale}
              title="Settings"
              iconName="settings"
            />

            {gameSpecificSettings.map((setting) => (
              <View
                key={setting.key}
                style={[
                  flexStyles.colStart,
                  flexStyles.fullWidth,
                  {
                    alignItems: "flex-start",
                    padding: spacing(16),
                    borderRadius: spacing(12),
                    backgroundColor: lightenHexColor(
                      gameInfo.gameColorDark,
                      0.08,
                    ),
                  },
                ]}
              >
                <SettingControl
                  label={setting.label}
                  labelColor={gameInfo.gameColorPale}
                  helpText={setting.description}
                  applyBehaviorText={getSettingApplyBehaviorText(
                    setting.applyBehavior,
                  )}
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

            {gameSpecificSettings.length === 0 && (
              <Text size="sm" weight={300} color={rgba(Colors.white, 0.5)}>
                No game settings
              </Text>
            )}

            {/* About */}
            {/* <View
              style={[
                flexStyles.colStart,
                flexStyles.fullWidth,
                { gap: spacing(2), marginTop: spacing(20) },
              ]}
            >
              <ModalHeading
                color={gameInfo.gameColorPale}
                title="About"
                iconName="info"
              />

              {gameInfo.about && (
                <RichText content={gameInfo.about} size="md" weight={300} />
              )} */}

            {/* Stats */}
            {/* <RatingsBars
                rating={gameInfo.rating}
                gameColor={gameInfo.gameColorPale}
                style={{ marginBottom: spacing(30) }}
              /> */}
            {/* </View> */}

            {gameInfo.background?.authorName && <CreditsSection />}

            {/* How to Play */}
            <Button
              text="How to Play"
              iconName="instructions"
              onPress={() => {
                handleClose();
                showRulesModal();
              }}
              theme={rgba(gameInfo.gameColorPale, 0.2)}
              taller
              fullWidth
              style={{ marginTop: spacing(30) }}
            />
          </View>
        </ScrollView>
      </ModalFull>
    </>
  );
}

type CreditsSectionProps = {
  style?: ViewStyle | ViewStyle[];
};

export const CreditsSection = ({ style }: CreditsSectionProps) => {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);
  const { spacing } = useResponsiveMetrics();

  const background = gameInfo.background;
  const backgroundAuthorLink = isValidLink(background?.authorLink)
    ? background.authorLink
    : undefined;

  if (!background?.authorName) return null;

  return (
    <View
      style={[
        flexStyles.colStart,
        flexStyles.fullWidth,
        flexStyles.spaceBetween,
        {
          gap: spacing(12),
          padding: spacing(20),
          marginTop: spacing(20),
          paddingTop: spacing(16),
          borderRadius: spacing(12),
          borderWidth: 1,
          borderColor: rgba(gameInfo.gameColorPale, 0.2),
        },
        style,
      ]}
    >
      <ModalHeading
        color={gameInfo.gameColorPale}
        title="Credits"
        iconName="attribution"
      />

      {background?.authorName && (
        <Text size="sm" weight={300} color={Colors.white}>
          Background image:{" "}
          {backgroundAuthorLink ? (
            <Text
              size="sm"
              weight={500}
              color={Colors.accentBlue}
              onPress={() => void Linking.openURL(backgroundAuthorLink)}
            >
              {background.authorName}
            </Text>
          ) : (
            background.authorName
          )}
        </Text>
      )}
    </View>
  );
};
