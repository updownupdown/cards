import { HintModeRadio } from "@/components/common/HintModeRadio";
import { Text } from "@/components/common/Text";
import { UfoPanel } from "@/components/common/UfoPanel";
import { saveHintMode, useHintMode } from "@/data/hint-mode";
import { useTranslation } from "@/i18n";
import { usePalette } from "@/styles/palette";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

/**
 * The "Help from Above" box: what the header's UFO is for and the choice of
 * how it helps. In the settings, in the Rules modal (without the line on what
 * the UFO is for) and as the UFO's introduction in a game.
 */
export function HelpFromAbovePanel({
  showDescription = true,
  unavailable = false,
  style,
  children,
}: {
  /** The line on what the UFO is for, above the choice. */
  showDescription?: boolean;
  /** The game has no hints: says so, in place of the choice. */
  unavailable?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Under the choice (a "Dismiss" button, say). */
  children?: ReactNode;
}) {
  const { t } = useTranslation("settings");
  const theme = usePalette();
  const mode = useHintMode();
  return (
    <UfoPanel
      title={t("helpFromAbove.label")}
      style={style}
      // With nothing to offer, it keeps still.
      still={unavailable}
    >
      {unavailable ? (
        <Text
          size="sm"
          weight={300}
          color={theme.dim}
          lineHeight={1.4}
          style={{ textAlign: "center" }}
        >
          {t("helpFromAbove.unavailable")}
        </Text>
      ) : (
        <>
          {showDescription && (
            <Text
              size="sm"
              weight={300}
              color={theme.ink}
              lineHeight={1.4}
              style={{ textAlign: "center" }}
            >
              {t("helpFromAbove.description")}
            </Text>
          )}
          <HintModeRadio
            value={mode}
            onChange={(value) => {
              void saveHintMode(value);
            }}
          />
          {children}
        </>
      )}
    </UfoPanel>
  );
}
