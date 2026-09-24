import { Text } from "@/components/common/Text";
import { getGameInfo } from "@/data/game-menu";
import { useGamePath } from "@/hooks/useGamePath";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGame } from "@/i18n/content";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, layoutDims, rgba } from "@/styles/styles";
import { useEffect, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, View } from "react-native";
import { Button } from "../Button/Button";
import { QuickStart } from "../Modals/RulesModal";

const AUTO_CLOSE_DELAY = 15000; // milliseconds

type Props = {
  onClose: () => void;
  showRulesModal: () => void;
  morphProgress: Animated.Value;
};

export function TipsBox({ onClose, showRulesModal, morphProgress }: Props) {
  const onCloseRef = useRef(onClose);
  const pathname = useGamePath();
  const gameInfo = localizeGame(
    getGameInfo(pathname),
    pathname,
    useDisplayLanguage(),
  );
  const { t } = useTranslation("game");
  const { t: tCommon } = useTranslation("common");
  const { spacing, ui } = useResponsiveMetrics();
  const [expandedWidth, setExpandedWidth] = useState<number>();
  const [contentHeight, setContentHeight] = useState<number>();
  const instructionButtonSize = spacing(layoutDims.menuButtonSize);
  const sidePadding = spacing(layoutDims.pagePadding / 2);
  const instructionButtonOffset = expandedWidth
    ? sidePadding +
      ((expandedWidth - sidePadding * 2) * 3) / 10 -
      expandedWidth / 2
    : 0;

  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), AUTO_CLOSE_DELAY);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        const contentWidth = width - sidePadding * 2;
        setExpandedWidth((currentWidth) =>
          currentWidth === contentWidth ? currentWidth : contentWidth,
        );
      }}
      style={{
        width: "100%",
        maxWidth: ui.contentMaxWidth,
        alignSelf: "center",
        alignItems: "center",
        paddingHorizontal: sidePadding,
      }}
    >
      <Animated.View
        style={{
          maxWidth: ui.contentMaxWidth,
          alignSelf: "center",
          width: expandedWidth
            ? morphProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [instructionButtonSize, expandedWidth],
              })
            : instructionButtonSize,
          height: contentHeight
            ? morphProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [instructionButtonSize, contentHeight],
              })
            : instructionButtonSize,
          overflow: "hidden",
          borderRadius: instructionButtonSize / 2,
          backgroundColor: gameInfo.gameColorDark,
          transform: [
            {
              translateX: morphProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [instructionButtonOffset, 0],
              }),
            },
          ],
          boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.black, 0.3)}, ${spacing(2)}px ${spacing(4)}px ${spacing(10)}px ${rgba(
            Colors.black,
            0.3,
          )}`,
        }}
      >
        <View
          onLayout={(event: LayoutChangeEvent) => {
            const { height } = event.nativeEvent.layout;
            setContentHeight((currentHeight) =>
              currentHeight === height ? currentHeight : height,
            );
          }}
          style={[
            flexStyles.colCentered,
            {
              padding: spacing(12),
              paddingBottom: spacing(20),
              gap: spacing(16),
              outline: "none",
              width: expandedWidth ?? "100%",
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
            <View
              style={[
                flexStyles.colCentered,
                flexStyles.flex1,
                { alignItems: "flex-start" },
              ]}
            >
              <Text
                size="md"
                weight={600}
                color={gameInfo.gameColorPale}
                style={{ flex: 1 }}
              >
                {t("tips.quickStart")}
              </Text>
              <Text
                size="xs"
                weight={300}
                color={rgba(gameInfo.gameColorPale, 0.6)}
                style={{ flex: 1 }}
                numberOfLines={1}
              >
                {gameInfo.title}
              </Text>
            </View>

            <Button
              size="sm"
              iconName="instructions"
              text={t("tips.viewRules")}
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
              text={tCommon("close")}
              autoProgress={AUTO_CLOSE_DELAY}
              autoProgressColor={rgba(gameInfo.gameColorPale, 0.2)}
              onPress={onClose}
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
      </Animated.View>
    </View>
  );
}
