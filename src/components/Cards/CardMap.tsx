import { cardDims, PlayingCard } from "@/components/Cards/card-utils";
import { GAMES_DATA } from "@/data/games-data";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import {
  HeaderHeight,
  MaxContentHeight,
  MaxContentWidth,
} from "@/styles/styles";
import { usePathname } from "expo-router";
import { useMemo } from "react";
import { useWindowDimensions, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AnimatedCard,
  AnimatedCardMapping,
  CardMapBGMapping,
} from "./AnimatedCard";
import {
  CardMapBackgrounds,
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
  zIndex: number;
};

export type MappedCard = {
  card: PlayingCard;
  cardIndex: number;
  refIndex?: number;
  zoneName?: string;
  zoneId: string;
  pileIndex?: number;
  x: number;
  y: number;
  zIndex: number;
  isHiddenUnderDeck?: boolean;
  rotation?: number;
  topOfZone: boolean;
  clickThroughCards?: boolean;
};

export type MapZone = {
  id: string;
  pileIndex?: number;
  refIndex?: number;
  name?: string;
  col: number;
  row: number;
  rotation?: number;
  baseZIndex?: number;
  cards?: PlayingCard[];
  width?: number | "full";
  height?: number;
  fan?: {
    direction?: DeckFanDirection;
    offset?: number; // Multiplier of card dimension (e.g. 0.4 for 40%)
    maxVisible?: number;
    center?: boolean;
  };
  placeholder?: {
    showCount?: boolean;
    text?: string;
    infoPos?: DeckInfoPosition;
    hideBackground?: boolean;
    backgroundColor?: string;
  };
  clickThroughCards?: boolean;
};

type MapConfig = {
  game: any;
  zones: MapZone[];
  gap?: number; // Gap (x AND y) as a percentage of the layout width
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  fixedCols?: number;
  fixedRows?: number;
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
  fixedCols,
  fixedRows,
  cardSize,
  visualizer,
  cardMapper,
  zoneMapper,
}: MapConfig) {
  const pathname = usePathname();
  const customBack = GAMES_DATA[pathname]?.cardBack;
  const insets = useSafeAreaInsets();
  const responsiveScale = useResponsiveScale();

  const { width: screenWidthActual, height: screenHeightActual } =
    useWindowDimensions();

  // Calculate the end column (col + height) for each zone
  // and find the maximum value among them.
  const gridCols = useMemo(
    () =>
      Math.max(
        ...zones.map(
          (z) => (z.col || 0) + (z.width === "full" ? 1 : (z.width ?? 1)),
        ),
      ),
    [zones],
  );

  const gridRows = useMemo(
    () => Math.max(...zones.map((z) => (z.row || 0) + (z.height || 1))),
    [zones],
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
    const headerHeight =
      Math.round(HeaderHeight * responsiveScale) + insets.top;
    const screenBoardHeight = Math.max(screenHeightActual - headerHeight, 0);

    const containerWidth = Math.min(
      screenWidthActual,
      MaxContentWidth * responsiveScale,
    );
    const containerHeight = Math.min(
      screenBoardHeight,
      Math.max(MaxContentHeight * responsiveScale - headerHeight, 0),
    );

    const widthMargin = (screenWidthActual - containerWidth) / 2;
    const heightMargin = (screenBoardHeight - containerHeight) / 2;

    const gapYUnits = gap * cardDims.aspectRatio;

    const cardWidthUnitsToFit =
      (fixedCols ?? gridCols) +
      gap * (gridCols - 1) +
      paddingLeft +
      paddingRight;

    const cardHeightUnitsToFit =
      (fixedRows ?? gridRows) +
      gapYUnits * (gridRows - 1) +
      paddingTop +
      paddingBottom;

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
    const offsetX =
      widthMargin + (containerWidth - gridWidth) / 2 + paddingLeft * cardWidth;
    const offsetY =
      heightMargin +
      (containerHeight - gridHeight) / 2 +
      paddingTop * cardHeight;

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
  }, [
    fixedCols,
    fixedRows,
    gap,
    gridCols,
    gridRows,
    insets.top,
    paddingBottom,
    paddingLeft,
    paddingRight,
    paddingTop,
    responsiveScale,
    screenHeightActual,
    screenWidthActual,
  ]);

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
      zIndex: zone.baseZIndex,
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
      zIndex: zonePos.zIndex,
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
    let fanCenter = zone.fan?.center ?? true;
    let numCardsVisible = zone.cards?.length ?? 1;

    if (zone.fan) {
      let visualIndex = cardIndex;

      if (zone.fan.maxVisible !== undefined) {
        numCardsVisible = Math.min(zone.fan.maxVisible, numCardsVisible);

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

      let offsetY =
        fanDirection === "up"
          ? -fanOffset * cardHeight
          : fanDirection === "down"
            ? fanOffset * cardHeight
            : fanDirection === "diagonal-depth"
              ? -fanOffset * cardHeight
              : 0;

      // Horizontal centering of cards within a zone with width > 1
      if (
        fanCenter &&
        zone.width !== undefined &&
        zone.width !== "full" &&
        zone.width > 1
      ) {
        const fanSpanX = Math.abs(offsetX * (numCardsVisible - 1));
        const deckWidthPx = cardWidth + fanSpanX;
        const zoneWidthPx = base.width;
        const centeringOffset = (zoneWidthPx - deckWidthPx) / 2;
        const shiftForNegativeFan = offsetX < 0 ? fanSpanX : 0;

        x += centeringOffset + shiftForNegativeFan;
      }

      // Vertical centering of cards within a zone with height > 1
      if (fanCenter && zone.height !== undefined && zone.height > 1) {
        const fanSpanY = Math.abs(offsetY * (numCardsVisible - 1));
        const deckHeightPx = cardHeight + fanSpanY;
        const zoneHeightPx = base.height;
        const centeringOffset = (zoneHeightPx - deckHeightPx) / 2;
        const shiftForNegativeFan = offsetY < 0 ? fanSpanY : 0;

        y += centeringOffset + shiftForNegativeFan;
      }

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
          pileIndex: zone.pileIndex,
          refIndex: zone.refIndex,
          x: position.x,
          y: position.y,
          zIndex: position.zIndex,
          rotation: zone.rotation,
          isHiddenUnderDeck: position.isHiddenUnderDeck,
          clickThroughCards: zone.clickThroughCards,
          topOfZone: zone.cards ? i === zone.cards.length - 1 : true,
        };
      }
    }

    return positionMap;
  }, [game, zones, cardWidth, cardHeight, gridGap, startX, startY]);

  const mappedCards = Object.values(cardPositions).map((mappedCard) => {
    return (
      <AnimatedCard
        key={mappedCard.card.id}
        targetState={mappedCard}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        cardSize={cardSize}
        customBack={customBack}
        {...cardMapper(mappedCard)}
      />
    );
  });

  const mapBackgrounds = (
    <CardMapBackgrounds
      zones={zones}
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

export type ColRows = {
  c: number;
  r: number;
  width?: number;
  height?: number;
};

export function getGridColRows({
  cols,
  rows,
  colOffset = 0,
  rowOffset = 0,
  scaleX = 1,
  scaleY = 1,
}: {
  cols: number;
  rows: number;
  colOffset?: number;
  rowOffset?: number;
  scaleX?: number;
  scaleY?: number;
  aspectRatio?: number;
}): ColRows[] {
  return Array.from({ length: cols * rows }, (_, i) => ({
    c: (i % cols) * scaleX + colOffset,
    r: Math.floor(i / cols) * scaleY + rowOffset,
    width: 1 * scaleX,
    height: 1 * scaleY,
  }));
}
