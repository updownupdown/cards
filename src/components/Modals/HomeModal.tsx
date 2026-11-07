import {
  clearLastGameSession,
  DEFAULT_GLOBAL_SETTINGS,
  populateTestGameProgress,
  resetAllSettings,
} from "@/data/game-menu";
import {
  grantMercySkip,
  populateTestCampaignProgress,
  resetCampaignProgress,
  unlockAllCampaignGames,
} from "@/data/campaign-progress";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { getTestGameDotPaths, getTestWonPaths } from "@/data/test-progress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors, rgba, theme } from "@/styles/styles";
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
import Constants from "expo-constants";
import { router } from "expo-router";
import React from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { AddToHomeScreenNotice } from "../common/AddToHomeScreenNotice";
import { SelectControl } from "../common/SelectControl";
import { SettingControl } from "../common/SettingControl";
import { AutoCompleteModeRadio } from "../common/AutoCompletePanel";
import { MomentPreviews, MomentSettings } from "../Moments/MomentSettings";
import { Text } from "../common/Text";
import ModalFull from "./ModalFull";
import { UnderlineTabs } from "../ui/Nocturne";
import { useToast } from "../common/Toast";
import { saveDevMode, useDevMode, useDevModeKnock } from "@/data/dev-mode";
import { HelpFromAbovePanel } from "@/components/common/HelpFromAbovePanel";
import { resetHintMode } from "@/data/hint-mode";

/** App version and build type; not translated, since it's for bug reports. */
const BUILD_LABEL = `v${Constants.expoConfig?.version ?? "?"} · ${__DEV__ ? "dev" : "release"}`;

/** Taps on Reset, after asking for it, that erase all app data. */
const RESET_TAPS = 3;

/** Dev only shows while dev mode is on. */
const TABS = ["general", "advanced", "theme", "dev"] as const;

interface Props {
  onClose: () => void;
  onHomeDataInvalidated: () => void;
}

export const HomeModal = ({ onClose, onHomeDataInvalidated }: Props) => {
  const { settings, updateSettings, isLoading } = useGlobalSettings();
  const modalStyles = useModalStyles();
  // Taps on Reset still needed to erase everything; null while not asked.
  const [resetTapsLeft, setResetTapsLeft] = React.useState<number | null>(null);
  const [isResettingData, setIsResettingData] = React.useState(false);
  const [isPopulatingTestData, setIsPopulatingTestData] = React.useState(false);
  const { spacing } = useResponsiveMetrics();
  const showToast = useToast();
  const [tab, setTabState] = React.useState<(typeof TABS)[number]>(() => {
    // After a theme change the app is rebuilt: come back to the same spot.
    if (!settingsView.restore) {
      settingsView.tab = "general";
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
  const devMode = useDevMode();
  // Back from a theme change with dev mode since turned off.
  const shownTab = tab === "dev" && !devMode ? "advanced" : tab;
  const turnDevModeOn = async () => {
    await saveDevMode(true);
    onHomeDataInvalidated();
    setTab("dev");
    showToast(t("devMode.on"));
  };
  const devModeKnock = useDevModeKnock(() => {
    void turnDevModeOn();
  });
  const onVersionPress = () => {
    if (!devMode) devModeKnock.tap();
  };
  const onDevModeOff = () => {
    void saveDevMode(false);
    onHomeDataInvalidated();
    setTab("advanced");
    showToast(t("devMode.off"));
  };
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  const { t: tHome } = useTranslation("home");
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
    <ModalFull
      title={tHome("header.settings")}
      iconName="settings"
      onClose={onCloseAndRefresh}
    >
      <UnderlineTabs
        options={TABS.filter((id) => id !== "dev" || devMode).map((id) => ({
          value: id,
          label: t(`tabs.${id}`),
        }))}
        value={shownTab}
        onChange={setTab}
      />
      <ScrollView
        key={shownTab}
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
            paddingTop: spacing(30),
            paddingBottom: spacing(30),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {shownTab === "general" && (
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
            <MomentSettings />
            <HelpFromAbovePanel />
          </View>
        )}
        {shownTab === "advanced" && (
          <>
            <View
              style={[
                flexStyles.colCentered,
                flexStyles.fullWidth,
                { gap: spacing(30) },
              ]}
            >
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

              {/* Resetting takes several taps on Reset, counted down in the
                  warning, so it can't happen by accident. */}
              {resetTapsLeft !== null ? (
                <View
                  style={[
                    flexStyles.colCentered,
                    {
                      width: "100%",
                      gap: spacing(12),
                      padding: spacing(14),
                      borderRadius: spacing(16),
                      borderWidth: 1,
                      borderColor: theme.faint,
                    },
                  ]}
                >
                  <Text
                    size="sm"
                    weight={400}
                    color={theme.ink}
                    style={{ textAlign: "center" }}
                  >
                    {t("resetData.warning")}
                  </Text>
                  <View style={{ width: "100%", gap: spacing(10) }}>
                    <Button
                      fullWidth
                      size="md"
                      uppercase={false}
                      text={t("resetData.tapsLeft", { count: resetTapsLeft })}
                      disabled={isResettingData}
                      onPress={async () => {
                        if (resetTapsLeft > 1) {
                          setResetTapsLeft(resetTapsLeft - 1);
                          return;
                        }
                        setIsResettingData(true);
                        try {
                          updateSettings(DEFAULT_GLOBAL_SETTINGS);
                          await resetAllSettings();
                          await resetCampaignProgress();
                          await resetHintMode();
                          onHomeDataInvalidated();
                          setResetTapsLeft(null);
                          onClose();
                        } finally {
                          setIsResettingData(false);
                        }
                      }}
                    />
                    <Button
                      fullWidth
                      size="md"
                      uppercase={false}
                      text={tCommon("cancel")}
                      theme="blue"
                      disabled={isResettingData}
                      onPress={() => setResetTapsLeft(null)}
                    />
                  </View>
                </View>
              ) : (
                <Button
                  textOnly
                  size="xs"
                  uppercase={false}
                  text={t("resetData.button")}
                  theme={Colors.cardSelectRed}
                  onPress={() => setResetTapsLeft(RESET_TAPS)}
                />
              )}

              <View
                style={[
                  flexStyles.rowCentered,
                  { gap: spacing(16), flexWrap: "wrap" },
                ]}
              >
                <Text
                  {...footerLink}
                  onPress={() => {
                    onClose();
                    router.push("/privacy");
                  }}
                >
                  {t("privacyPolicy")}
                </Text>
                {/* Which build this is, since dev and release installs look
                    alike. A knock on it turns dev mode on (red once the
                    first half is in); its box above turns it off. */}
                <Text
                  {...footerText}
                  color={devModeKnock.armed ? Colors.lose : footerText.color}
                  onPress={onVersionPress}
                  suppressHighlighting
                >
                  {BUILD_LABEL}
                </Text>
              </View>
            </View>
          </>
        )}
        {shownTab === "theme" && (
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
        {/* Dev mode's shortcuts, boxed and named so they can't pass for
            settings. */}
        {shownTab === "dev" && (
          <View
            style={{
              width: "100%",
              gap: spacing(12),
              padding: spacing(20),
              borderRadius: spacing(16),
              backgroundColor: rgba(theme.ink, 0.1),
            }}
          >
            <View
              style={[
                flexStyles.rowCentered,
                {
                  justifyContent: "space-between",
                  gap: spacing(12),
                  paddingBottom: spacing(12),
                },
              ]}
            >
              <Text
                weight={500}
                size="md"
                color={theme.ink}
                style={{ flexShrink: 1 }}
              >
                {t("devMode.title")}
              </Text>
              <Text
                {...footerLink}
                accessibilityRole="button"
                onPress={onDevModeOff}
                suppressHighlighting
              >
                {t("devMode.turnOff")}
              </Text>
            </View>
            <Button
              size="md"
              uppercase={false}
              text={t("populateTestProgress")}
              iconName="milky-way"
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
            <Button
              size="md"
              uppercase={false}
              text={t("devMode.unlockAll")}
              iconName="unlock"
              onPress={async () => {
                await unlockAllCampaignGames();
                onHomeDataInvalidated();
                showToast(t("devMode.unlockedAll"));
              }}
            />
            <Button
              size="md"
              uppercase={false}
              text={t("devMode.grantMercySkip")}
              iconName="ufo"
              theme="blue"
              onPress={async () => {
                const progress = await grantMercySkip();
                onHomeDataInvalidated();
                showToast(
                  t("devMode.mercySkipGranted", {
                    count: progress.mercySkipCount,
                  }),
                );
              }}
            />
            <Button
              size="md"
              uppercase={false}
              text={t("devMode.artGallery")}
              iconName="gallery"
              theme="blue"
              onPress={() => {
                onClose();
                router.push("/art-gallery");
              }}
            />
            <View style={{ width: "100%", paddingTop: spacing(12) }}>
              <MomentPreviews />
            </View>
          </View>
        )}
      </ScrollView>
    </ModalFull>
  );
};
