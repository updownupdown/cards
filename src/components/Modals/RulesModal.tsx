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
import { View, ViewStyle } from "react-native";
import { RichText } from "../common/RichText";
import { ScrollView } from "react-native-gesture-handler";
import { useModalStyles } from "@/styles/modalStyles";
import { markHintIntroSeen, useHintIntroSeen } from "@/data/hint-mode";
import { useHasHintFinder } from "@/hints/hint-store";
import { ActionButton } from "@/components/ui/Nocturne";
import { HelpFromAbovePanel } from "@/components/common/HelpFromAbovePanel";
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

          {!showIntro && (
            <HelpFromAbovePanel
              collapsible
              unavailable={!hasHints}
              style={{ marginTop: spacing(40) }}
            />
          )}
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

/**
 * Introduces the header's UFO ("Help from Above") and lets the player pick
 * how it helps. Once put away it doesn't come back at the top; the Rules keep
 * it folded at the bottom.
 */
function HelpFromAboveIntro({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation("game");
  return (
    <HelpFromAbovePanel>
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
    </HelpFromAbovePanel>
  );
}
