import { Image } from "expo-image";
import React, { memo, useContext, useEffect, useState } from "react";
import { Platform, View, ViewStyle } from "react-native";
import { getCardBackImage, getCardImageSource } from "./CardAssets";
import { cardDims, PlayingCard } from "./card-utils";
import {
  CardColor,
  CardOverlay,
  CardSizes,
  getCardShadowStyle,
} from "./CardStyles";
import { transitionStyles } from "@/styles/styles";

/**
 * Lets a board know when its faces are drawn: `start` is called by a face
 * still loading, and the function it returns once the face is in.
 */
export const CardFaceLoads = React.createContext<{
  start: () => () => void;
} | null>(null);

export type CardProps = {
  card?: PlayingCard;
  style?: ViewStyle;
  isSelectable?: boolean;
  isSelected?: boolean;
  isVisible?: boolean;
  selectColor?: CardColor | string;
  forceSelectColor?: boolean;
  forceOverlayColor?: boolean;
  cardWidth: number;
  cardSize?: CardSizes;
  isPlaceholder?: boolean;
  isHiddenUnderDeck?: boolean;
  cardBackPath?: string;
};

const CardComponent = ({
  style,
  card,
  isSelectable,
  selectColor = "none",
  isVisible = true,
  isSelected,
  cardSize,
  forceSelectColor,
  forceOverlayColor,
  cardWidth,
  isPlaceholder,
  isHiddenUnderDeck,
  cardBackPath,
}: CardProps) => {
  let cardName = "BackH";

  if (card && card.faceUp) {
    cardName = card.rank + card.suit.charAt(0).toUpperCase();
  }

  const isFaceDown = !card || !card.faceUp;
  const imageSource = isFaceDown
    ? undefined
    : getCardImageSource(cardSize, cardName);

  // On native each face is decoded by its own view, which can take a moment
  // (longest on slow phones and as a board opens, with many at once). Until
  // it's in, the card shows its back rather than a blank white face, as if
  // it hadn't quite turned over yet.
  const [loadedSource, setLoadedSource] = useState<unknown>(null);
  const faceLoading =
    Platform.OS !== "web" && !isFaceDown && loadedSource !== imageSource;
  const faceLoads = useContext(CardFaceLoads);
  useEffect(() => {
    if (!faceLoading || !faceLoads) return;
    return faceLoads.start();
  }, [faceLoading, faceLoads]);

  if (!isFaceDown && !imageSource) return null;

  const borderRadius = Math.max(cardWidth, 1) * cardDims.ratioRadius;

  return (
    <View
      collapsable={false}
      style={[
        style,
        {
          // overflow:hidden (needed below to clip the card image's corners)
          // would also clip this view's own box-shadow on native, so the
          // shadow lives on this outer, non-clipping view instead.
          width: "100%",
          height: "auto",
          aspectRatio: cardDims.aspectRatio,
          // DO NOT APPLY OPACITY TRANSITION HERE!
          // It will create glitches with drag-and-drop actions
          ...transitionStyles.noOpacity02sec,
          position: "relative",
          zIndex: 3,
          outlineWidth: 0,
          ...getCardShadowStyle({
            cardWidth,
            selectColor,
            isSelected,
            isSelectable,
            forceSelectColor,
            isPlaceholder,
            isHiddenUnderDeck,
          }),
          borderRadius,
          backfaceVisibility: "hidden",
        },
        !isVisible && { opacity: 0 },
      ]}
    >
      <View
        style={{
          overflow: "hidden",
          width: "100%",
          height: "100%",
          borderRadius,
        }}
      >
        <CardOverlay
          cardWidth={cardWidth}
          isSelected={isSelected}
          forceOverlayColor={forceOverlayColor}
          selectColor={selectColor}
        />

        {isFaceDown ? (
          <Image
            source={getCardBackImage(cardBackPath)}
            cachePolicy="memory"
            contentFit="fill"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <>
            {faceLoading && (
              <Image
                source={getCardBackImage(cardBackPath)}
                cachePolicy="memory"
                contentFit="fill"
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                }}
              />
            )}
            <Image
              source={imageSource}
              cachePolicy="memory"
              style={{ width: "100%", height: "100%" }}
              transition={0}
              onLoad={() => setLoadedSource(imageSource)}
              onError={() => setLoadedSource(imageSource)}
            />
          </>
        )}
      </View>
    </View>
  );
};

// The card face is purely presentational (no callback props), so it only
// needs to re-render when a value that affects its visual output changes.
// This matters a lot for games like Accordion that fire many rapid state
// updates: the parent AnimatedCard re-renders for every card on each update
// (its `onPress` closure identity changes each render), but with this memo
// only the card whose values actually changed re-runs the expensive image /
// box-shadow / overlay rendering. `style` is compared by identity, which is
// correct because AnimatedCard never passes it (both undefined), while the
// drag-ghost usages that do pass an inline `style` simply re-render as before.
function areCardPropsEqual(prev: CardProps, next: CardProps) {
  return (
    prev.style === next.style &&
    prev.cardWidth === next.cardWidth &&
    prev.isSelectable === next.isSelectable &&
    prev.isSelected === next.isSelected &&
    prev.isVisible === next.isVisible &&
    prev.selectColor === next.selectColor &&
    prev.forceSelectColor === next.forceSelectColor &&
    prev.forceOverlayColor === next.forceOverlayColor &&
    prev.cardSize === next.cardSize &&
    prev.isPlaceholder === next.isPlaceholder &&
    prev.isHiddenUnderDeck === next.isHiddenUnderDeck &&
    prev.cardBackPath === next.cardBackPath &&
    prev.card?.id === next.card?.id &&
    prev.card?.faceUp === next.card?.faceUp &&
    prev.card?.rank === next.card?.rank &&
    prev.card?.suit === next.card?.suit
  );
}

export const Card = memo(CardComponent, areCardPropsEqual);
