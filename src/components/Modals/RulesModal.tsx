import React from "react";
import ModalFull from "./ModalFull";
import { Text } from "@/components/common/Text";
import { INSTRUCTIONS_UNAVAILABLE } from "@/constants/constants";
import { getGameInfo } from "@/data/game-menu";
import { useGamePath } from "@/hooks/useGamePath";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { View, ViewStyle } from "react-native";
import { RichText } from "../common/RichText";
import { lightenHexColor } from "@/utils/utils";
import { ScrollView } from "react-native-gesture-handler";
import { useModalStyles } from "@/styles/modalStyles";
import { CreditsSection } from "./GameModal";

export const RulesModal = ({ onClose }: { onClose: () => void }) => {
  const pathname = useGamePath();
  const gameInfo = getGameInfo(pathname);
  const { spacing } = useResponsiveMetrics();
  const modalStyles = useModalStyles();
  const headingColor = gameInfo.gameColorPale ?? Colors.white;

  return (
    <ModalFull
      onClose={onClose}
      title="How to Play"
      titleColor={headingColor}
      backgroundColor={gameInfo.gameColorDark}
      iconName="instructions"
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
            headingColor={headingColor}
            style={{
              paddingLeft: spacing(16),
              paddingRight: spacing(20),
              paddingVertical: spacing(16),
              gap: spacing(8),
              borderRadius: spacing(12),
              backgroundColor: lightenHexColor(gameInfo.gameColorDark, 0.1),
            }}
          />

          <RichText
            content={gameInfo.howToPlay ?? [INSTRUCTIONS_UNAVAILABLE]}
            headingColor={headingColor}
          />

          {gameInfo.background?.authorName && (
            <CreditsSection style={{ marginTop: spacing(40) }} />
          )}
        </View>
      </ScrollView>
    </ModalFull>
  );
};

type QuickStartProps = {
  gameInfo: ReturnType<typeof getGameInfo>;
  headingColor: string;
  style?: ViewStyle | ViewStyle[];
};

export const QuickStart = ({
  gameInfo,
  headingColor,
  style,
}: QuickStartProps) => {
  const { spacing } = useResponsiveMetrics();

  return (
    gameInfo.quickStart && (
      <View style={[flexStyles.colStart, flexStyles.fullWidth, style]}>
        {gameInfo.quickStart.map((item, itemIndex) => (
          <View
            key={`l-${itemIndex}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing(8),
            }}
          >
            <Icon name="fast-forward" size={16} color={headingColor} />
            <Text
              size="md"
              weight={400}
              color={Colors.white}
              style={{ flex: 1 }}
              lineHeight={1.2}
            >
              {item}
            </Text>
          </View>
        ))}
      </View>
    )
  );
};
