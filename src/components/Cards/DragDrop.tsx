import type { DragGhost, DragTranslate } from "@/hooks/useDragDrop";
import type { ComponentProps } from "react";
import { View, type ViewProps } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Card, type CardProps } from "./Card";
import { cardDims } from "./card-utils";

type DragGesture = ComponentProps<typeof GestureDetector>["gesture"];

/** A drag/tap hit area for a gesture created by useDragDrop's makeDragHandlers. */
export function DragHandle({
  gesture,
  ...viewProps
}: ViewProps & { gesture: DragGesture }) {
  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false} {...viewProps} />
    </GestureDetector>
  );
}

/** Container for a drag ghost, offset by the live drag translation. */
export function DragGhostView({
  translate,
  style,
  ...viewProps
}: ComponentProps<typeof Animated.View> & { translate: DragTranslate }) {
  const translateStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translate.x.value },
      { translateY: translate.y.value },
    ],
  }));

  return <Animated.View {...viewProps} style={[style, translateStyle]} />;
}

type DragGhostCardsProps = {
  ghost: DragGhost<unknown>;
  translate: DragTranslate;
  cardWidth: number;
  cardHeight: number;
  cardSize?: CardProps["cardSize"];
  /**
   * Vertical gap between dragged cards, as a fraction of the card height. The
   * ghost's own fanOffset (set by startDrag) takes precedence.
   */
  fanOffset?: number;
  cardBackPath?: string;
  /** Over a valid drop target: the dragged cards use this overlay color. */
  isValidDrop: boolean;
  validDropColor?: CardProps["selectColor"];
  /** Outline only the lead card of a dragged run. */
  highlightLeadOnly?: boolean;
};

/** The cards being dragged, fanned downwards and following the finger. */
export function DragGhostCards({
  ghost,
  translate,
  cardWidth,
  cardHeight,
  cardSize,
  fanOffset = cardDims.tableauOffset,
  cardBackPath,
  isValidDrop,
  validDropColor = "green",
  highlightLeadOnly = false,
}: DragGhostCardsProps) {
  return (
    <DragGhostView
      translate={translate}
      style={{
        position: "absolute",
        zIndex: 4000,
        pointerEvents: "none",
        left: ghost.origin.x,
        top: ghost.origin.y,
      }}
    >
      {ghost.cards.map((card, index) => {
        const highlighted = isValidDrop && (!highlightLeadOnly || index === 0);
        const direction = ghost.fanDirection ?? "down";
        const offset = ghost.fanOffset ?? fanOffset;
        const horizontalOffset =
          direction === "left"
            ? -offset * cardWidth
            : direction === "right" || direction === "diagonal-depth"
              ? offset * cardWidth
              : 0;
        const verticalOffset =
          direction === "up"
            ? -offset * cardHeight
            : direction === "down"
              ? offset * cardHeight
              : direction === "diagonal-depth"
                ? -offset * cardHeight
                : 0;
        return (
          <View
            key={`ghost-${card.id}`}
            style={{
              position: "absolute",
              left: index * horizontalOffset,
              top: index * verticalOffset,
              width: cardWidth,
              height: cardHeight,
              zIndex: index + 1,
            }}
          >
            <Card
              card={card}
              cardWidth={cardWidth}
              cardSize={cardSize}
              cardBackPath={cardBackPath}
              selectColor={highlighted ? validDropColor : "none"}
              isSelected={highlighted}
            />
          </View>
        );
      })}
    </DragGhostView>
  );
}
