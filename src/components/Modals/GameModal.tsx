import { Text } from "@/components/common/Text";
import {
  useGameSettings,
  useGameSpecificSettings,
} from "@/hooks/useGameSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle, localizeSettingDefinitions } from "@/i18n/content";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors, rgba } from "@/styles/styles";
import { darkenHexColor, isValidLink, lightenHexColor } from "@/utils/utils";
import { useGamePath } from "@/hooks/useGamePath";
import { useRef } from "react";
import { Linking, ScrollView, View, ViewStyle } from "react-native";
import {
  calculateWinRate,
  getGameInfo,
  type GameSettings,
} from "../../data/game-menu";
import { Button } from "../Button/Button";
import { RatingsBars } from "../Home/RatingBars";
import { SettingControl } from "../common/SettingControl";
import { FavButton } from "../Home/FavButton";
import { shouldReloadGameAfterSettingChange } from "./game-modal-policy";
import ModalFull, { ModalHeading } from "./ModalFull";

type Props = {
  onClose: () => void;
  onReloadGame?: () => void;
  showRulesModal: () => void;
  /** Only offered in nodes mode, and only while the player holds an unused
   * mercy skip and hasn't already won this game. */
  mercySkipsAvailable?: number;
  onMercySkip?: () => void;
};

export default function GameModal({
  onClose,
  onReloadGame,
  showRulesModal,
  mercySkipsAvailable = 0,
  onMercySkip,
}: Props) {
  const pathname = useGamePath();
  const gameInfo = getGameInfo(pathname);
  const { settings, updateSettings, isLoading } = useGameSettings(pathname);
  const gameSpecificSettings = useGameSpecificSettings(pathname);
  const displayLanguage = useDisplayLanguage();
  const localizedSettings = localizeSettingDefinitions(
    pathname,
    gameSpecificSettings,
    displayLanguage,
  );
  const { t } = useTranslation("game");
  const { t: tCommon } = useTranslation("common");
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
        title={localizeGameTitle(gameInfo, pathname, displayLanguage)}
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
                <Text style={modalStyles.statsTextLabel}>
                  {tCommon("stats.won")}
                </Text>
                <Text style={modalStyles.statsTextValue}>
                  {settings.stats.wins}
                </Text>
              </View>

              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>
                  {tCommon("stats.lost")}
                </Text>
                <Text style={modalStyles.statsTextValue}>
                  {settings.stats.losses}
                </Text>
              </View>

              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>
                  {tCommon("stats.winPercent")}
                </Text>
                <Text style={modalStyles.statsTextValue}>
                  {calculateWinRate(settings.stats)}
                </Text>
              </View>

              {settings.stats.highestScore !== null && (
                <View style={modalStyles.stat}>
                  <Text style={modalStyles.statsTextLabel}>
                    {tCommon("stats.best")}
                  </Text>
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
              title={t("settings.title")}
              iconName="settings"
            />

            {localizedSettings.map((setting) => (
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
                  applyBehaviorText={t(
                    setting.applyBehavior === "immediate"
                      ? "settings.appliesNow"
                      : "settings.appliesNextGame",
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
                {t("settings.none")}
              </Text>
            )}

            {gameInfo.background?.authorName && <CreditsSection />}

            {/* Difficulty rating */}
            <View
              style={[
                flexStyles.colStart,
                flexStyles.fullWidth,
                { gap: spacing(2), marginTop: spacing(20) },
              ]}
            >
              <ModalHeading
                color={gameInfo.gameColorPale}
                title={t("rating.title")}
                iconName="chart"
              />

              <RatingsBars
                rating={gameInfo.rating}
                gameColor={gameInfo.gameColorPale}
              />
            </View>

            {/* How to Play */}
            <Button
              text={t("rules.title")}
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

            {/* Mercy Skip: only offered in nodes mode, with a skip in hand.
                Only one can be held at a time for now, so no count is shown;
                the count is still tracked in case that ever changes. */}
            {onMercySkip && mercySkipsAvailable > 0 && (
              <Button
                text={t("mercySkip.title")}
                iconName="fast-forward"
                onPress={() => {
                  handleClose();
                  onMercySkip();
                }}
                theme={rgba(Colors.brightGreen, 0.2)}
                taller
                fullWidth
              />
            )}
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
  const pathname = useGamePath();
  const gameInfo = getGameInfo(pathname);
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("game");

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
        title={t("credits.title")}
        iconName="attribution"
      />

      {background?.authorName && (
        <Text size="sm" weight={300} color={Colors.white}>
          {t("credits.backgroundImage")}{" "}
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
