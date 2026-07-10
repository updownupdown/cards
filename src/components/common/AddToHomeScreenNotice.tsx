import { Text } from "@/components/common/Text";
import { Button } from "@/components/Button/Button";
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

  const instructions = useMemo(() => {
    if (isStandalone) {
      return "This app is already installed on your device.";
    }

    if (isIos) {
      return "On iPhone or iPad, open this page in Safari, tap Share, then choose Add to Home Screen.";
    }

    if (canPromptInstall) {
      return "Install this app for faster launches and a full-screen experience.";
    }

    return "Open your browser menu and choose Install app or Add to Home screen.";
  }, [canPromptInstall, isIos, isStandalone]);

  if (!isWeb) {
    return null;
  }

  return (
    <View
      style={{
        width: "100%",
        borderRadius: spacing(14),
        backgroundColor: rgba(Colors.K950, 0.5),
        padding: spacing(24),
        gap: spacing(10),
        boxShadow: `0px 4px 8px ${rgba(Colors.K900, 0.3)}`,
        marginBottom: spacing(40),
      }}
    >
      <Text weight={500} size="md" color={Colors.K100}>
        Add this app to your home screen
      </Text>

      <Text size="sm" weight={300} color={Colors.K300}>
        {instructions}
      </Text>

      {installState === "accepted" && !isStandalone && (
        <Text size="xs" color={Colors.accentGreen}>
          Install was accepted. Your browser may complete setup in the
          background.
        </Text>
      )}

      {installState === "dismissed" && (
        <Text size="xs" color={Colors.K400}>
          Install prompt dismissed. You can still install later from your
          browser menu.
        </Text>
      )}

      <View
        style={[
          flexStyles.rowCentered,
          {
            justifyContent: "flex-start",
            gap: spacing(16),
          },
        ]}
      >
        {canPromptInstall && (
          <Button
            text="Install now"
            uppercase={false}
            textOnly
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
            size="xs"
            text="Dismiss"
            textOnly
            onPress={() => onDismiss?.()}
            style={{ marginTop: spacing(8) }}
          />
        )}
      </View>
    </View>
  );
}
