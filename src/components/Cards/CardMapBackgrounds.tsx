import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { Pressable, Text, TextStyle, View, ViewStyle } from "react-native";
import { cardDims } from "./card-utils";
import { CardPosition, MapZone } from "./CardMap";
import { CardColor, CardOverlay, getCardShadow } from "./CardStyles";

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
  game: any;
  zoneMapper?: (zone: MapZone) => CardMapBGMapping | undefined;
};

export type CardMapBGMapping = {
  onPress?: () => void;
  isDisabled?: boolean;
  isSelected?: boolean;
  selectColor?: CardColor | string;
  forceSelectColor?: boolean;
  forceOverlayColor?: boolean;
};

export const infoSize = {
  aboveBelow: 0.32,
  leftRight: 0.54,
};

export const CardMapBackgrounds = ({
  zones,
  getZoneBasePos,
  cardWidth,
  cardHeight,
  game,
  zoneMapper,
}: Props) => {
  return (
    <>
      {zones.map((zone) => {
        if (!zone.placeholder) return null;

        const zoneMapperResult = zoneMapper ? zoneMapper(zone) : undefined;

        const onPress = zoneMapperResult?.onPress ?? (() => {});
        const isDisabled = zoneMapperResult?.isDisabled ?? true;
        const isSelected = zoneMapperResult?.isSelected ?? true;
        const selectColor = zoneMapperResult?.selectColor;
        const forceSelectColor = zoneMapperResult?.forceSelectColor ?? false;
        const forceOverlayColor = zoneMapperResult?.forceOverlayColor ?? false;

        const pos = getZoneBasePos(zone);
        const count: number = zone.id ? game[zone.id]?.length : 0;

        let placeholderWidth = pos.width;
        let placeholderHeight = pos.height;
        let placeholderOffsetX = 0;
        let placeholderOffsetY = 0;

        let infoStyles: ViewStyle = {
          userSelect: "none",
          position: "absolute",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        };

        let textContainerStyle: ViewStyle = {};
        let textStyle: TextStyle = {
          userSelect: "none",
          fontSize: cardWidth * 0.17,
          color: Colors.K300,
          fontFamily: FontWeight[300],
          textTransform: "uppercase",
        };
        let countStyle: TextStyle = {
          userSelect: "none",
          fontSize: cardWidth * 0.2,
          color: Colors.K300,
          fontFamily: FontWeight[500],
          textTransform: "uppercase",
        };

        const infoPosition = zone.placeholder.infoPos;

        if (infoPosition) {
          const rotatedTextWidth = cardHeight * 0.6;
          const rotatedTextHeight = cardWidth * infoSize.leftRight;

          const rotatedTextOffset = (rotatedTextWidth - rotatedTextHeight) / 2;

          switch (infoPosition) {
            case "above":
            case "below":
              placeholderHeight += cardHeight * infoSize.aboveBelow;
              infoStyles.height = cardHeight * infoSize.aboveBelow * 0.8;
              infoStyles.width = "100%";
              infoStyles.gap = cardWidth * 0.1;
              infoStyles.flexDirection = "row";
              break;
            case "left":
            case "right":
              placeholderWidth += cardWidth * infoSize.leftRight;
              infoStyles.width = cardWidth * infoSize.leftRight;
              infoStyles.height = "100%";
              infoStyles.gap = cardHeight * 0.1;
              infoStyles.flexDirection = "column";
              textStyle.width = rotatedTextWidth;
              textStyle.height = rotatedTextHeight;
              textStyle.lineHeight = rotatedTextHeight;
              textContainerStyle.width = rotatedTextHeight;
              textContainerStyle.height = rotatedTextWidth;
              textStyle.textAlign = "center";
              textStyle.transform = [
                { rotate: `-90deg` },
                { translateX: -rotatedTextOffset },
                { translateY: -rotatedTextOffset },
              ];
              break;
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
                backgroundColor: Colors.K875,
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1,
                boxShadow: getCardShadow({
                  cardWidth,
                  selectColor,
                  forceSelectColor,
                  isPlaceholder: true,
                }),
              },
            ]}
            onPress={onPress}
            disabled={isDisabled}
          >
            <CardOverlay
              isSelected={isSelected}
              forceOverlayColor={forceOverlayColor}
              selectColor={selectColor}
            />

            {infoPosition && (
              <View style={infoStyles}>
                {zone.placeholder.text && (
                  <View style={textContainerStyle}>
                    <Text style={textStyle}>{zone.placeholder.text}</Text>
                  </View>
                )}

                {zone.placeholder.iconName && (
                  <Icon
                    name={zone.placeholder.iconName}
                    size={20}
                    color={Colors.K300}
                  />
                )}

                {zone.placeholder.showCount !== false && (
                  <Text style={countStyle}>{count}</Text>
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </>
  );
};
