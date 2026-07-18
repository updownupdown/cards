import { CardComponents as CardsClassic } from "@/assets/cards/classic";
import { CardComponents as CardsRegular } from "@/assets/cards/regular";
import { CardComponents as CardsSmall } from "@/assets/cards/small";
import { CardComponents as CardsSmallColored } from "@/assets/cards/small-colored";
import { CardComponents as CardsTableau } from "@/assets/cards/tableau";
import { Image } from "expo-image";
import React from "react";
import { View, ViewStyle } from "react-native";
import { cardDims, PlayingCard } from "./card-utils";
import { CardColor, CardOverlay, CardSizes, getCardShadow } from "./CardStyles";
import { cardBackAssets, defaultCardBackName } from "./generated-card-backs";

const getCardBackAsset = (filename?: string) => {
  if (!filename) return cardBackAssets[defaultCardBackName];
  return cardBackAssets[filename] ?? cardBackAssets[defaultCardBackName];
};

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
  customBack?: string;
};

export const Card = ({
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
  customBack,
}: CardProps) => {
  const cardFiles =
    cardSize === "small"
      ? CardsSmall
      : cardSize === "small-colored"
        ? CardsSmallColored
        : cardSize === "tableau"
          ? CardsTableau
          : cardSize === "classic"
            ? CardsClassic
            : CardsRegular;

  let cardName = "BackH";

  if (card && card.faceUp) {
    cardName = card.rank + card.suit.charAt(0).toUpperCase();
  }

  const imageSource = cardFiles[cardName];
  const isFaceDown = !card || !card.faceUp;
  const backAsset = getCardBackAsset(customBack);

  if (!isVisible) return null;
  if (!isFaceDown && !imageSource) {
    console.warn(`PNG ${cardName} not found.`);
    return null;
  }

  return (
    <View
      collapsable={false}
      style={[
        style,
        {
          overflow: "hidden",
          width: "100%",
          height: "auto",
          aspectRatio: cardDims.aspectRatio,
          transitionDuration: "0.15s",
          transitionTimingFunction: "ease",
          transitionProperty: "all",
          position: "relative",
          zIndex: 3,
          outlineWidth: 0,
          boxShadow: isHiddenUnderDeck
            ? "none"
            : getCardShadow({
                cardWidth,
                selectColor,
                isSelected,
                isSelectable,
                forceSelectColor,
                isPlaceholder,
              }),
          borderRadius: Math.max(cardWidth, 1) * cardDims.ratioRadius,
          backfaceVisibility: "hidden",
        },
      ]}
    >
      <CardOverlay
        cardWidth={cardWidth}
        isSelected={isSelected}
        forceOverlayColor={forceOverlayColor}
        selectColor={selectColor}
      />

      {isFaceDown ? (
        <Image
          source={backAsset}
          style={{ width: "100%", height: "100%" }}
          transition={0}
        />
      ) : (
        <Image
          source={imageSource}
          style={{ width: "100%", height: "100%" }}
          transition={0}
        />
      )}
    </View>
  );
};
