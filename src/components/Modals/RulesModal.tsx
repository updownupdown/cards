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
