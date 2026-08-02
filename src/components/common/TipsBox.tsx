import { Text } from "@/components/common/Text";
import { INSTRUCTIONS_UNAVAILABLE } from "@/constants/constants";
import { getGameInfo, normalizeGamePath } from "@/data/game-menu";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, layoutDims, rgba } from "@/styles/styles";
import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { QuickStart } from "../Modals/RulesModal";

const AUTO_CLOSE_DELAY = 15000; // milliseconds

type Props = {
  onClose: () => void;
  showRulesModal: () => void;
};

export function TipsBox({ onClose, showRulesModal }: Props) {
  const onCloseRef = useRef(onClose);
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);
  const { spacing, ui } = useResponsiveMetrics();
  const instruction = gameInfo.quickStart?.join("\n");

  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), AUTO_CLOSE_DELAY);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={{
        alignItems: "center",
        paddingHorizontal: spacing(layoutDims.pagePadding / 2),
      }}
    >
      <View
        style={[
          flexStyles.colCentered,
          {
            padding: spacing(12),
            paddingBottom: spacing(20),
            gap: spacing(16),
            outline: "none",
            width: "100%",
            maxWidth: ui.contentMaxWidth - spacing(layoutDims.pagePadding),
            borderRadius: spacing(24),
            backgroundColor: gameInfo.gameColorDark,
            boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.black, 0.3)}, ${spacing(2)}px ${spacing(4)}px ${spacing(10)}px ${rgba(
              Colors.black,
              0.3,
            )}`,
          },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            { gap: spacing(12), paddingLeft: spacing(4) },
          ]}
        >
          <Text
            size="sm"
            weight={300}
            color={gameInfo.gameColorPale}
            style={{ flex: 1 }}
          >
            Quick Start
          </Text>

          <Button
            size="sm"
            iconName="instructions"
            text="View rules"
            onPress={() => {
              onClose();
              showRulesModal();
            }}
            theme={rgba(gameInfo.gameColorPale, 0.2)}
            style={{ paddingLeft: spacing(14) }}
          />

          <Button
            size="sm"
            iconName="close"
            text="Close"
            autoProgress={AUTO_CLOSE_DELAY}
            autoProgressColor={rgba(gameInfo.gameColorPale, 0.2)}
            onPress={() => {
              onClose();
            }}
            theme={rgba(gameInfo.gameColorPale, 0.2)}
            style={{ paddingRight: spacing(9) }}
          />
        </View>

        <QuickStart
          gameInfo={gameInfo}
          headingColor={gameInfo.gameColorPale}
          style={{
            gap: spacing(8),
            paddingRight: spacing(8),
          }}
        />
      </View>
    </View>
  );
}
