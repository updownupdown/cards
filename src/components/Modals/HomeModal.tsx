import {
  clearLastGameSession,
  DEFAULT_GLOBAL_SETTINGS,
  populateTestGameProgress,
  resetAllSettings,
} from "@/data/game-menu";
import {
  populateTestCampaignProgress,
  resetCampaignProgress,
} from "@/data/campaign-progress";
import { resetWildCardsProgress } from "@/data/wild-cards";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { getTestGameDotPaths, getTestWonPaths } from "@/data/test-progress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors, theme } from "@/styles/styles";
import { ThemePicker, settingsView } from "../common/ThemePicker";
import {
  getDeviceLanguageCodes,
  useDisplayLanguage,
  useTranslation,
} from "@/i18n";
import {
  LANGUAGE_NAMES,
  PSEUDO_LANGUAGE,
  resolveLanguage,
  SOURCE_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type LanguagePreference,
} from "@/i18n/languages";
import { isLocalDevEnvironment } from "@/utils/utils";
import Constants from "expo-constants";
import { router } from "expo-router";
import React from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { AddToHomeScreenNotice } from "../common/AddToHomeScreenNotice";
import { SelectControl } from "../common/SelectControl";
import { SettingControl } from "../common/SettingControl";
import { AutoCompleteModeRadio } from "../common/AutoCompletePanel";
import { Text } from "../common/Text";
import ModalFull from "./ModalFull";
import { UnderlineTabs } from "../ui/Nocturne";
import { useToast } from "../common/Toast";
import { saveBetaGames, useBetaGamesEnabled } from "@/data/beta-games";
import { saveHintButton, useHintButtonShown } from "@/data/hint-button";

/** App version and build type; not translated, since it's for bug reports. */
const BUILD_LABEL = `v${Constants.expoConfig?.version ?? "?"} · ${__DEV__ ? "dev" : "release"}`;

/** Taps on the version number that turn on beta games. */
const BETA_UNLOCK_TAPS = 10;

const TABS = ["display", "theme", "other"] as const;

interface Props {
  onClose: () => void;
  onHomeDataInvalidated: () => void;
}

export const HomeModal = ({ onClose, onHomeDataInvalidated }: Props) => {
  const { settings, updateSettings, isLoading } = useGlobalSettings();
  const modalStyles = useModalStyles();
  const [isResetConfirmationVisible, setIsResetConfirmationVisible] =
    React.useState(false);
  const [isResettingData, setIsResettingData] = React.useState(false);
  const [isPopulatingTestData, setIsPopulatingTestData] = React.useState(false);
  const { spacing } = useResponsiveMetrics();
  const showToast = useToast();
  const [tab, setTabState] = React.useState<(typeof TABS)[number]>(() => {
    // After a theme change the app is rebuilt: come back to the same spot.
    if (!settingsView.restore) {
      settingsView.tab = "display";
      settingsView.scrollY = 0;
    }
    settingsView.restore = false;
    return settingsView.tab;
  });
  const setTab = (next: (typeof TABS)[number]) => {
    settingsView.tab = next;
    settingsView.scrollY = 0;
    setTabState(next);
  };
  const scrollRef = React.useRef<ScrollView>(null);
  const scrollRestored = React.useRef(false);
  const versionTaps = React.useRef(0);
  const betaGamesEnabled = useBetaGamesEnabled();
  const hintButtonShown = useHintButtonShown();

  const onVersionPress = () => {
    versionTaps.current += 1;
    if (versionTaps.current < BETA_UNLOCK_TAPS) return;
    versionTaps.current = 0;
    void saveBetaGames(true);
    onHomeDataInvalidated();
    onClose();
    showToast(t("betaGames.enabled"));
  };
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  const language = useDisplayLanguage();

  const onCloseAndRefresh = () => {
    onHomeDataInvalidated();
    onClose();
  };

  if (isLoading) {
    return null;
  }

  const phoneLanguage = resolveLanguage("system", getDeviceLanguageCodes());
  const phoneLanguageName = LANGUAGE_NAMES[phoneLanguage];
  // "Auto" always comes first; the language it resolves to is still listed
  // below, so it can be chosen explicitly.
  const languageOptions: { label: string; value: LanguagePreference }[] = [
    {
      value: "system",
      // "Auto" is in the phone's language, not the chosen one.
      label: t("language.system", {
        lng: phoneLanguage,
        language: phoneLanguageName,
      }),
    },
    ...SUPPORTED_LANGUAGES.map((language) => ({
      value: language,
      label: LANGUAGE_NAMES[language],
    })),
    ...(__DEV__
      ? [
          {
            value: PSEUDO_LANGUAGE as LanguagePreference,
            label: LANGUAGE_NAMES[PSEUDO_LANGUAGE],
          },
        ]
      : []),
  ];

  // Native can always keep the screen on; browsers need the Screen Wake Lock
  // API (Chrome, Edge, Safari 16.4+, Firefox 126+, over HTTPS).
  const canKeepAwake =
    Platform.OS !== "web" ||
    (typeof navigator !== "undefined" && "wakeLock" in navigator);

  const footerText = { size: "xs", weight: 400, color: theme.dim } as const;
  const footerLink = {
    size: "xs",
    weight: 500,
    color: theme.accent,
  } as const;

  return (
    <ModalFull showLogo onClose={onCloseAndRefresh}>
      <UnderlineTabs
        options={TABS.map((id) => ({ value: id, label: t(`tabs.${id}`) }))}
        value={tab}
        onChange={setTab}
      />
      <ScrollView
        key={tab}
        ref={scrollRef}
        scrollEventThrottle={16}
        onScroll={(event) => {
          settingsView.scrollY = event.nativeEvent.contentOffset.y;
        }}
        onContentSizeChange={() => {
          if (scrollRestored.current || !settingsView.scrollY) return;
          scrollRestored.current = true;
          scrollRef.current?.scrollTo({
            y: settingsView.scrollY,
            animated: false,
          });
        }}
        contentContainerStyle={[
          modalStyles.scrollContent,
          flexStyles.colCentered,
          flexStyles.fullWidth,
          {
            flexGrow: 1,
            gap: spacing(40),
            paddingVertical: spacing(30),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {tab === "display" && (
          <View
            style={[
              flexStyles.colCentered,
              flexStyles.fullWidth,
              { gap: spacing(30) },
            ]}
          >
            <SettingControl
              label={t("showTips.label")}
              description={t("showTips.description")}
              value={settings.showTipsForNewGames}
              type="boolean"
              onChange={(val) => {
                void updateSettings({ showTipsForNewGames: val });
              }}
            />
            <SettingControl
              label={t("showHintButton.label")}
              description={t("showHintButton.description")}
              value={hintButtonShown}
              type="boolean"
              onChange={(val) => {
                void saveHintButton(val);
              }}
            />
            <SettingControl
              label={t("showAnimations.label")}
              description={t("showAnimations.description")}
              value={settings.showAnimations}
              type="boolean"
              onChange={(val) => {
                void updateSettings({ showAnimations: val });
              }}
            />
            <SettingControl
              label={t("resumeLastGame.label")}
              description={t("resumeLastGame.description")}
              value={settings.resumeLastGame}
              type="boolean"
              onChange={(val) => {
                void updateSettings({ resumeLastGame: val });
                if (!val) {
                  void clearLastGameSession();
                }
              }}
            />

            {/* Browsers without the Screen Wake Lock API can't keep the screen on. */}
            {canKeepAwake && (
              <SettingControl
                label={t("keepScreenAwake.label")}
                description={t("keepScreenAwake.description")}
                value={settings.keepScreenAwake}
                type="boolean"
                onChange={(val) => {
                  void updateSettings({ keepScreenAwake: val });
                }}
              />
            )}
            {/* Vibration isn't available in browsers, so native only. */}
            {Platform.OS !== "web" && (
              <SettingControl
                label={t("hapticFeedback.label")}
                description={t("hapticFeedback.description")}
                value={settings.hapticFeedback}
                type="boolean"
                onChange={(val) => {
                  void updateSettings({ hapticFeedback: val });
                }}
              />
            )}
          </View>
        )}
        {tab === "theme" && (
          <View
            style={[
              flexStyles.colCentered,
              flexStyles.fullWidth,
              { gap: spacing(30) },
            ]}
          >
            <ThemePicker
              value={settings.colorTheme}
              onChange={(colorTheme) => {
                void updateSettings({ colorTheme });
              }}
            />
          </View>
        )}
        {tab === "other" && (
          <>
            <View
              style={[
                flexStyles.colCentered,
                flexStyles.fullWidth,
                { gap: spacing(30) },
              ]}
            >
              <View style={{ width: "100%", gap: spacing(10) }}>
                <View style={{ gap: spacing(4) }}>
                  <Text weight={500} size="md" color={theme.ink}>
                    {t("autoComplete.label")}
                  </Text>
                  <Text size="sm" weight={400} color={theme.dim}>
                    {t("autoComplete.description")}
                  </Text>
                </View>
                <AutoCompleteModeRadio
                  value={settings.autoComplete}
                  onChange={(value) => {
                    void updateSettings({ autoComplete: value });
                  }}
                />
              </View>
              {/* Language: follow the phone (Auto), or pick one. */}
              <View
                style={[
                  flexStyles.colStart,
                  flexStyles.fullWidth,
                  { gap: spacing(12) },
                ]}
              >
                <Text weight={500} size="md" color={theme.ink}>
                  {t("language.label")}
                </Text>
                <SelectControl
                  value={settings.language}
                  options={languageOptions}
                  accessibilityLabel={t("language.label")}
                  onChange={(choice) => {
                    void updateSettings({ language: choice });
                  }}
                />
              </View>
              <SettingControl
                label={t("useEnglishGameTitles.label")}
                description={t("useEnglishGameTitles.description")}
                value={settings.useEnglishGameTitles}
                type="boolean"
                onChange={(val) => {
                  void updateSettings({ useEnglishGameTitles: val });
                }}
              />
              {language !== SOURCE_LANGUAGE && (
                <SettingControl
                  label={t("translateCollectibles.label")}
                  description={t("translateCollectibles.description")}
                  value={settings.translateCollectibles}
                  type="boolean"
                  onChange={(val) => {
                    void updateSettings({ translateCollectibles: val });
                  }}
                />
              )}
              <SettingControl
                label={t("crashReports.label")}
                description={t("crashReports.description")}
                value={settings.crashReports}
                type="boolean"
                onChange={(val) => {
                  void updateSettings({ crashReports: val });
                }}
              />
            </View>

            <AddToHomeScreenNotice />

            {isLocalDevEnvironment() && (
              <Button
                size="md"
                uppercase={false}
                text={t("populateTestProgress")}
                iconName="milky-way"
                theme="blue"
                disabled={isPopulatingTestData}
                onPress={async () => {
                  setIsPopulatingTestData(true);
                  try {
                    const gameDotPaths = getTestGameDotPaths();
                    await Promise.all([
                      populateTestGameProgress(getTestWonPaths(gameDotPaths)),
                      populateTestCampaignProgress(gameDotPaths),
                    ]);
                    onHomeDataInvalidated();
                    onClose();
                  } finally {
                    setIsPopulatingTestData(false);
                  }
                }}
              />
            )}

            {/* Footer: credits, links and data reset, kept small at the bottom. */}
            <View
              style={[
                flexStyles.colCentered,
                flexStyles.fullWidth,
                { gap: spacing(16), marginTop: "auto" },
              ]}
            >
              <Text {...footerText} style={{ textAlign: "center" }}>
                {t("credits.taoTranslation.prefix")}
                <Text
                  {...footerLink}
                  accessibilityRole="link"
                  onPress={() =>
                    void Linking.openURL(
                      "https://www.goodreads.com/author/show/5667733.John_H_McDonald",
                    )
                  }
                >
                  {t("credits.taoTranslation.name")}
                </Text>
                {t("credits.taoTranslation.suffix")}
              </Text>

              <Text
                {...footerLink}
                style={{ textAlign: "center" }}
                onPress={() => {
                  onClose();
                  router.push("/privacy");
                }}
              >
                {t("privacyPolicy")}
              </Text>

              {isResetConfirmationVisible ? (
                <View
                  style={[
                    flexStyles.rowCentered,
                    { gap: spacing(14), flexWrap: "wrap" },
                  ]}
                >
                  <Text {...footerText}>{t("resetData.confirm")}</Text>
                  <Button
                    textOnly
                    size="xs"
                    uppercase={false}
                    text={tCommon("cancel")}
                    disabled={isResettingData}
                    onPress={() => setIsResetConfirmationVisible(false)}
                  />
                  <Button
                    textOnly
                    size="xs"
                    uppercase={false}
                    text={tCommon("reset")}
                    theme={Colors.cardSelectRed}
                    disabled={isResettingData}
                    onPress={async () => {
                      setIsResettingData(true);
                      try {
                        updateSettings(DEFAULT_GLOBAL_SETTINGS);
                        await resetAllSettings();
                        await resetCampaignProgress();
                        await resetWildCardsProgress();
                        onHomeDataInvalidated();
                        setIsResetConfirmationVisible(false);
                        onClose();
                      } finally {
                        setIsResettingData(false);
                      }
                    }}
                  />
                </View>
              ) : (
                <Button
                  textOnly
                  size="xs"
                  uppercase={false}
                  text={t("resetData.button")}
                  theme={Colors.cardSelectRed}
                  onPress={() => setIsResetConfirmationVisible(true)}
                />
              )}

              {/* Which build this is, since dev and release installs look alike. */}
              {betaGamesEnabled && (
                <Text
                  {...footerLink}
                  style={{ textAlign: "center" }}
                  accessibilityRole="link"
                  onPress={() => {
                    void saveBetaGames(false);
                    onHomeDataInvalidated();
                  }}
                >
                  {t("betaGames.hide")}
                </Text>
              )}
              <Text
                {...footerText}
                style={{ textAlign: "center" }}
                onPress={onVersionPress}
                suppressHighlighting
              >
                {BUILD_LABEL}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </ModalFull>
  );
};
