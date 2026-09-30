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
  flipDirection?: boolean;
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
  flipDirection = false,
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

    if (barWidth <= 0 || !iconName) {
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
  // A started fill is never narrower than it is tall, so it always keeps its
  // round ends rather than squashing into a sliver.
  const fillWidth = (percentage: number, value: number): DimensionValue => {
    if (value <= 0 && !iconName) return 0;
    if (snappedBarWidth <= 0) return `${percentage}%` as `${number}%`;
    return roundToPixel(Math.max(height, (percentage / 100) * snappedBarWidth));
  };
  const progressWidth = fillWidth(progressPercentage, normalizedProgress);
  const previewProgressWidth = fillWidth(
    previewProgressPercentage,
    normalizedPreviewProgress,
  );
  const radius = roundToPixel(height / 2);
  // A hairline edge and a faint top light, instead of glows.
  const hairline = Math.max(1, roundToPixel(height * 0.04));

  const showText =
    tallyText ||
    (autoTallyText ? `${progressValue} / ${totalValue}` : undefined);

  const labelFontSize = clamp(
    height * 0.36 * textScale,
    8 * textScale,
    13 * textScale,
  );
  const tallyFontSize = clamp(
    height * 0.45 * textScale,
    11 * textScale,
    26 * textScale,
  );

  const fillStyle = (width: DimensionValue): ViewStyle => ({
    ...TRANSITION_STYLE,
    position: "absolute",
    width,
    top: 0,
    bottom: 0,
    left: flipDirection ? undefined : 0,
    right: flipDirection ? 0 : undefined,
    borderRadius: radius,
  });

  return (
    <View
      onLayout={(event) => {
        setBarWidth(roundToPixel(event.nativeEvent.layout.width));
      }}
      style={[
        {
          position: "relative",
          overflow: "hidden",
          height,
          backgroundColor: backgroundColor ?? rgba(Colors.black, 0.35),
          borderRadius: radius,
          width: "100%",
          boxShadow: `inset 0 0 0 ${hairline}px ${rgba(Colors.white, 0.1)}, ${1}px ${2}px ${12}px ${rgba(Colors.black, 0.4)}`,
        },
        style,
      ]}
    >
      {/* Progress, dimmed under a preview of what it will be */}
      <View
        style={[
          fillStyle(progressWidth),
          {
            zIndex: 1,
            backgroundColor: rgba(
              progressColor,
              previewProgressValue === undefined ? 1 : 0.45,
            ),
          },
        ]}
      />
      <View
        style={[
          fillStyle(previewProgressWidth),
          {
            zIndex: 2,
            backgroundColor: progressColor,
            boxShadow: `inset 0 0 ${12}px ${rgba(Colors.white, 0.3)}, ${1}px ${2}px ${12}px ${rgba(Colors.black, 0.4)}`,
          },
        ]}
      />

      {labelText && (
        <Text
          weight={500}
          color={rgba(Colors.white, 0.9)}
          numberOfLines={1}
          style={{
            position: "absolute",
            zIndex: 10,
            left: flipDirection ? undefined : roundToPixel(height * 0.45),
            right: flipDirection ? roundToPixel(height * 0.45) : undefined,
            top: "50%",
            transform: [{ translateY: "-50%" }],
            fontSize: labelFontSize,
            lineHeight: labelFontSize * 1.2,
            letterSpacing: clamp(height * 0.04, 0.5, 1.5),
            ...textStyles.shadowText,
          }}
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
              left: flipDirection ? undefined : iconWrapperInset,
              right: flipDirection ? iconWrapperInset : undefined,
              width: iconWrapperSize,
              height: iconWrapperSize,
              borderRadius: roundToPixel(iconWrapperSize / 2),
              backgroundColor: rgba(Colors.black, 0.5),
            },
          ]}
        >
          <Animated.View
            style={heartbeatColor && { transform: [{ scale: heartbeatScale }] }}
          >
            <Icon
              name={iconName}
              color={heartbeatColor ? Colors.accentRed : Colors.K100}
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
      {showText ? (
        <Text
          weight={600}
          color={Colors.white}
          numberOfLines={1}
          style={{
            position: "absolute",
            zIndex: 10,
            right: flipDirection ? undefined : roundToPixel(height * 0.45),
            left: flipDirection ? roundToPixel(height * 0.45) : undefined,
            top: "50%",
            transform: [{ translateY: "-50%" }],
            fontSize: tallyFontSize,
            lineHeight: tallyFontSize * 1.2,
            fontVariant: ["tabular-nums"],
            ...textStyles.shadowText,
          }}
        >
          {showText}
        </Text>
      ) : null}
    </View>
  );
};
