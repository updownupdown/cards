import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { flexStyles } from "@/styles/flexStyles";
import { FontWeight, rgba } from "@/styles/styles";
import { memo, useCallback, useRef } from "react";
import { Pressable, TextStyle, View, ViewStyle } from "react-native";
import { CardMapBGMapping } from "./AnimatedCard";
import { cardDims } from "./card-utils";
import { CardPosition, MapZone } from "./CardMap";
import { CardOverlay, getCardShadow, getUnderlayStyle } from "./CardStyles";
import { Icon, type IconName } from "@/icons";

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

/**
 * One placeholder. Everything arrives as a primitive so the memo can compare
 * by value: a game rebuilds its `zones` array (and the placeholder objects
 * inside it) on every state change, but what a placeholder draws depends only
 * on its position, its configuration and its card count, none of which change
 * when a card merely moves somewhere else on the board.
 */
type ZoneBackgroundProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  cardWidth: number;
  cardHeight: number;
  count: number;
  zIndex: number;
  onPress: () => void;
  isDisabled: boolean;
  isSelected: boolean;
  selectColor?: string;
  forceSelectColor: boolean;
  forceOverlayColor: boolean;
  colorPale: string;
  colorDark: string;
  text: string;
  showCount: boolean;
  infoPos?: DeckInfoPosition;
  hideBackground?: boolean;
  hideShadow?: boolean;
  backgroundColor?: string;
  iconName?: IconName;
  iconSize?: number;
  iconOpacity?: number;
};

const ZoneBackgroundComponent = ({
  x,
  y,
  width,
  height,
  cardWidth,
  cardHeight,
  count,
  zIndex,
  onPress,
  isDisabled,
  isSelected,
  selectColor,
  forceSelectColor,
  forceOverlayColor,
  colorPale,
  colorDark,
  text,
  showCount,
  infoPos,
  hideBackground,
  hideShadow,
  backgroundColor,
  iconName,
  iconSize,
  iconOpacity,
}: ZoneBackgroundProps) => {
  const hasText = Boolean(text);

  let placeholderWidth = width;
  let placeholderHeight = height;
  let placeholderOffsetX = 0;
  let placeholderOffsetY = 0;

  const countFontSize = cardWidth * 0.2;
  const countWidth = showCount
    ? String(count).length * countFontSize * DIGIT_WIDTH
    : 0;
  // Room along the label for the text; the count keeps its size and the
  // text shrinks to fit what's left.
  let textRoom = Infinity;

  const infoStyles: ViewStyle = {
    userSelect: "none",
    position: "absolute",
    zIndex: 2,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const textContainerStyle: ViewStyle = {};
  const textStyle: TextStyle = {
    userSelect: "none",
    fontSize: cardWidth * 0.15,
    fontFamily: FontWeight[400],
    textTransform: "uppercase",
  };
  const countStyle: TextStyle = {
    userSelect: "none",
    fontSize: cardWidth * 0.2,
    // The count keeps its size; only the label text gives way.
    flexShrink: 0,
    fontFamily: FontWeight[500],
    textTransform: "uppercase",
  };

  if (infoPos) {
    switch (infoPos) {
      case "above":
      case "below": {
        const sidePadding = cardWidth * 0.056;
        const gap = hasText && showCount ? cardWidth * 0.056 : 0;
        placeholderHeight += cardHeight * infoSize.aboveBelow;
        infoStyles.height =
          cardHeight * infoSize.aboveBelow * infoSize.aboveBelowAdjust;
        infoStyles.width = "100%";
        infoStyles.paddingHorizontal = sidePadding;
        infoStyles.gap = gap;
        infoStyles.flexDirection = "row";
        textRoom = width - sidePadding * 2 - gap - countWidth;
        countStyle.lineHeight = countFontSize * 1.2;
        break;
      }
      case "left":
      case "right": {
        const sidePadding = cardHeight * 0.056;
        const sideGap = cardHeight * 0.056;
        const countBlockHeight = showCount ? cardWidth * 0.28 : 0;
        const totalGap = hasText && showCount ? sideGap : 0;
        const availableTextHeight = Math.max(
          0,
          height - sidePadding * 2 - totalGap - countBlockHeight,
        );

        placeholderWidth += cardWidth * infoSize.leftRight;
        infoStyles.width = cardWidth * infoSize.leftRight;
        infoStyles.height = "100%";
        infoStyles.paddingVertical = sidePadding;
        infoStyles.gap = hasText && showCount ? 0 : sideGap;
        infoStyles.justifyContent =
          hasText && showCount ? "space-around" : "center";
        infoStyles.flexDirection = "column";
        textStyle.width = availableTextHeight;
        textStyle.flexShrink = 0;
        textContainerStyle.height = availableTextHeight;
        textContainerStyle.justifyContent = "center";
        textContainerStyle.alignItems = "center";
        textContainerStyle.overflow = "hidden";
        textStyle.textAlign = "center";
        textStyle.transform = [{ rotate: `-90deg` }];
        countStyle.lineHeight = countBlockHeight;
        textRoom = availableTextHeight;
        break;
      }
    }

    if (hasText) {
      const textFontSize = Math.min(
        cardWidth * (showCount ? 0.15 : 0.2),
        Math.max(0, textRoom) / (text.length * LETTER_WIDTH),
      );
      textStyle.fontSize = textFontSize;
      // Set explicitly: the Text component's default line height is sized for
      // regular UI text and overflows these small labels.
      textStyle.lineHeight = textFontSize * 1.2;
    }
    switch (infoPos) {
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
      style={[
        flexStyles.rowCentered,
        {
          position: "absolute",
          left: x - placeholderOffsetX,
          top: y - placeholderOffsetY,
          width: placeholderWidth,
          height: placeholderHeight,
          borderRadius: cardWidth * cardDims.ratioRadius,
          justifyContent: "center",
          alignItems: "center",
          zIndex,
          // A zone with no background draws no edge either: the hairline ring
          // would outline an empty box (around a game's buttons, say). A
          // highlight a game forces on still shows.
          boxShadow:
            hideShadow || (hideBackground && !forceSelectColor)
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
        isPlaceholder
      />

      {infoPos && (
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
            backgroundColor,
            hideBackground,
            hideShadow,
          ),
          flexStyles.colCentered,
        ]}
      >
        {iconName && (
          <Icon
            name={iconName}
            size={cardWidth * (iconSize ?? 0.56)}
            color={rgba(
              forceOverlayColor ? (selectColor ?? colorPale) : colorPale,
              forceSelectColor ? 0.7 : (iconOpacity ?? 0.3),
            )}
          />
        )}
      </View>
    </Pressable>
  );
};

const ZoneBackground = memo(ZoneBackgroundComponent);

export const CardMapBackgrounds = ({
  zones,
  getZoneBasePos,
  cardWidth,
  cardHeight,
  zoneMapper,
}: Props) => {
  const { colorPale, colorDark } = useGameColors();

  // Games build a new zoneMapper (and a new onPress inside it) on every
  // render, which would defeat ZoneBackground's memo. Each zone gets a stable
  // wrapper that calls the latest handler, mirroring useCardMap's card path.
  const pressHandlersRef = useRef(new Map<string, () => void>());
  const stablePressHandlersRef = useRef(new Map<string, () => void>());

  const getStablePressHandler = useCallback((zoneId: string) => {
    let handler = stablePressHandlersRef.current.get(zoneId);
    if (!handler) {
      handler = () => pressHandlersRef.current.get(zoneId)?.();
      stablePressHandlersRef.current.set(zoneId, handler);
    }
    return handler;
  }, []);

  return (
    <>
      {zones.map((zone) => {
        if (!zone.placeholder) return null;

        const zoneMapperResult = zoneMapper ? zoneMapper(zone) : undefined;

        if (zoneMapperResult?.onPress) {
          pressHandlersRef.current.set(zone.id, zoneMapperResult.onPress);
        } else {
          pressHandlersRef.current.delete(zone.id);
        }

        const selectColor = zoneMapperResult?.selectColor;
        // Games that set a colour but no isSelected expect the overlay to
        // show, so the default follows the colour. Without this, every
        // placeholder on the board mounted a fully transparent overlay, and
        // its mixBlendMode child costs a saveLayer per draw on Android.
        const hasVisibleSelectColor =
          selectColor !== undefined && selectColor !== "none";

        const pos = getZoneBasePos(zone);
        const placeholder = zone.placeholder;

        return (
          <ZoneBackground
            key={`placeholder-${zone.id}`}
            x={pos.x}
            y={pos.y}
            width={pos.width}
            height={pos.height}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            count={zone.cards?.length ?? 0}
            zIndex={
              (zone.baseZIndex ?? 1) + (zoneMapperResult?.zIndexOffset ?? 0)
            }
            // Every placeholder stays pressable even with no handler, so a tap
            // on an empty zone is absorbed rather than falling through to
            // whatever sits beneath it on the board.
            onPress={getStablePressHandler(zone.id)}
            isDisabled={zoneMapperResult?.isDisabled ?? false}
            isSelected={zoneMapperResult?.isSelected ?? hasVisibleSelectColor}
            selectColor={selectColor}
            forceSelectColor={zoneMapperResult?.forceSelectColor ?? false}
            forceOverlayColor={zoneMapperResult?.forceOverlayColor ?? false}
            colorPale={colorPale}
            colorDark={colorDark}
            text={placeholder.text ?? ""}
            showCount={placeholder.showCount !== false}
            infoPos={placeholder.infoPos}
            hideBackground={placeholder.hideBackground}
            hideShadow={placeholder.hideShadow}
            backgroundColor={placeholder.backgroundColor}
            iconName={placeholder.iconName}
            iconSize={placeholder.iconSize}
            iconOpacity={placeholder.iconOpacity}
          />
        );
      })}
    </>
  );
};
