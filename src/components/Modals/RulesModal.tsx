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
import {
  markHintIntroSeen,
  saveHintMode,
  useHintIntroSeen,
  useHintMode,
} from "@/data/hint-mode";
import { useHasHintFinder } from "@/hints/hint-store";
import { Icon } from "@/icons";
import { Button } from "@/components/Button/Button";
import { HintModeRadio } from "@/components/common/HintModeRadio";

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
  // Shown the first time the Rules open on a game with hints; once put
  // away, a note of the same size says where to change it.
  const [showIntro] = useState(() => hasHints && !introSeen);

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
          {showIntro && <HelpFromAboveIntro />}

          <QuickStart
            gameInfo={gameInfo}
            style={{
              marginTop: showIntro ? spacing(10) : 0,
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
 * how it helps. Once put away it doesn't come back; the note that replaces it
 * keeps its size, so the rules below don't jump.
 */
function HelpFromAboveIntro() {
  const { t } = useTranslation("game");
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const mode = useHintMode();
  const [dismissed, setDismissed] = useState(false);
  const [height, setHeight] = useState<number | undefined>(undefined);

  const boxStyle: ViewStyle = {
    width: "100%",
    minHeight: dismissed ? height : undefined,
    gap: spacing(10),
    paddingHorizontal: spacing(16),
    paddingVertical: spacing(14),
    borderRadius: spacing(14),
    backgroundColor: theme.raise,
  };

  if (dismissed) {
    return (
      <View
        style={[
          boxStyle,
          { flexDirection: "row", alignItems: "center", gap: spacing(12) },
        ]}
      >
        <Icon name="ufo" size={spacing(26)} color={theme.accent} />
        <Text
          size="sm"
          weight={300}
          color={theme.ink}
          style={{ flex: 1 }}
          lineHeight={1.3}
        >
          {t("rules.helpIntro.later")}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={boxStyle}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: spacing(10) }}
      >
        <Icon name="ufo" size={spacing(26)} color={theme.accent} />
        <Text size="md" weight={700} color={theme.accent2} style={{ flex: 1 }}>
          {t("rules.helpIntro.title")}
        </Text>
      </View>
      <Text size="sm" weight={300} color={theme.ink} lineHeight={1.3}>
        {t("rules.helpIntro.body")}
      </Text>
      <HintModeRadio
        value={mode}
        onChange={(value) => {
          void saveHintMode(value);
        }}
      />
      <Button
        text={t("rules.helpIntro.done")}
        size="sm"
        style={{ alignSelf: "flex-end" }}
        onPress={() => {
          setDismissed(true);
          void markHintIntroSeen();
        }}
      />
    </View>
  );
}
