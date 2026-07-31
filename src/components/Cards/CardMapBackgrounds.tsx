import { Text } from "@/components/common/Text";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { Pressable, TextStyle, View, ViewStyle } from "react-native";
import { CardMapBGMapping } from "./AnimatedCard";
import { cardDims } from "./card-utils";
import { CardPosition, MapZone } from "./CardMap";
import { CardOverlay, getCardShadow, getUnderlayStyle } from "./CardStyles";

export type DeckFanDirection =
  | "none"
  | "up"
  | "down"
  | "left"
  | "right"
  | "diagonal-depth";

export type DeckInfoPosition = "above" | "below" | "left" | "right";

type Props = {
  zones: MapZone[];
  getZoneBasePos: (zone: MapZone) => CardPosition;
  cardWidth: number;
  cardHeight: number;
  zoneMapper?: (zone: MapZone) => CardMapBGMapping | undefined;
};

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
  const { cardText, cardBg } = useGameZoneBackground();

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
          color: rgba(Colors.white, 0.8),
          fontFamily: FontWeight[400],
          textTransform: "uppercase",
        };
        let countStyle: TextStyle = {
          userSelect: "none",
          fontSize: cardWidth * 0.2,
          color: rgba(Colors.white, 0.8),
          fontFamily: FontWeight[500],
          textTransform: "uppercase",
        };

        const infoPosition = zone.placeholder.infoPos;

        if (infoPosition) {
          const rotatedTextWidth = cardHeight * 0.6;
          const rotatedTextHeight = cardWidth * infoSize.leftRight;

          switch (infoPosition) {
            case "above":
            case "below":
              placeholderHeight += cardHeight * infoSize.aboveBelow;
              infoStyles.height =
                cardHeight * infoSize.aboveBelow * infoSize.aboveBelowAdjust;
              infoStyles.width = "100%";
              infoStyles.gap = cardWidth * 0.1;
              infoStyles.flexDirection = "row";
              break;
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
              break;
            }
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
                    <Text style={textStyle}>{zone.placeholder.text}</Text>
                  </View>
                )}

                {showCount && <Text style={countStyle}>{count}</Text>}
              </View>
            )}

            {/* Card Underlay */}
            <View
              style={getUnderlayStyle(
                cardWidth,
                cardBg,
                cardText,
                zone.placeholder.backgroundColor,
                zone.placeholder.hideBackground,
                zone.placeholder.hideShadow,
              )}
            />
          </Pressable>
        );
      })}
    </>
  );
};
