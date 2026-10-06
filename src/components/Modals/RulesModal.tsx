import React from "react";
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
import { useHintButtonShown } from "@/data/hint-button";
import { useHasHintFinder } from "@/hints/hint-store";
import { useGameSettings } from "@/hooks/useGameSettings";
import { Icon } from "@/icons";
import { rgba } from "@/styles/styles";

/** Players who've won a game this often know it: no more Hint button tip. */
const HINT_TIP_MAX_WINS = 3;

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
  const hintButtonShown = useHintButtonShown();
  const hasHints = useHasHintFinder();
  const { settings: gameSettings } = useGameSettings(pathname);
  const showHintTip =
    hintButtonShown &&
    hasHints &&
    !!gameSettings &&
    gameSettings.stats.wins < HINT_TIP_MAX_WINS;

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
          <QuickStart
            gameInfo={gameInfo}
            style={{
              paddingLeft: spacing(16),
              paddingRight: spacing(20),
              paddingVertical: spacing(16),
              gap: spacing(8),
              borderRadius: spacing(14),
              backgroundColor: theme.raise,
            }}
          />

          {showHintTip && (
            <View
              style={[
                flexStyles.fullWidth,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing(12),
                  paddingLeft: spacing(14),
                  paddingRight: spacing(20),
                  paddingVertical: spacing(12),
                  marginTop: spacing(10),
                  borderRadius: spacing(14),
                  backgroundColor: rgba(theme.raise, 0.5),
                },
              ]}
            >
              <Icon name="hint" size={spacing(26)} color={theme.accent} />
              <Text
                size="sm"
                weight={300}
                color={theme.ink}
                style={{ flex: 1 }}
                lineHeight={1.3}
              >
                {t("rules.hintTip")}
              </Text>
            </View>
          )}

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
