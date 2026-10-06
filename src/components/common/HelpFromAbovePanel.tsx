import { HintModeRadio } from "@/components/common/HintModeRadio";
import { Text } from "@/components/common/Text";
import { UfoPanel } from "@/components/common/UfoPanel";
import { saveHintMode, useHintMode } from "@/data/hint-mode";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { usePalette } from "@/styles/palette";
import { UfoColors } from "@/styles/styles";
import { useState, type ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";

/**
 * The "Help from Above" box: what the header's UFO is for and the choice of
 * how it helps. The same in the settings and in the Rules modal, where it can
 * also fold down to its heading.
 */
export function HelpFromAbovePanel({
  collapsible = false,
  unavailable = false,
  style,
  children,
}: {
  /** Starts folded down to its heading, which opens and closes it. */
  collapsible?: boolean;
  /** The game has no hints: says so, in place of the choice. */
  unavailable?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Under the choice (a "Got it" button, say). */
  children?: ReactNode;
}) {
  const { t } = useTranslation("settings");
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const mode = useHintMode();
  const [isOpen, setOpen] = useState(!collapsible);
  // With nothing to choose, there is nothing to fold away.
  const foldable = collapsible && !unavailable;
  const open = isOpen || unavailable;
  return (
    <UfoPanel
      title={t("helpFromAbove.label")}
      style={style}
      // Folded away or with nothing to offer, it keeps still.
      still={!open || unavailable}
      trailing={
        foldable && (
          <Icon
            name={open ? "expand-less" : "expand-more"}
            size={spacing(24)}
            color={UfoColors.green}
          />
        )
      }
      wrapHeading={
        foldable
          ? (heading) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setOpen((value) => !value)}
              >
                {heading}
              </Pressable>
            )
          : undefined
      }
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
        open && (
          <>
            <Text
              size="sm"
              weight={300}
              color={theme.ink}
              lineHeight={1.4}
              style={{ textAlign: "center" }}
            >
              {t("helpFromAbove.description")}
            </Text>
            <HintModeRadio
              value={mode}
              onChange={(value) => {
                void saveHintMode(value);
              }}
            />
            {children}
          </>
        )
      )}
    </UfoPanel>
  );
}
