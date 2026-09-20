import {
  clearLastGameSession,
  DEFAULT_GLOBAL_SETTINGS,
  populateTestGameProgress,
  resetAllSettings,
} from "@/data/game-menu";
import {
  populateTestNodesProgress,
  resetNodesProgress,
} from "@/data/nodes-progress";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors } from "@/styles/styles";
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
import { router } from "expo-router";
import React from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { AddToHomeScreenNotice } from "../common/AddToHomeScreenNotice";
import { SelectControl } from "../common/SelectControl";
import { SettingControl } from "../common/SettingControl";
import { Text } from "../common/Text";
import ModalFull from "./ModalFull";

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

  const phoneLanguageName =
    LANGUAGE_NAMES[resolveLanguage("system", getDeviceLanguageCodes())];
  // "Auto" always comes first; the language it resolves to is still listed
  // below, so it can be chosen explicitly.
  const languageOptions: { label: string; value: LanguagePreference }[] = [
    {
      value: "system",
      label: t("language.system", { language: phoneLanguageName }),
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

  const footerText = { size: "xs", weight: 300, color: Colors.K600 } as const;
  const footerLink = {
    size: "xs",
    weight: 500,
    color: Colors.accentBlue,
  } as const;

  return (
    <ModalFull showLogo onClose={onCloseAndRefresh}>
      <ScrollView
        contentContainerStyle={[
          modalStyles.scrollContent,
          flexStyles.colCentered,
          flexStyles.fullWidth,
          {
            flexGrow: 1,
            gap: spacing(30),
            paddingVertical: spacing(30),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            { gap: spacing(24) },
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
            <Text weight={500} size="lg" color={Colors.K200}>
              {t("language.label")}
            </Text>
            <Text size="sm" weight={400} color={Colors.white}>
              {t("language.description")}
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
            label={t("showTips.label")}
            description={t("showTips.description")}
            value={settings.showTipsForNewGames}
            type="boolean"
            onChange={(val) => {
              void updateSettings({ showTipsForNewGames: val });
            }}
          />
          <SettingControl
            label={t("keepScreenAwake.label")}
            description={t("keepScreenAwake.description")}
            value={settings.keepScreenAwake}
            type="boolean"
            onChange={(val) => {
              void updateSettings({ keepScreenAwake: val });
            }}
          />
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

        <AddToHomeScreenNotice />

        {isLocalDevEnvironment() && (
          <Button
            size="md"
            uppercase={false}
            text={t("populateTestProgress")}
            iconName="nodes"
            theme="blue"
            disabled={isPopulatingTestData}
            onPress={async () => {
              setIsPopulatingTestData(true);
              try {
                await Promise.all([
                  populateTestGameProgress(),
                  populateTestNodesProgress(),
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
            { gap: spacing(6), marginTop: "auto" },
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
                    await resetNodesProgress();
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
        </View>
      </ScrollView>
    </ModalFull>
  );
};
