import { Button } from "@/components/Button/Button";
import { RadioButtons } from "@/components/common/RadioButtons";
import { AUTO_COMPLETE_MODES, type AutoCompleteMode } from "@/data/game-menu";
import type { AutoCompleteOffer } from "@/hooks/auto-complete-offer";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import {
  Colors,
  LayerZIndexes,
  layoutDims,
  rgba,
  theme,
} from "@/styles/styles";
import { useState } from "react";
import { Animated, Pressable, View } from "react-native";

/** The autoComplete choices, side by side. */
export function AutoCompleteModeRadio({
  value,
  onChange,
}: {
  value: AutoCompleteMode;
  onChange: (value: AutoCompleteMode) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("settings");
  return (
    <RadioButtons
      options={AUTO_COMPLETE_MODES.map((option) => ({
        value: option,
        label: t(`autoComplete.${option}`),
      }))}
      selectedValue={value}
      onChange={onChange}
      containerStyle={{ width: "100%", height: spacing(44) }}
      buttonStyle={{ flex: 1, paddingHorizontal: spacing(6) }}
      selectedTextStyle={{ color: theme.accent }}
    />
  );
}

/**
 * Offers to finish the game by stacking the rest of its cards on the
 * foundations: a bar just under the header, as wide as it. The settings icon
 * opens the autoComplete choices (for every game), the middle button
 * stacks the cards, and the X closes the bar until the next deal.
 */
export function AutoCompletePanel({
  offer,
  active,
  opacity,
  top,
  backgroundColor,
  color,
  buttonTheme,
}: {
  offer: AutoCompleteOffer;
  /** False while it fades out, when it no longer takes taps. */
  active: boolean;
  opacity: Animated.Value;
  /** The header's bottom edge. */
  top: number;
  backgroundColor: string;
  color: string;
  /** The game's button colour. */
  buttonTheme: string;
}) {
  const { spacing, ui } = useResponsiveMetrics();
  const { t } = useTranslation("game");
  const { settings, updateSettings } = useGlobalSettings();
  const [expanded, setExpanded] = useState(false);
  const rowHeight = spacing(48);
  const iconButton = {
    width: rowHeight + spacing(8),
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  return (
    <Animated.View
      style={[
        active ? pointerEventsStyles.boxNone : pointerEventsStyles.none,
        {
          opacity,
          position: "absolute",
          top,
          left: 0,
          right: 0,
          zIndex: LayerZIndexes.autoCompletePanel,
          alignItems: "center",
        },
      ]}
    >
      <View
        style={{
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          paddingHorizontal: spacing(layoutDims.pagePadding / 2),
        }}
      >
        <View
          style={{
            borderRadius: rowHeight / 2,
            overflow: "hidden",
            backgroundColor: rgba(backgroundColor, 0.95),
            boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.black, 0.2)}, ${spacing(2)}px ${spacing(4)}px ${spacing(10)}px ${rgba(Colors.black, 0.2)}`,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              height: rowHeight,
              gap: spacing(8),
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("autoComplete.settings")}
              accessibilityState={{ expanded }}
              onPress={() => setExpanded((current) => !current)}
              style={iconButton}
            >
              <Icon name="settings" size={spacing(24)} color={color} />
            </Pressable>
            <Button
              text={t("autoComplete.start")}
              size="md"
              uppercase={false}
              theme={buttonTheme}
              onPress={offer.start}
              style={{ flex: 1 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("autoComplete.dismiss")}
              onPress={offer.dismiss}
              style={iconButton}
            >
              <Icon name="close" size={spacing(24)} color={color} />
            </Pressable>
          </View>

          {expanded && (
            <View
              style={{
                paddingHorizontal: spacing(12),
                paddingBottom: spacing(12),
              }}
            >
              <AutoCompleteModeRadio
                value={settings.autoComplete}
                onChange={(value) =>
                  void updateSettings({ autoComplete: value })
                }
              />
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
