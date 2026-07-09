import { Text } from "@/components/common/Text";
import { Button } from "@/components/Button/Button";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { roundToPixel } from "@/utils/utils";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
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
  const scale = useResponsiveScale();
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
        borderRadius: roundToPixel(14 * scale),
        backgroundColor: rgba(Colors.K950, 0.5),
        padding: roundToPixel(24 * scale),
        gap: roundToPixel(10 * scale),
        boxShadow: `0px 4px 8px ${rgba(Colors.K900, 0.3)}`,
        marginBottom: roundToPixel(40 * scale),
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
            gap: roundToPixel(16 * scale),
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
            style={{ marginTop: roundToPixel(8 * scale) }}
          />
        )}
      </View>
    </View>
  );
}
