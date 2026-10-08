import { useTranslation } from "@/i18n";
import { usePalette } from "@/styles/palette";
import { flexStyles } from "@/styles/flexStyles";
import {
  Colors,
  LayerZIndexes,
  layoutDims,
  rgba,
  UfoColors,
} from "@/styles/styles";
import { memo, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import {
  setHintDock,
  useHintUfoHovering,
  useHintUfoOut,
  useHasHintFinder,
} from "@/hints/hint-store";
import { SURFACE_OPACITY } from "@/components/ui/FloatingBar";
import { Button } from "../Button/Button";
import { ResetButton } from "./ResetButton";
import { HelpFromAbovePanel } from "./HelpFromAbovePanel";
import { ActionButton } from "@/components/ui/Nocturne";
import { markHintIntroSeen, useHintIntroSeen } from "@/data/hint-mode";
import { HoveringUfoIcon } from "@/hints/HintUfo";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";

type Props = {
  isCampaignMode: boolean;
  titleColor: string;
  backgroundColor: string;
  /** UI scale factor (see useResponsiveUiLayoutFromWidth). */
  scale: number;
  contentMaxWidth: number;
  insetTop: number;
  /** Under the quick-start tips: still drawn, but ignores touches. */
  hidden: boolean;
  ended: boolean;
  canUndo: boolean;
  undoDisabled: boolean;
  /** "Help from Above" isn't off: the header shows its UFO. */
  showHint: boolean;
  /** No hint to ask for: the game has none, has ended, or is busy. */
  hintDisabled: boolean;
  onHome: () => void;
  /** Dev mode: the trophy, which wins the game at once. */
  onDevWin?: () => void;
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
  ended,
  canUndo,
  undoDisabled,
  showHint,
  hintDisabled,
  onHome,
  onDevWin,
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
  const hasHints = useHasHintFinder();
  const introSeen = useHintIntroSeen();
  // Until the player has read about "Help from Above", the UFO hovers and
  // opens its explanation instead of asking for a hint.
  const intro = showHint && hasHints && !introSeen;
  const [introOpen, setIntroOpen] = useState(false);

  return (
    <View
      style={{
        pointerEvents: hidden ? "none" : "auto",
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

        {onDevWin && (
          <Button
            headerButton
            onPress={onDevWin}
            iconName="trophy"
            accessibilityLabel={t("menu.devWin")}
            iconColor={ended ? theme.faint : theme.accent}
            disabled={ended}
            style={{ flex: 1, paddingHorizontal: 0 }}
          />
        )}

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
          <HintDock
            onHint={onHint}
            label={t("menu.hint")}
            iconColor={hintDisabled ? theme.faint : theme.accent}
            disabled={hintDisabled}
            intro={intro}
            onIntro={() => setIntroOpen((open) => !open)}
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

      {intro && introOpen && (
        <View
          style={{
            position: "absolute",
            top: "100%",
            left: spacing(layoutDims.pagePadding / 2),
            right: spacing(layoutDims.pagePadding / 2),
            marginTop: spacing(-layoutDims.pagePadding / 4),
          }}
        >
          <HelpFromAbovePanel>
            <ActionButton
              label={t("rules.helpIntro.done")}
              small
              color={UfoColors.green}
              ink={UfoColors.black}
              style={{ alignSelf: "flex-end" }}
              onPress={() => {
                setIntroOpen(false);
                void markHintIntroSeen();
              }}
            />
          </HelpFromAbovePanel>
        </View>
      )}
    </View>
  );
});

/**
 * The header's UFO, which asks for a hint. It tells the hint system where it
 * is, so the flying UFO (Autopilot) leaves from it and comes back to it, and
 * it hides while that UFO is out.
 */
function HintDock({
  onHint,
  label,
  iconColor,
  disabled,
  intro,
  onIntro,
}: {
  onHint: () => void;
  label: string;
  iconColor: string;
  disabled: boolean;
  /** The intro hasn't been read: a hovering UFO that opens it. */
  intro: boolean;
  onIntro: () => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const dock = useRef<View>(null);
  const out = useHintUfoOut();
  const hovering = useHintUfoHovering();

  useEffect(
    () =>
      setHintDock(
        () =>
          new Promise((resolve) => {
            const node = dock.current;
            const timer = setTimeout(() => resolve(null), 100);
            if (!node?.measureInWindow) return;
            node.measureInWindow((x, y, width, height) => {
              clearTimeout(timer);
              resolve(
                width > 0
                  ? {
                      x: x + width / 2,
                      y: y + height / 2,
                      size: Math.min(width, height),
                    }
                  : null,
              );
            });
          }),
      ),
    [],
  );

  return (
    <View
      ref={dock}
      collapsable={false}
      style={{
        flex: 1,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        opacity: out || hovering ? 0 : 1,
      }}
    >
      {intro ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onIntro}
          style={{
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HoveringUfoIcon size={spacing(layoutDims.menuIconSize)} />
        </Pressable>
      ) : (
        <Button
          headerButton
          onPress={out ? () => {} : onHint}
          iconName="ufo"
          accessibilityLabel={label}
          iconColor={iconColor}
          disabled={disabled}
          style={{ width: "100%", paddingHorizontal: 0 }}
        />
      )}
    </View>
  );
}
