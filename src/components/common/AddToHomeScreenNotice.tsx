import { Text } from "@/components/common/Text";
import { Button } from "@/components/Button/Button";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba, theme } from "@/styles/styles";
import { useState } from "react";
import { View } from "react-native";

type AddToHomeScreenNoticeProps = {
  dismissible?: boolean;
  onDismiss?: () => void;
};

export function AddToHomeScreenNotice({
  dismissible = false,
  onDismiss,
}: AddToHomeScreenNoticeProps) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const { isWeb, browser, isStandalone, canPromptInstall, promptInstall } =
    usePwaInstallPrompt();
  const [installState, setInstallState] = useState<
    "idle" | "accepted" | "dismissed"
  >("idle");

  // Native apps and installed web apps never see this; nor does desktop
  // Firefox, which can't install web apps at all.
  if (!isWeb || isStandalone || browser === "unsupported") {
    return null;
  }

  const isIos = browser === "iosSafari" || browser === "iosOther";

  const title = isIos
    ? t("install.titleIos")
    : browser === "macSafari"
      ? t("install.titleMac")
      : canPromptInstall
        ? t("install.titleInstall")
        : t("install.titleDevice");

  const instructions = canPromptInstall
    ? t("install.instructionsInstall")
    : {
        iosSafari: t("install.instructionsIos"),
        iosOther: t("install.instructionsIosOther"),
        macSafari: t("install.instructionsMac"),
        android: t("install.instructionsBrowser"),
        desktop: t("install.instructionsDesktop"),
        inApp: t("install.instructionsInApp"),
      }[browser];

  const hideInstallButton = installState === "accepted";

  return (
    <View
      style={{
        width: "100%",
        borderRadius: spacing(14),
        backgroundColor: rgba(theme.ink, 0.04),
        borderWidth: 1,
        borderColor: rgba(theme.ink, 0.08),
        padding: spacing(20),
        gap: spacing(8),
      }}
    >
      <Text
        weight={500}
        size="md"
        color={theme.ink}
        style={{ textAlign: "center" }}
      >
        {title}
      </Text>

      <Text
        size="sm"
        weight={300}
        color={theme.dim}
        style={{ textAlign: "center" }}
      >
        {instructions}
      </Text>

      {installState === "accepted" && (
        <Text size="xs" color={Colors.accentGreen}>
          {t("install.accepted")}
        </Text>
      )}

      {installState === "dismissed" && (
        <Text size="xs" color={theme.dim}>
          {t("install.dismissed")}
        </Text>
      )}

      {(canPromptInstall || dismissible) && (
        <View
          style={[
            flexStyles.rowCentered,
            {
              justifyContent: "flex-start",
              gap: spacing(16),
              marginTop: spacing(4),
            },
          ]}
        >
          {canPromptInstall && !hideInstallButton && (
            <Button
              text={t("install.installNow")}
              theme="blue"
              uppercase={false}
              onPress={async () => {
                const outcome = await promptInstall();
                if (!outcome) {
                  return;
                }
                setInstallState(outcome);
              }}
            />
          )}

          {dismissible && (
            <Button
              size="sm"
              text={t("install.notNow")}
              textOnly
              uppercase={false}
              onPress={() => onDismiss?.()}
            />
          )}
        </View>
      )}
    </View>
  );
}
