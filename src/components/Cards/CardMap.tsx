import { cardDims, PlayingCard } from "@/components/Cards/card-utils";
import { IconName } from "@/icons";
import {
  HeaderHeight,
  MaxContentHeight,
  MaxContentWidth,
} from "@/styles/styles";
import { useMemo } from "react";
import { useWindowDimensions, ViewStyle } from "react-native";
import { AnimatedCard, AnimatedCardMapping } from "./AnimatedCard";
import {
  CardMapBackgrounds,
  CardMapBGMapping,
  DeckFanDirection,
  DeckInfoPosition,
} from "./CardMapBackgrounds";
import { CardMapVisualizer } from "./CardMapVisualizer";
import { CardSizes } from "./CardStyles";

export type CardPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MappedCard = {
  card: PlayingCard;
  cardIndex: number;
  refIndex?: number;
  zoneName?: string;
  zoneId: string;
  zoneType: string;
  pileIndex?: number;
  x: number;
  y: number;
  zIndex: number;
  isHiddenUnderDeck?: boolean;
  topOfZone: boolean;
};

export type MapZoneType = "ui" | "single-card" | "deck" | "card-array";

export type MapZone = {
  id: string;
  pileIndex?: number;
  refIndex?: number;
  name?: string;
  type: MapZoneType;
  col: number;
  row: number;
  baseZIndex?: number;
  cards?: PlayingCard[];
  width?: number | "full";
  height?: number;
  fan?: {
    direction?: DeckFanDirection;
    offset?: number; // Multiplier of card dimension (e.g. 0.4 for 40%)
    maxVisible?: number;
  };
  placeholder?: {
    showCount?: boolean;
    text?: string;
    iconName?: IconName;
    infoPos?: DeckInfoPosition;
  };
};

type MapConfig = {
  game: any;
  zones: MapZone[];
  gap?: number; // Gap (x AND y) as a percentage of the layout width
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  cardSize: CardSizes;
  visualizer?: boolean;
  cardMapper: (mappedCard: MappedCard) => AnimatedCardMapping | undefined;
  zoneMapper?: (zone: MapZone) => CardMapBGMapping | undefined;
};

export function useCardMap({
  game,
  zones,
  gap = cardDims.layoutGap,
  paddingTop = cardDims.layoutPadding,
  paddingBottom = cardDims.layoutPadding,
  paddingLeft = cardDims.layoutPadding,
  paddingRight = cardDims.layoutPadding,
  cardSize,
  visualizer,
  cardMapper,
  zoneMapper,
}: MapConfig) {
  const { width: screenWidthActual, height: screenHeightActual } =
    useWindowDimensions();

  // Calculate the end column (col + height) for each zone
  // and find the maximum value among them.
  const gridCols = useMemo(
    () =>
      Math.max(
        ...zones.map(
          (z) => (z.col || 0) + (z.width === "full" ? 1 : (z.height ?? 1)),
        ),
      ),
    [screenWidthActual],
  );

  const gridRows = useMemo(
    () => Math.max(...zones.map((z) => (z.row || 0) + (z.height || 1))),
    [screenWidthActual],
  );

  const {
    cardWidth,
    cardHeight,
    gridGap,
    startX,
    startY,
    gridWidth,
    gridWidthPadded,
    gridHeight,
    gridHeightPadded,
  } = useMemo(() => {
    const containerWidth = Math.min(screenWidthActual, MaxContentWidth);
    const containerHeight = Math.min(
      screenHeightActual - HeaderHeight,
      MaxContentHeight - HeaderHeight,
    );

    const gapYUnits = gap * cardDims.aspectRatio;

    const cardWidthUnitsToFit =
      gridCols + gap * (gridCols - 1) + paddingLeft + paddingRight;

    const cardHeightUnitsToFit =
      gridRows + gapYUnits * (gridRows - 1) + paddingTop + paddingBottom;

    let cardWidth = containerWidth / cardWidthUnitsToFit;
    let cardHeight = containerHeight / cardHeightUnitsToFit;

    // Enforce Aspect Ratio
    if (cardWidth / cardDims.aspectRatio > cardHeight) {
      // Height is the bottleneck, scale width down
      cardWidth = cardHeight * cardDims.aspectRatio;
    } else {
      // Width is the bottleneck, scale height down
      cardHeight = cardWidth / cardDims.aspectRatio;
    }

    // Calculate Final Grid Bounding Box
    const gridWidth = cardWidth * cardWidthUnitsToFit;
    const gridHeight = cardHeight * cardHeightUnitsToFit;

    const paddingX = (paddingLeft + paddingRight) * cardWidth;
    const paddingY = (paddingTop + paddingBottom) * cardHeight;

    const gridWidthPadded = gridWidth - paddingX;
    const gridHeightPadded = gridHeight - paddingY;

    // Perfect Centering: Divide remaining screen space evenly
    const offsetX = (containerWidth - gridWidth) / 2 + paddingLeft * cardWidth;
    const offsetY =
      (containerHeight - gridHeight) / 2 + paddingTop * cardHeight;

    return {
      cardWidth,
      cardHeight,
      gridGap: gap * cardWidth,
      startX: offsetX,
      startY: offsetY,
      gridWidth,
      gridWidthPadded,
      gridHeight,
      gridHeightPadded,
    };
  }, [screenWidthActual]);

  const getZoneBasePos = (zone: MapZone) => {
    const zWidth = zone.width === "full" ? 1 : (zone.width ?? 1);
    const zHeight = zone.height ?? 1;

    return {
      x: startX + zone.col * (cardWidth + gridGap),
      y: startY + zone.row * (cardHeight + gridGap),
      width:
        zone.width === "full"
          ? gridWidthPadded
          : cardWidth * zWidth + gridGap * (zWidth - 1),
      height: cardHeight * zHeight + gridGap * (zHeight - 1),
    } as CardPosition;
  };

  const getZoneStyles = (zone: MapZone) => {
    const zonePos = getZoneBasePos(zone);

    return {
      position: "absolute",
      top: zonePos.y,
      left: zonePos.x,
      width: zonePos.width,
      height: zonePos.height,
    } as ViewStyle;
  };

  const getZoneStylesById = (zoneId: string) => {
    const zone = zones.find((z) => z.id === zoneId);
    return (zone ? getZoneStyles(zone) : {}) as ViewStyle;
  };

  const getCardPosition = (
    zone: MapZone,
    totalCardsInZone: number,
    baseZIndex: number,
    cardIndex: number,
  ) => {
    const base = getZoneBasePos(zone);
    let { x, y } = base;
    let zIndex = baseZIndex + cardIndex;
    let isHiddenUnderDeck = false;
    let fanOffset = zone.fan?.offset ?? cardDims.fanOffset;

    if (zone.fan) {
      let visualIndex = cardIndex;
      if (zone.fan.maxVisible !== undefined) {
        const startVisible = Math.max(
          0,
          totalCardsInZone - zone.fan.maxVisible,
        );
        visualIndex = Math.max(0, cardIndex - startVisible);

        if (cardIndex < startVisible) {
          isHiddenUnderDeck = true;
        }
      }

      const fanDirection = zone.fan.direction ?? "diagonal-depth";

      const offsetX =
        fanDirection === "left"
          ? -fanOffset * cardWidth
          : fanDirection === "right"
            ? fanOffset * cardWidth
            : fanDirection === "diagonal-depth"
              ? fanOffset * cardWidth
              : 0;

      const offsetY =
        fanDirection === "up"
          ? -fanOffset * cardHeight
          : fanDirection === "down"
            ? fanOffset * cardHeight
            : fanDirection === "diagonal-depth"
              ? -fanOffset * cardHeight
              : 0;

      x += offsetX * visualIndex;
      y += offsetY * visualIndex;
    }

    return { x, y, zIndex, isHiddenUnderDeck };
  };

  const cardPositions: Record<string, MappedCard> = useMemo(() => {
    const positionMap: Record<string, MappedCard> = {};

    for (const zone of zones) {
      if (zone.cards === undefined) continue;
      for (let i = 0; i < zone.cards.length; i++) {
        const card = zone.cards?.[i];

        const position = getCardPosition(
          zone,
          zone.cards?.length ?? 1,
          zone.baseZIndex ?? 1,
          i,
        );

        positionMap[`${zone.id}-${card?.id}`] = {
          card,
          cardIndex: i,
          zoneId: zone.id,
          zoneName: zone.name,
          zoneType: zone.type,
          pileIndex: zone.pileIndex,
          refIndex: zone.refIndex,
          x: position.x,
          y: position.y,
          zIndex: position.zIndex,
          isHiddenUnderDeck: position.isHiddenUnderDeck,
          topOfZone: zone.cards ? i === zone.cards.length - 1 : true,
        };
      }
    }

    return positionMap;
  }, [game, zones, cardWidth]);

  const mappedCards = Object.values(cardPositions).map((mappedCard) => {
    return (
      <AnimatedCard
        key={mappedCard.card.id}
        targetState={mappedCard}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        cardSize={cardSize}
        {...cardMapper(mappedCard)}
      />
    );
  });

  const mapBackgrounds = (
    <CardMapBackgrounds
      zones={zones}
      game={game}
      getZoneBasePos={getZoneBasePos}
      zoneMapper={zoneMapper}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
    />
  );

  const mapVisualizer = visualizer ? (
    <CardMapVisualizer
      zones={zones}
      getZoneStyles={getZoneStyles}
      startX={startX}
      startY={startY}
      gridWidth={gridWidth}
      gridWidthPadded={gridWidthPadded}
      gridHeight={gridHeight}
      gridHeightPadded={gridHeightPadded}
    />
  ) : null;

  const cardMap = (
    <>
      {mapBackgrounds}
      {mappedCards}
      {mapVisualizer}
    </>
  );

  return {
    cardMap,
    getZoneStyles,
    getZoneStylesById,
    getZoneBasePos,
    cardWidth,
    cardHeight,
  };
}

export type ColRows = { c: number; r: number };
export function getGridColRows({
  cols,
  rows,
  colOffset = 0,
  rowOffset = 0,
}: {
  cols: number;
  rows: number;
  colOffset?: number;
  rowOffset?: number;
}): ColRows[] {
  return Array.from({ length: cols * rows }, (_, i) => ({
    c: (i % cols) + colOffset,
    r: Math.floor(i / cols) + rowOffset,
  }));
}
