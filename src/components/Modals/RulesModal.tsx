import React, { useState } from "react";
import { usePalette } from "@/styles/palette";
import ModalFull from "./ModalFull";
import { Text } from "@/components/common/Text";
import { getGameInfo } from "@/data/game-menu";
import { useGamePath } from "@/hooks/useGamePath";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGame } from "@/i18n/content";
import { flexStyles } from "@/styles/flexStyles";
import { Pressable, View, ViewStyle } from "react-native";
import { RichText } from "../common/RichText";
import { ScrollView } from "react-native-gesture-handler";
import { useModalStyles } from "@/styles/modalStyles";
import {
  markHintIntroSeen,
  saveHintMode,
  useHintIntroSeen,
  useHintMode,
} from "@/data/hint-mode";
import { useHasHintFinder } from "@/hints/hint-store";
import { Icon } from "@/icons";
import { ActionButton } from "@/components/ui/Nocturne";
import { HintModeRadio } from "@/components/common/HintModeRadio";
import { UfoPanel } from "@/components/common/UfoPanel";
import { UfoColors } from "@/styles/styles";

export const RulesModal = ({ onClose }: { onClose: () => void }) => {
  const pathname = useGamePath();
  const gameInfo = localizeGame(
    getGameInfo(pathname),
    pathname,
    useDisplayLanguage(),
  );
  const { t } = useTranslation("game");
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const modalStyles = useModalStyles();
  // The game's own accent, as the game modal's headings.
  const headingColor = theme.accent2;
  const hasHints = useHasHintFinder();
  const introSeen = useHintIntroSeen();
  // Introduced at the top the first time the Rules open on a game with
  // hints; once put away, it folds into a row at the bottom.
  const [showIntro, setShowIntro] = useState(() => hasHints && !introSeen);

  return (
    <ModalFull
      onClose={onClose}
      gameName={gameInfo.title}
      title={t("rules.title")}
    >
      <ScrollView
        contentContainerStyle={modalStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            {
              alignItems: "flex-start",
            },
          ]}
        >
          {showIntro && (
            <HelpFromAboveIntro onDone={() => setShowIntro(false)} />
          )}

          <QuickStart
            gameInfo={gameInfo}
            style={{
              // Clear of the intro's border and its drop shadow.
              marginTop: showIntro ? spacing(24) : 0,
              paddingLeft: spacing(16),
              paddingRight: spacing(20),
              paddingVertical: spacing(16),
              gap: spacing(8),
              borderRadius: spacing(14),
              backgroundColor: theme.raise,
            }}
          />

          <RichText
            content={gameInfo.howToPlay ?? [t("rules.unavailable")]}
            headingColor={headingColor}
          />

          {hasHints && !showIntro && <HelpFromAboveRow />}
        </View>
      </ScrollView>
    </ModalFull>
  );
};

type QuickStartProps = {
  gameInfo: ReturnType<typeof getGameInfo>;
  style?: ViewStyle | ViewStyle[];
};

export const QuickStart = ({ gameInfo, style }: QuickStartProps) => {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();

  return (
    gameInfo.quickStart && (
      <View style={[flexStyles.colStart, flexStyles.fullWidth, style]}>
        {gameInfo.quickStart.map((item, itemIndex) => (
          <View
            key={`l-${itemIndex}`}
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              gap: spacing(8),
            }}
          >
            <Text
              size="xs"
              weight={700}
              color={theme.accent2}
              style={{ minWidth: spacing(14) }}
            >
              {itemIndex + 1}.
            </Text>
            <Text
              size="md"
              weight={300}
              color={theme.ink}
              style={{ flex: 1 }}
              lineHeight={1.3}
            >
              {item}
            </Text>
          </View>
        ))}
      </View>
    )
  );
};

/** What the UFO does, and the choice of how it helps. */
function HelpChoice() {
  const { t } = useTranslation("game");
  const theme = usePalette();
  const mode = useHintMode();
  return (
    <>
      <Text size="sm" weight={300} color={theme.ink} lineHeight={1.4}>
        {t("rules.helpIntro.body")}
      </Text>
      <HintModeRadio
        value={mode}
        onChange={(value) => {
          void saveHintMode(value);
        }}
      />
    </>
  );
}

/**
 * Introduces the header's UFO ("Help from Above") and lets the player pick
 * how it helps. Once put away it doesn't come back at the top; the Rules keep
 * it as a row at the bottom.
 */
function HelpFromAboveIntro({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation("game");
  return (
    <UfoPanel title={t("rules.helpIntro.title")}>
      <HelpChoice />
      <ActionButton
        label={t("rules.helpIntro.done")}
        small
        color={UfoColors.green}
        ink={UfoColors.black}
        style={{ alignSelf: "flex-end" }}
        onPress={() => {
          onDone();
          void markHintIntroSeen();
        }}
      />
    </UfoPanel>
  );
}

/**
 * At the bottom of the Rules: the UFO and "Help from Above", which opens to
 * the same choice as the settings.
 */
function HelpFromAboveRow() {
  const { t } = useTranslation("game");
  const { spacing } = useResponsiveMetrics();
  const [open, setOpen] = useState(false);
  return (
    <UfoPanel
      title={t("rules.helpIntro.title")}
      style={{ marginTop: spacing(24) }}
      trailing={
        <Icon
          name={open ? "expand-less" : "expand-more"}
          size={spacing(24)}
          color={UfoColors.green}
        />
      }
      wrapHeading={(heading) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((value) => !value)}
        >
          {heading}
        </Pressable>
      )}
    >
      {open && <HelpChoice />}
    </UfoPanel>
  );
}
