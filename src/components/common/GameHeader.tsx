import { useTranslation } from "@/i18n";
import { usePalette } from "@/styles/palette";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, LayerZIndexes, layoutDims, rgba } from "@/styles/styles";
import { memo } from "react";
import { Animated, View } from "react-native";
import { SURFACE_OPACITY } from "@/components/ui/FloatingBar";
import { Button } from "../Button/Button";
import { ResetButton } from "./ResetButton";

type Props = {
  isCampaignMode: boolean;
  titleColor: string;
  backgroundColor: string;
  /** UI scale factor (see useResponsiveUiLayoutFromWidth). */
  scale: number;
  contentMaxWidth: number;
  insetTop: number;
  /** Hidden behind the quick-start tips: fades out and ignores touches. */
  hidden: boolean;
  opacity: Animated.Value;
  instructionsHighlight: Animated.Value;
  ended: boolean;
  canUndo: boolean;
  undoDisabled: boolean;
  /** "Show hint button" is on. */
  showHint: boolean;
  /** No hint to ask for: the game has none, has ended, or is busy. */
  hintDisabled: boolean;
  onHome: () => void;
  onRules: () => void;
  onHint: () => void;
  onUndo: () => void;
  onReset: () => void;
  onMenu: () => void;
};

/**
 * The in-game menu bar. Memoized with stable callbacks from GameWrapper, so it
 * doesn't re-render on every move.
 */
export const GameHeader = memo(function GameHeader({
  isCampaignMode,
  scale,
  contentMaxWidth,
  insetTop,
  hidden,
  opacity,
  instructionsHighlight,
  ended,
  canUndo,
  undoDisabled,
  showHint,
  hintDisabled,
  onHome,
  onRules,
  onHint,
  onUndo,
  onReset,
  onMenu,
}: Props) {
  const spacing = (value: number) => value * scale;
  const { t } = useTranslation("game");
  // The game's palette: its dark colour behind, its pale one in the icons.
  const theme = usePalette();

  return (
    <Animated.View
      style={{
        pointerEvents: hidden ? "none" : "auto",
        opacity,
        position: "relative",
        zIndex: LayerZIndexes.header,
        width: "100%",
        maxWidth: contentMaxWidth,
        alignSelf: "center",
        paddingHorizontal: spacing(layoutDims.pagePadding / 2),
        paddingTop: insetTop + spacing(layoutDims.pagePadding / 2),
        paddingBottom: spacing(layoutDims.pagePadding / 2),
      }}
    >
      <View
        style={[
          flexStyles.rowCentered,
          {
            backgroundColor: rgba(theme.surface, SURFACE_OPACITY),
            // Round ends, as the tab bar has.
            borderRadius: spacing(layoutDims.menuBarHeight / 2),
            width: "100%",
            height: spacing(layoutDims.menuBarHeight),
            paddingHorizontal: spacing(layoutDims.pagePadding / 2),
            // No edge; a soft, wide shadow lifts it off the game instead.
            boxShadow: `${spacing(2)}px ${spacing(4)}px ${spacing(30)}px ${rgba(Colors.black, 0.3)}`,
          },
        ]}
      >
        <Button
          headerButton
          accessibilityLabel={
            isCampaignMode ? t("menu.campaign") : t("menu.home")
          }
          onPress={onHome}
          iconName={isCampaignMode ? "milky-way" : "home"}
          iconColor={theme.accent}
          style={{ flex: 1, paddingHorizontal: 0 }}
        />

        <View
          style={{
            position: "relative",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            paddingHorizontal: 0,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Animated.View
              style={{
                width: spacing(layoutDims.menuButtonSize),
                height: spacing(layoutDims.menuButtonSize),
                borderRadius: spacing(layoutDims.menuButtonSize / 2),
                backgroundColor: theme.accent,
                opacity: instructionsHighlight.interpolate({
                  inputRange: [0, 0.2, 0.7, 1],
                  outputRange: [0, 0.8, 0.7, 0],
                }),
                transform: [
                  {
                    scale: instructionsHighlight.interpolate({
                      inputRange: [0, 0.6, 0.7, 1],
                      outputRange: [1.5, 1.5, 0.8, 0],
                    }),
                  },
                ],
              }}
            />
          </View>

          <Button
            headerButton
            onPress={onRules}
            iconName={"instructions"}
            accessibilityLabel={t("menu.rules")}
            iconColor={theme.accent}
            style={{ width: "100%", paddingHorizontal: 0 }}
          />
        </View>

        {showHint && (
          <Button
            headerButton
            onPress={onHint}
            iconName="hint"
            accessibilityLabel={t("menu.hint")}
            iconColor={hintDisabled ? theme.faint : theme.accent}
            disabled={hintDisabled}
            style={{ flex: 1, paddingHorizontal: 0 }}
          />
        )}

        <Button
          headerButton
          onPress={onUndo}
          iconName="undo"
          accessibilityLabel={t("menu.undo")}
          iconColor={!ended && canUndo ? theme.accent : theme.faint}
          disabled={undoDisabled}
          style={{ flex: 1, paddingHorizontal: 0 }}
        />

        <ResetButton
          reset={onReset}
          label={t("menu.reset")}
          iconColor={theme.accent}
          pressedIconColor={theme.ink}
        />

        <Button
          headerButton
          onPress={onMenu}
          iconName="more"
          accessibilityLabel={t("menu.menu")}
          iconColor={theme.accent}
          style={{ flex: 1, paddingHorizontal: 0 }}
        />
      </View>
    </Animated.View>
  );
});
