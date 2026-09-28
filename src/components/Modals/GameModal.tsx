import { Text } from "@/components/common/Text";
import {
  useGameSettings,
  useGameSpecificSettings,
} from "@/hooks/useGameSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle, localizeSettingDefinitions } from "@/i18n/content";
import { useModalStyles } from "@/styles/modalStyles";
import { rgba, theme } from "@/styles/styles";
import { ActionButton, Caps, RatingMeters } from "@/components/ui/Nocturne";
import {
  GAME_FULL_THUMBNAIL_ASSETS,
  GAME_THUMBNAIL_ASPECTS,
} from "@/data/game-thumbnails";
import { Image } from "expo-image";
import { isValidLink } from "@/utils/utils";
import { useGamePath } from "@/hooks/useGamePath";
import { useRef } from "react";
import { Linking, ScrollView, View, ViewStyle } from "react-native";
import type { GameMenuInfo } from "../../data/games-data";
import {
  calculateWinRate,
  getGameInfo,
  type GameSettings,
} from "../../data/game-menu";
import { SettingControl } from "../common/SettingControl";
import { FavButton } from "../Home/FavButton";
import { shouldReloadGameAfterSettingChange } from "./game-modal-policy";
import ModalFull, { ModalHeading } from "./ModalFull";

type Props = {
  onClose: () => void;
  onReloadGame?: () => void;
  showRulesModal: () => void;
  /** Only offered in Campaign mode, and only while the player holds an unused
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

  const card: ViewStyle = {
    width: "100%",
    padding: spacing(16),
    borderRadius: spacing(14),
    backgroundColor: theme.raise,
  };
  const stat = (label: string, value: string | number) => (
    <View style={{ alignItems: "center", gap: spacing(2) }}>
      <Text
        size="xl"
        weight={500}
        style={{ fontVariant: ["tabular-nums", "lining-nums"] }}
      >
        {value}
      </Text>
      <Caps>{label}</Caps>
    </View>
  );

  return (
    <>
      <ModalFull
        onClose={handleClose}
        title={localizeGameTitle(gameInfo, pathname, displayLanguage)}
      >
        <ScrollView
          contentContainerStyle={[
            modalStyles.scrollContent,
            { gap: spacing(26), justifyContent: "flex-start" },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats and favourite */}
          <View
            style={[
              card,
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
            ]}
          >
            <FavButton
              isFavorite={settings.isFavorite}
              onToggleFavorite={(nextFavorite) => {
                void updateSettings({ isFavorite: nextFavorite });
              }}
              size={spacing(42)}
              iconSize={spacing(28)}
              activeColor={theme.accent}
              inactiveColor={theme.dim}
            />
            <View style={{ flexDirection: "row", gap: spacing(20) }}>
              {stat(tCommon("stats.won"), settings.stats.wins)}
              {stat(tCommon("stats.lost"), settings.stats.losses)}
              {stat(
                tCommon("stats.winPercent"),
                calculateWinRate(settings.stats),
              )}
              {settings.stats.highestScore !== null &&
                stat(tCommon("stats.best"), settings.stats.highestScore)}
            </View>
          </View>

          {/* Game settings */}
          {gameSpecificSettings.length > 0 && (
            <View style={{ width: "100%", gap: spacing(10) }}>
              <ModalHeading title={t("settings.title")} />
              {localizedSettings.map((setting) => (
                <View key={setting.key} style={card}>
                  <SettingControl
                    label={setting.label}
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
            </View>
          )}

          {/* Ratings */}
          <View style={{ width: "100%", gap: spacing(10) }}>
            <ModalHeading title={t("rating.title")} />
            <View style={card}>
              <RatingMeters
                rating={gameInfo.rating}
                labels={{
                  complexity: tCommon("stats.complexity"),
                  difficulty: tCommon("stats.difficulty"),
                  luck: tCommon("stats.luck"),
                }}
              />
            </View>
          </View>

          {/* Mercy Skip: only offered in Campaign mode, with a skip in hand.
              Only one can be held at a time for now, so no count is shown;
              the count is still tracked in case that ever changes. */}
          {onMercySkip && mercySkipsAvailable > 0 && (
            <ActionButton
              label={t("mercySkip.title")}
              iconName="fast-forward"
              secondary
              onPress={() => {
                handleClose();
                onMercySkip();
              }}
              style={{ width: "100%" }}
            />
          )}

          {hasCredits(gameInfo) && <CreditsSection />}
        </ScrollView>

        {/* How to Play stays in reach at the bottom. */}
        <View
          style={{
            paddingHorizontal: spacing(30),
            paddingTop: spacing(12),
            paddingBottom: spacing(20),
            borderTopWidth: 1,
            borderTopColor: rgba(theme.ink, 0.08),
          }}
        >
          <ActionButton
            label={t("rules.title")}
            iconName="instructions"
            onPress={() => {
              handleClose();
              showRulesModal();
            }}
            style={{ width: "100%" }}
          />
        </View>
      </ModalFull>
    </>
  );
}

type CreditsSectionProps = {
  style?: ViewStyle | ViewStyle[];
};

/** Whether a game has anything for CreditsSection to show. */
export function hasCredits(gameInfo: GameMenuInfo) {
  return Boolean(gameInfo.background?.authorName || gameInfo.thumbnailCredit);
}

type CreditLinkProps = {
  name: string;
  link?: string;
};

/** A credited name, linked to its page when it has a valid one. */
const CreditLink = ({ name, link }: CreditLinkProps) =>
  isValidLink(link) ? (
    <Text
      size="xs"
      weight={500}
      color={theme.accent}
      onPress={() => void Linking.openURL(link)}
    >
      {name}
    </Text>
  ) : (
    name
  );

export const CreditsSection = ({ style }: CreditsSectionProps) => {
  const pathname = useGamePath();
  const gameInfo = getGameInfo(pathname);
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("game");

  const background = gameInfo.background;
  const art = gameInfo.thumbnailCredit;
  const thumbnail = gameInfo.thumbnail;

  if (!hasCredits(gameInfo)) return null;

  return (
    <View style={[{ width: "100%", gap: spacing(10) }, style]}>
      <ModalHeading title={t("credits.title")} />
      <View
        style={{
          width: "100%",
          gap: spacing(12),
          padding: spacing(16),
          borderRadius: spacing(14),
          borderWidth: 1,
          borderColor: rgba(theme.ink, 0.08),
        }}
      >
        {art && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: spacing(14),
            }}
          >
            {/* The whole work, uncropped, small beside its label. */}
            {thumbnail && (
              <Image
                source={GAME_FULL_THUMBNAIL_ASSETS[thumbnail]}
                cachePolicy="memory"
                contentFit="contain"
                style={{
                  height: spacing(84),
                  width: spacing(84) * GAME_THUMBNAIL_ASPECTS[thumbnail],
                  maxWidth: spacing(120),
                  borderRadius: spacing(3),
                }}
              />
            )}
            <View style={{ flex: 1, gap: spacing(2) }}>
              <Caps>{t("credits.gameArt")}</Caps>
              <Text serif italic size="lg" color={theme.ink}>
                {art.title}
              </Text>
              <Text serif size="sm" color={theme.dim}>
                {[art.artistName, art.date].filter(Boolean).join(", ")}
              </Text>
              <Text size="xs" weight={300} color={theme.dim}>
                {t("credits.artSource")}{" "}
                <CreditLink name={art.sourceName} link={art.sourceLink} />
              </Text>
            </View>
          </View>
        )}

        {background?.authorName && (
          <Text size="xs" weight={300} color={theme.dim}>
            {t("credits.backgroundImage")}{" "}
            <CreditLink
              name={background.authorName}
              link={background.authorLink}
            />
          </Text>
        )}
      </View>
    </View>
  );
};
