import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { flexStyles } from "@/styles/flexStyles";
import { FontWeight, rgba } from "@/styles/styles";
import { Pressable, TextStyle, View, ViewStyle } from "react-native";
import { CardMapBGMapping } from "./AnimatedCard";
import { cardDims } from "./card-utils";
import { CardPosition, MapZone } from "./CardMap";
import { CardOverlay, getCardShadow, getUnderlayStyle } from "./CardStyles";
import { Icon } from "@/icons";

export type DeckFanDirection =
  "none" | "up" | "down" | "left" | "right" | "diagonal-depth";

export type DeckInfoPosition = "above" | "below" | "left" | "right";

type Props = {
  zones: MapZone[];
  getZoneBasePos: (zone: MapZone) => CardPosition;
  cardWidth: number;
  cardHeight: number;
  zoneMapper?: (zone: MapZone) => CardMapBGMapping | undefined;
};

// Generous advance of an uppercase letter and of a digit, in font sizes.
const LETTER_WIDTH = 0.78;
const DIGIT_WIDTH = 0.64;

export const infoSize = {
  aboveBelow: 0.32,
  aboveBelowAdjust: 0.8,
  leftRight: 0.54,
};

export const CardMapBackgrounds = ({
  zones,
  getZoneBasePos,
  cardWidth,
  cardHeight,
  zoneMapper,
}: Props) => {
  const { colorPale, colorDark } = useGameColors();

  return (
    <>
      {zones.map((zone) => {
        if (!zone.placeholder) return null;

        const zoneMapperResult = zoneMapper ? zoneMapper(zone) : undefined;

        const onPress = zoneMapperResult?.onPress ?? (() => {});
        const isDisabled = zoneMapperResult?.isDisabled ?? false;
        const isSelected = zoneMapperResult?.isSelected ?? true;
        const selectColor = zoneMapperResult?.selectColor;
        const forceSelectColor = zoneMapperResult?.forceSelectColor ?? false;
        const forceOverlayColor = zoneMapperResult?.forceOverlayColor ?? false;
        const zIndex =
          (zone.baseZIndex ?? 1) + (zoneMapperResult?.zIndexOffset ?? 0);

        const pos = getZoneBasePos(zone);
        const count: number = zone.cards?.length ?? 0;
        const hasText = Boolean(zone.placeholder.text);
        const showCount = zone.placeholder.showCount !== false;

        let placeholderWidth = pos.width;
        let placeholderHeight = pos.height;
        let placeholderOffsetX = 0;
        let placeholderOffsetY = 0;

        const text = zone.placeholder.text ?? "";
        const countFontSize = cardWidth * 0.2;
        const countWidth = showCount
          ? String(count).length * countFontSize * DIGIT_WIDTH
          : 0;
        // Room along the label for the text; the count keeps its size and the
        // text shrinks to fit what's left.
        let textRoom = Infinity;

        let infoStyles: ViewStyle = {
          userSelect: "none",
          position: "absolute",
          zIndex: 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        };

        let textContainerStyle: ViewStyle = {};
        let textStyle: TextStyle = {
          userSelect: "none",
          fontSize: cardWidth * 0.15,
          // color: rgba(Colors.white, 0.8),
          fontFamily: FontWeight[400],
          textTransform: "uppercase",
        };
        let countStyle: TextStyle = {
          userSelect: "none",
          fontSize: cardWidth * 0.2,
          // The count keeps its size; only the label text gives way.
          flexShrink: 0,
          // color: rgba(Colors.white, 0.8),
          fontFamily: FontWeight[500],
          textTransform: "uppercase",
        };

        const infoPosition = zone.placeholder.infoPos;

        if (infoPosition) {
          const rotatedTextWidth = cardHeight * 0.6;
          const rotatedTextHeight = cardWidth * infoSize.leftRight;

          switch (infoPosition) {
            case "above":
            case "below": {
              const sidePadding = cardWidth * 0.08;
              const gap = hasText && showCount ? cardWidth * 0.08 : 0;
              placeholderHeight += cardHeight * infoSize.aboveBelow;
              infoStyles.height =
                cardHeight * infoSize.aboveBelow * infoSize.aboveBelowAdjust;
              infoStyles.width = "100%";
              infoStyles.paddingHorizontal = sidePadding;
              infoStyles.gap = gap;
              infoStyles.flexDirection = "row";
              textRoom = pos.width - sidePadding * 2 - gap - countWidth;
              countStyle.lineHeight = countFontSize * 1.2;
              break;
            }
            case "left":
            case "right": {
              const sidePadding = cardHeight * 0.08;
              const sideGap = cardHeight * 0.08;
              const countBlockHeight = showCount ? cardWidth * 0.28 : 0;
              const totalGap = hasText && showCount ? sideGap : 0;
              const availableTextHeight = Math.max(
                0,
                pos.height - sidePadding * 2 - totalGap - countBlockHeight,
              );

              placeholderWidth += cardWidth * infoSize.leftRight;
              infoStyles.width = cardWidth * infoSize.leftRight;
              infoStyles.height = "100%";
              infoStyles.paddingVertical = sidePadding;
              infoStyles.gap = hasText && showCount ? 0 : sideGap;
              infoStyles.justifyContent =
                hasText && showCount ? "space-around" : "center";
              infoStyles.flexDirection = "column";
              textStyle.width = rotatedTextWidth;
              textStyle.flexShrink = 0;
              textContainerStyle.width = rotatedTextHeight;
              textContainerStyle.height = Math.min(
                rotatedTextWidth,
                availableTextHeight,
              );
              textContainerStyle.justifyContent = "center";
              textContainerStyle.alignItems = "center";
              textContainerStyle.overflow = "hidden";
              textStyle.textAlign = "center";
              textStyle.transform = [{ rotate: `-90deg` }];
              countStyle.lineHeight = countBlockHeight;
              textRoom = Math.min(rotatedTextWidth, availableTextHeight);
              break;
            }
          }

          if (hasText) {
            const textFontSize = Math.min(
              cardWidth * 0.15,
              Math.max(0, textRoom) / (text.length * LETTER_WIDTH),
            );
            textStyle.fontSize = textFontSize;
            // Set explicitly: the Text component's default line height is
            // sized for regular UI text and overflows these small labels.
            textStyle.lineHeight = textFontSize * 1.2;
          }
          switch (infoPosition) {
            case "above":
              infoStyles.top = 0;
              placeholderOffsetY = cardHeight * infoSize.aboveBelow;
              break;
            case "below":
              infoStyles.bottom = 0;
              break;
            case "left":
              infoStyles.left = 0;
              placeholderOffsetX = cardWidth * infoSize.leftRight;
              break;
            case "right":
              infoStyles.right = 0;
              break;
          }
        }

        return (
          <Pressable
            key={`placeholder-${zone.id}`}
            style={[
              flexStyles.rowCentered,
              {
                position: "absolute",
                left: pos.x - placeholderOffsetX,
                top: pos.y - placeholderOffsetY,
                width: placeholderWidth,
                height: placeholderHeight,
                borderRadius: cardWidth * cardDims.ratioRadius,
                justifyContent: "center",
                alignItems: "center",
                zIndex,
                boxShadow: zone.placeholder.hideShadow
                  ? undefined
                  : getCardShadow({
                      cardWidth,
                      selectColor,
                      forceSelectColor,
                      isPlaceholder: true,
                    }),
                outline: "none",
              },
            ]}
            onPress={onPress}
            disabled={isDisabled}
          >
            <CardOverlay
              cardWidth={cardWidth}
              isSelected={isSelected}
              forceOverlayColor={forceOverlayColor}
              selectColor={selectColor}
            />

            {infoPosition && (
              <View style={infoStyles}>
                {hasText && (
                  <View style={textContainerStyle}>
                    <Text
                      style={textStyle}
                      color={colorPale}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                    >
                      {text}
                    </Text>
                  </View>
                )}

                {showCount && (
                  <Text style={countStyle} color={colorPale} numberOfLines={1}>
                    {count}
                  </Text>
                )}
              </View>
            )}

            {/* Card Underlay */}
            <View
              style={[
                getUnderlayStyle(
                  cardWidth,
                  colorDark,
                  colorPale,
                  zone.placeholder.backgroundColor,
                  zone.placeholder.hideBackground,
                  zone.placeholder.hideShadow,
                ),
                flexStyles.colCentered,
              ]}
            >
              {zone.placeholder.iconName && (
                <Icon
                  name={zone.placeholder.iconName}
                  size={cardWidth * (zone.placeholder.iconSize ?? 0.7)}
                  color={rgba(
                    forceOverlayColor ? (selectColor ?? colorPale) : colorPale,
                    forceSelectColor
                      ? 0.7
                      : (zone.placeholder.iconOpacity ?? 0.3),
                  )}
                />
              )}
            </View>
          </Pressable>
        );
      })}
    </>
  );
};
