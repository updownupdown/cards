import { Text } from "@/components/common/Text";
import { Button } from "@/components/Button/Button";
import { Icon } from "@/icons";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { useMemo, useState } from "react";
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
  const { isWeb, isIos, isStandalone, canPromptInstall, promptInstall } =
    usePwaInstallPrompt();
  const [installState, setInstallState] = useState<
    "idle" | "accepted" | "dismissed"
  >("idle");

  const title = useMemo(() => {
    if (isIos) {
      return "Add SoloSuite to your Home Screen";
    }
    if (canPromptInstall) {
      return "Install SoloSuite";
    }
    return "Add SoloSuite to your device";
  }, [canPromptInstall, isIos]);

  const instructions = useMemo(() => {
    if (isIos) {
      return "In Safari, tap the Share button, then choose “Add to Home Screen”.";
    }

    if (canPromptInstall) {
      return "Install for faster launches, a full-screen experience, and offline play.";
    }

    return "Open your browser menu and choose “Install app” or “Add to Home screen”.";
  }, [canPromptInstall, isIos]);

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
      <View
        style={[
          flexStyles.rowCentered,
          { justifyContent: "flex-start", gap: spacing(10) },
        ]}
      >
        <Icon name="home" size={spacing(20)} color={Colors.buttonBlue} />
        <Text weight={600} size="md" color={Colors.K100}>
          {title}
        </Text>
      </View>

      <Text size="sm" weight={300} color={Colors.K300}>
        {instructions}
      </Text>

      {installState === "accepted" && (
        <Text size="xs" color={Colors.accentGreen}>
          Nice! Your browser is finishing the install in the background.
        </Text>
      )}

      {installState === "dismissed" && (
        <Text size="xs" color={Colors.K400}>
          No problem — you can install any time from your browser menu.
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
              text="Install now"
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
              text="Not now"
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
