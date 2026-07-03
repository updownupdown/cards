import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { Icon, IconName } from "@/icons";
import { Colors, rgba } from "@/styles/styles";
import { centeredOffset, roundToPixel, snapCenteredSize } from "@/utils/utils";
import React from "react";
import { DimensionValue, View } from "react-native";
import { Text } from "../common/Text";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";

interface Props {
  totalValue: number;
  progressValue: number;
  previewProgressValue?: number;
  iconName?: IconName;
  color: string;
  scaledHeight?: number;
  labelText?: string;
  tallyText?: string;
  autoTallyText?: boolean;
}

export const ProgressBar = ({
  progressValue,
  previewProgressValue,
  iconName,
  color,
  labelText,
  tallyText,
  totalValue,
  autoTallyText = false,
  scaledHeight,
}: Props) => {
  const scale = useResponsiveScale();
  const [barWidth, setBarWidth] = React.useState(0);

  const height = roundToPixel(scaledHeight ?? 26 * scale);
  const iconWrapperSize = iconName ? snapCenteredSize(height, height * 0.8) : 0;
  const iconWrapperInset = iconName
    ? centeredOffset(height, iconWrapperSize)
    : 0;
  const iconSize = iconName
    ? snapCenteredSize(iconWrapperSize, height * 0.5)
    : 0;
  const iconWrapperWidth = iconName ? iconWrapperInset + iconWrapperSize : 0;

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  let progressColor = color;

  switch (color) {
    case "red":
      progressColor = Colors.buttonRed;
      break;
    case "orange":
      progressColor = Colors.buttonOrange;
      break;
    case "green":
      progressColor = Colors.buttonGreen;
      break;
    case "purple":
      progressColor = Colors.buttonPurple;
      break;
    case "blue":
      progressColor = Colors.buttonBlue;
      break;
  }

  const normalizedProgress =
    totalValue > 0 ? clamp(progressValue / totalValue, 0, 1) : 0;
  const normalizedPreviewProgress =
    totalValue > 0
      ? clamp((previewProgressValue ?? progressValue) / totalValue, 0, 1)
      : 0;

  // Account for the icon wrapper width when calculating the width of the progress bar
  const getEffectiveProgressPercentage = (normalizedPercentage: number) => {
    const rawPercentage = normalizedPercentage * 100;

    if (!iconName || barWidth <= 0) {
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
          backgroundColor: rgba(Colors.K400, 0.12),
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
      ]}
    >
      {labelText && (
        <Text
          size="xs"
          weight={300}
          color={Colors.white}
          style={{
            position: "absolute",
            zIndex: 10,
            left: roundToPixel(height * 0.5),
            top: "50%",
            transform: [{ translateY: "-50%" }],
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
          <Icon
            name={iconName}
            size={24}
            color={Colors.K100}
            style={[
              {
                width: iconSize,
                height: iconSize,
              },
            ]}
          />
        </View>
      )}

      {/* Tally */}
      <Text
        size="sm"
        weight={500}
        color={Colors.white}
        style={{
          position: "absolute",
          zIndex: 10,
          right: roundToPixel(16 * scale),
          top: "50%",
          transform: [{ translateY: "-50%" }],
          ...textStyles.shadowText,
        }}
      >
        {showText}
      </Text>

      {/* Progress */}
      <View
        style={[
          {
            transitionDuration: "0.4s",
            transitionProperty: "all",
            transitionTimingFunction: "ease",
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
            transitionDuration: "0.4s",
            transitionProperty: "all",
            transitionTimingFunction: "ease",
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
