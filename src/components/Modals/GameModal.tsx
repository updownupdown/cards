import { RichText } from "@/components/common/RichText";
import { Text } from "@/components/common/Text";
import { CREATOR_LINKS, isValidLink } from "@/data/game-creators";
import { getSettingApplyBehaviorText } from "@/data/game-settings";
import {
  useGameSettings,
  useGameSpecificSettings,
} from "@/hooks/useGameSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors, rgba } from "@/styles/styles";
import { lightenHexColor } from "@/utils/utils";
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
import ModalFull, { ModalHeading } from "./ModalFull";
import { RatingsBars } from "../Home/RatingBars";

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
        title={gameInfo.title}
        titleColor={gameInfo.cardColorText}
        subtitle={
          gameInfo.credits?.creators?.length
            ? `by ${gameInfo.credits.creators.join(", ")}`
            : undefined
        }
        backgroundColor={gameInfo.cardColorBg}
      >
        {/* Scroll view */}
        <ScrollView
          contentContainerStyle={modalStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats and favourite */}
          <View style={modalStyles.statsAndFav}>
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
              color={gameInfo.cardColorText}
              title="Settings"
              iconName="settings"
              topBorder
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
                    marginVertical: spacing(6),
                    borderRadius: spacing(8),
                    backgroundColor: lightenHexColor(
                      gameInfo.cardColorBg,
                      0.08,
                    ),
                  },
                ]}
              >
                <SettingControl
                  label={setting.label}
                  labelColor={gameInfo.cardColorText}
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
              <Text
                size="sm"
                weight={300}
                color={rgba(Colors.white, 0.5)}
                style={{ marginTop: spacing(8), marginBottom: spacing(12) }}
              >
                No game settings
              </Text>
            )}

            {/* About */}
            {gameInfo.about && (
              <>
                <ModalHeading
                  color={gameInfo.cardColorText}
                  title="About"
                  iconName="info"
                  topBorder
                />

                <RichText content={gameInfo.about} size="md" weight={300} />
              </>
            )}

            {/* Stats */}
            <RatingsBars
              rating={gameInfo.rating}
              gameColor={gameInfo.cardColorText}
              style={{ marginBottom: spacing(30) }}
            />

            {/* Credits */}
            {gameInfo.credits && <CreditsSection />}

            {/* How to Play */}
            <Button
              text="How to Play"
              iconName="instructions"
              onPress={() => {
                handleClose();
                showRulesModal();
              }}
              theme={rgba(gameInfo.cardColorText, 0.2)}
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
  const credits = gameInfo.credits;
  const { spacing } = useResponsiveMetrics();

  const background = gameInfo.background;
  const backgroundAuthorLink = isValidLink(background?.authorLink)
    ? background.authorLink
    : undefined;

  if (!credits) return null;

  return (
    <View
      style={[
        flexStyles.colStart,
        flexStyles.fullWidth,
        flexStyles.spaceBetween,
        {
          gap: spacing(12),
        },
        style,
      ]}
    >
      <ModalHeading
        color={gameInfo.cardColorText}
        title="Credits"
        iconName="attribution"
        topBorder
      />

      {credits.creators?.length && (
        <Text size="md" weight={300} color={Colors.white}>
          Game design:{" "}
          {credits.creators.map((creator, index) => {
            const creatorLink = CREATOR_LINKS[creator];

            return (
              <Text key={index} size="md" weight={300} color={Colors.white}>
                {index > 0 && ", "}
                {creatorLink ? (
                  <Text
                    size="md"
                    weight={500}
                    color={Colors.accentBlue}
                    onPress={() => void Linking.openURL(creatorLink)}
                    style={{ textDecorationLine: "underline" }}
                  >
                    {creator}
                  </Text>
                ) : (
                  creator
                )}
              </Text>
            );
          })}
          {credits.creationDate ? `, ${credits.creationDate}` : ""}
        </Text>
      )}

      {background?.authorName && (
        <Text size="md" weight={300} color={Colors.white}>
          Background image:{" "}
          {backgroundAuthorLink ? (
            <Text
              size="md"
              weight={500}
              color={Colors.accentBlue}
              onPress={() => void Linking.openURL(backgroundAuthorLink)}
              style={{ textDecorationLine: "underline" }}
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
