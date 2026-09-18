import { Text } from "@/components/common/Text";
import { Button } from "@/components/Button/Button";
import { Icon } from "@/icons";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
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
  const { isWeb, isIos, isStandalone, canPromptInstall, promptInstall } =
    usePwaInstallPrompt();
  const [installState, setInstallState] = useState<
    "idle" | "accepted" | "dismissed"
  >("idle");

  const title = isIos
    ? t("install.titleIos")
    : canPromptInstall
      ? t("install.titleInstall")
      : t("install.titleDevice");

  const instructions = isIos
    ? t("install.instructionsIos")
    : canPromptInstall
      ? t("install.instructionsInstall")
      : t("install.instructionsBrowser");

  if (!isWeb || isStandalone) {
    return null;
  }

  const hideInstallButton = installState === "accepted";

  return (
    <View
      style={{
        width: "100%",
        borderRadius: spacing(14),
        backgroundColor: rgba(Colors.K800, 0.5),
        padding: spacing(24),
        gap: spacing(12),
      }}
    >
      <View style={[flexStyles.rowCentered, { gap: spacing(8) }]}>
        <Icon name="home" size={spacing(20)} color={Colors.buttonBlue} />
        <Text weight={600} size="md" color={Colors.K100}>
          {title}
        </Text>
      </View>

      <Text
        size="sm"
        weight={300}
        color={Colors.K300}
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
        <Text size="xs" color={Colors.K400}>
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
              iconName="home"
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
