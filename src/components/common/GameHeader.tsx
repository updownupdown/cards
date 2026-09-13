import { flexStyles } from "@/styles/flexStyles";
import { Colors, LayerZIndexes, layoutDims, rgba } from "@/styles/styles";
import { memo } from "react";
import { Animated, View } from "react-native";
import { Button } from "../Button/Button";
import { ResetButton } from "./ResetButton";

type Props = {
  isNodesMode: boolean;
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
  onHome: () => void;
  onInstantWin: () => void;
  onRules: () => void;
  onUndo: () => void;
  onReset: () => void;
  onMenu: () => void;
};

/**
 * The in-game menu bar. Memoized with stable callbacks from GameWrapper, so it
 * doesn't re-render on every move.
 */
export const GameHeader = memo(function GameHeader({
  isNodesMode,
  titleColor,
  backgroundColor,
  scale,
  contentMaxWidth,
  insetTop,
  hidden,
  opacity,
  instructionsHighlight,
  ended,
  canUndo,
  undoDisabled,
  onHome,
  onInstantWin,
  onRules,
  onUndo,
  onReset,
  onMenu,
}: Props) {
  const spacing = (value: number) => value * scale;

  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "box-none"}
      style={{
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
            width: "100%",
            height: spacing(layoutDims.menuBarHeight),
            paddingHorizontal: spacing(layoutDims.pagePadding / 2),
            borderRadius: spacing(layoutDims.menuBarHeight / 2),
            backgroundColor: rgba(backgroundColor, 0.8),
            boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.black, 0.2)}, ${spacing(2)}px ${spacing(4)}px ${spacing(10)}px ${rgba(
              Colors.black,
              0.2,
            )}`,
          },
        ]}
      >
        <Button
          headerButton
          accessibilityLabel={isNodesMode ? "Nodes" : "Home"}
          onPress={onHome}
          iconName={isNodesMode ? "nodes" : "home"}
          iconColor={titleColor}
          style={{ flex: 1, paddingHorizontal: 0 }}
        />

        {/* Local only instant win test button */}
        {__DEV__ && (
          <Button
            headerButton
            accessibilityLabel="Instant win"
            onPress={onInstantWin}
            iconName="trophy"
            iconColor={titleColor}
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
                backgroundColor: titleColor,
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
            iconColor={titleColor}
          />
        </View>

        <Button
          headerButton
          onPress={onUndo}
          iconName="undo"
          iconColor={!ended && canUndo ? titleColor : rgba(Colors.white, 0.3)}
          disabled={undoDisabled}
          style={{ flex: 1, paddingHorizontal: 0 }}
        />

        <ResetButton
          reset={onReset}
          iconColor={titleColor}
          pressedIconColor={rgba(titleColor, 0.7)}
        />

        <Button
          headerButton
          onPress={onMenu}
          iconName="more-vertical"
          iconColor={titleColor}
          style={{ flex: 1, paddingHorizontal: 0 }}
        />
      </View>
    </Animated.View>
  );
});
