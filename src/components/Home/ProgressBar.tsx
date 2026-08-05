import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { centeredOffset, roundToPixel, snapCenteredSize } from "@/utils/utils";
import React from "react";
import {
  Animated,
  DimensionValue,
  Platform,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "../common/Text";

const PROGRESS_COLORS = {
  red: Colors.buttonRed,
  orange: Colors.buttonOrange,
  green: Colors.buttonGreen,
  purple: Colors.buttonPurple,
  blue: Colors.buttonBlue,
} as const;

const TRANSITION_STYLE = {
  transitionDuration: "0.4s",
  transitionProperty: "all",
  transitionTimingFunction: "ease",
} as const;

interface Props {
  totalValue: number;
  progressValue: number;
  previewProgressValue?: number;
  iconName?: IconName;
  color: string;
  backgroundColor?: string;
  scaledHeight?: number;
  labelText?: string;
  tallyText?: string | number;
  autoTallyText?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export const ProgressBar = ({
  progressValue,
  previewProgressValue,
  iconName,
  color,
  backgroundColor,
  labelText,
  tallyText,
  totalValue,
  autoTallyText = false,
  scaledHeight,
  style,
}: Props) => {
  const { scale, textScale } = useResponsiveMetrics();
  const [barWidth, setBarWidth] = React.useState(0);
  const heartbeatScale = React.useRef(new Animated.Value(1)).current;
  const heartbeatColor =
    iconName === "heart" &&
    (color === "red" || color === "orange" || color === "green");
  const heartbeatFirstScale =
    color === "green" ? 0.9 : color === "orange" ? 0.85 : 0.8;
  const heartbeatSecondScale =
    color === "green" ? 0.8 : color === "orange" ? 0.78 : 0.7;

  React.useEffect(() => {
    heartbeatScale.stopAnimation();
    heartbeatScale.setValue(1);

    if (!heartbeatColor) return;

    const timing = (toValue: number, duration: number) =>
      Animated.timing(heartbeatScale, {
        toValue,
        duration,
        useNativeDriver: Platform.OS !== "web",
      });
    const animation = Animated.loop(
      Animated.sequence([
        timing(heartbeatFirstScale, 135),
        timing(color === "red" ? 1 : 0.98, 135),
        timing(heartbeatSecondScale, 180),
        timing(1, 450),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [
    color,
    heartbeatColor,
    heartbeatFirstScale,
    heartbeatScale,
    heartbeatSecondScale,
  ]);

  const height = roundToPixel(scaledHeight ?? 26 * scale);
  const iconWrapperSize = iconName ? snapCenteredSize(height, height * 0.8) : 0;
  const iconWrapperInset = iconName
    ? centeredOffset(height, iconWrapperSize)
    : 0;
  const iconSize = iconName
    ? snapCenteredSize(iconWrapperSize, height * 0.5)
    : 0;

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const progressColor =
    PROGRESS_COLORS[color as keyof typeof PROGRESS_COLORS] ?? color;

  const normalizedProgress =
    totalValue > 0 ? clamp(progressValue / totalValue, 0, 1) : 0;
  const normalizedPreviewProgress =
    totalValue > 0
      ? clamp((previewProgressValue ?? progressValue) / totalValue, 0, 1)
      : 0;

  // Account for the icon wrapper width when calculating the width of the progress bar
  const getEffectiveProgressPercentage = (normalizedPercentage: number) => {
    const rawPercentage = normalizedPercentage * 100;

    if (barWidth <= 0) {
      return rawPercentage;
    }

    const minPercentage = clamp((height / barWidth) * 100, 0, 100);

    // Interpolate from icon-wrapper width at 0% to full bar width at 100%.
    return minPercentage + normalizedPercentage * (100 - minPercentage);
  };

  const progressPercentage = getEffectiveProgressPercentage(normalizedProgress);
  const previewProgressPercentage = getEffectiveProgressPercentage(
    normalizedPreviewProgress ?? normalizedProgress,
  );

  const snappedBarWidth = roundToPixel(barWidth);
  const progressWidth: DimensionValue =
    snappedBarWidth > 0
      ? roundToPixel((progressPercentage / 100) * snappedBarWidth)
      : (`${progressPercentage}%` as `${number}%`);
  const previewProgressWidth: DimensionValue =
    snappedBarWidth > 0
      ? roundToPixel((previewProgressPercentage / 100) * snappedBarWidth)
      : (`${previewProgressPercentage}%` as `${number}%`);

  const showText =
    tallyText ||
    (autoTallyText ? `${progressValue} / ${totalValue}` : undefined);

  return (
    <View
      onLayout={(event) => {
        setBarWidth(roundToPixel(event.nativeEvent.layout.width));
      }}
      style={[
        {
          position: "relative",
          height,
          backgroundColor: backgroundColor ?? rgba(Colors.K400, 0.12),
          borderRadius: roundToPixel(height / 2),
          width: "100%",
          boxShadow: `inset 0 0 0 ${roundToPixel(height * 0.03)}px ${rgba(
            Colors.white,
            0.2,
          )}, inset 0 0 ${roundToPixel(height * 0.2)}px ${rgba(
            Colors.K200,
            0.2,
          )}, 0 0 ${roundToPixel(height * 0.2)}px ${rgba(Colors.K950, 0.2)}`,
        },
        style,
      ]}
    >
      {labelText && (
        <Text
          weight={300}
          color={Colors.white}
          style={{
            position: "absolute",
            zIndex: 10,
            left: roundToPixel(height * 0.4),
            top: "50%",
            transform: [{ translateY: "-50%" }],
            fontSize: clamp(
              height * 0.4 * textScale,
              6 * textScale,
              14 * textScale,
            ),
            ...textStyles.shadowText,
          }}
          lineHeight={1}
          textTransform="uppercase"
        >
          {labelText}
        </Text>
      )}

      {iconName && (
        <View
          style={[
            flexStyles.colCentered,
            {
              position: "absolute",
              zIndex: 10,
              top: iconWrapperInset,
              left: iconWrapperInset,
              width: iconWrapperSize,
              height: iconWrapperSize,
              borderRadius: roundToPixel(iconWrapperSize / 2),
              backgroundColor: rgba(Colors.K900, 0.9),
              boxShadow: `inset 0 0 ${roundToPixel(height * 0.2)}px ${rgba(
                Colors.K950,
                0.2,
              )}`,
            },
          ]}
        >
          <Animated.View
            style={heartbeatColor && { transform: [{ scale: heartbeatScale }] }}
          >
            <Icon
              name={iconName}
              color={heartbeatColor ? Colors.buttonRed : Colors.K100}
              style={[
                {
                  width: iconSize,
                  height: iconSize,
                },
              ]}
            />
          </Animated.View>
        </View>
      )}

      {/* Tally */}
      <Text
        weight={600}
        color={Colors.white}
        style={{
          position: "absolute",
          zIndex: 10,
          right: roundToPixel(scale * height * 0.5),
          top: "50%",
          transform: [{ translateY: "-50%" }],
          fontSize: clamp(
            height * 0.5 * textScale,
            12 * textScale,
            30 * textScale,
          ),
          ...textStyles.shadowText,
        }}
      >
        {showText}
      </Text>

      {/* Progress */}
      <View
        style={[
          {
            ...TRANSITION_STYLE,
            position: "absolute",
            zIndex: 1,
            width: progressWidth,
            top: 0,
            bottom: 0,
            left: 0,
            backgroundColor: rgba(
              progressColor,
              previewProgressValue === undefined ? 1 : 0.5,
            ),
            borderRadius: roundToPixel(height / 2),
          },
        ]}
      />

      {/* Progress Preview */}
      <View
        style={[
          {
            ...TRANSITION_STYLE,
            position: "absolute",
            zIndex: 2,
            width: previewProgressWidth,
            top: 0,
            bottom: 0,
            left: 0,
            backgroundColor: progressColor,
            borderRadius: roundToPixel(height / 2),
            boxShadow: `inset 0 0 0 ${roundToPixel(height * 0.03)}px ${rgba(
              Colors.white,
              0.3,
            )}, inset 0 0 ${roundToPixel(height * 0.4)}px ${rgba(
              Colors.white,
              0.4,
            )}, 0 0 ${roundToPixel(height * 0.2)}px ${rgba(progressColor, 0.8)}`,
          },
        ]}
      />
    </View>
  );
};
