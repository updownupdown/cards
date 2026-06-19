import { cardDims, PlayingCard } from "@/components/Cards/card-utils";
import { IconName } from "@/icons";
import {
  HeaderHeight,
  MaxContentHeight,
  MaxContentWidth,
} from "@/styles/styles";
import { useMemo } from "react";
import { useWindowDimensions, ViewStyle } from "react-native";
import { CardMapBackgrounds } from "./CardMapBackgrounds";
import { CardMapVisualizer } from "./CardMapVisualizer";
import {
  AnimatedCard,
  AnimatedCardMapping,
  AnimatedCardProps,
} from "./AnimatedCard";
import { CardSizes } from "./Card";

type DeckFanDirection =
  | "none"
  | "up"
  | "down"
  | "left"
  | "right"
  | "diagonal-depth";

type DeckInfoPosition = "above" | "below" | "left" | "right";

export type CardPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MappedCard = {
  card: PlayingCard;
  cardIndex: number;
  zoneName?: string;
  zoneId: string;
  zoneType: string;
  pileIndex?: number;
  x: number;
  y: number;
  zIndex: number;
  isHiddenUnderDeck?: boolean;
  topOfZone: boolean;
  // rotation?: number;
  // misc?: any;
};

export type MapZoneType = "ui" | "single-card" | "deck" | "card-array";

export type MapZone = {
  id: string;
  pileIndex?: number;
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
    show: boolean;
    showCount?: boolean;
    text?: string;
    iconName?: IconName;
    infoPos?: DeckInfoPosition;
  };
};

export type MapMetrics = {
  startX: number;
  startY: number;
  endY: number;
  gridWidth: number;
  gridWidthPadded: number;
  gridHeight: number;
  gridHeightPadded: number;
  gridGap: number;
};

// export type MapManager = {
//     zones: ZoneConfig[];
//   cardWidth: number;
//   cardHeight: number;
//   layoutMetrics: MapMetrics;
//   getCardPosition: (
//     zoneId: string,
//     cardIndex: number,
//     totalCardsInZone: number,
//     startingZIndex?: number,
//   ) => CardPosition;
//   getZoneBasePos: (zone: ZoneConfig) => {
//     x: number;
//     y: number;
//     width: number;
//     height: number;
//   };
//   getZoneStyles: (zoneId: string) => ViewStyle;
// };

type MapConfig = {
  game: any;
  zones: MapZone[];
  fixedCols?: number;
  fixedRows?: number;
  gap?: number; // Gap (x AND y) as a percentage of the layout width
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  cardSize: CardSizes;
  cardMapper: (mappedCard: MappedCard) => AnimatedCardMapping | undefined;
};

export function useCardMap({
  game,
  zones,
  fixedCols,
  fixedRows,
  gap = cardDims.layoutGap,
  paddingTop = cardDims.layoutPadding,
  paddingBottom = cardDims.layoutPadding,
  paddingLeft = cardDims.layoutPadding,
  paddingRight = cardDims.layoutPadding,
  cardSize,
  cardMapper,
}: MapConfig) {
  const { width: screenWidthActual, height: screenHeightActual } =
    useWindowDimensions();

  const containerWidth = Math.min(screenWidthActual, MaxContentWidth);
  const containerHeight = Math.min(
    screenHeightActual - HeaderHeight,
    MaxContentHeight - HeaderHeight,
  );

  // Calculate the end column (col + height) for each zone
  // and find the maximum value among them.
  const gridCols = useMemo(() => {
    if (fixedCols) return fixedCols;
    if (zones.length === 0) return 0;
    return Math.max(...zones.map((z) => (z.col || 0) + (z.height || 1)));
  }, [zones, fixedCols]);

  const gridRows = useMemo(() => {
    if (fixedRows) return fixedRows;
    if (zones.length === 0) return 0;
    return Math.max(
      ...zones.map((z) =>
        z.width === "full" ? 0 : (z.row || 0) + (z.width || 1),
      ),
    );
  }, [zones, fixedRows]);

  const {
    cardWidth,
    cardHeight,
    actualGap,
    startX,
    startY,
    endY,
    gridWidth,
    gridWidthPadded,
    gridHeight,
    gridHeightPadded,
  } = useMemo(() => {
    const cardWidthUnitsToFit = fixedCols
      ? fixedCols + paddingLeft + paddingRight
      : gridCols + gap * (gridCols - 1) + paddingLeft + paddingRight;

    const gapYUnits = gap * cardDims.aspectRatio;

    const cardHeightUnitsToFit = fixedRows
      ? fixedRows + paddingTop + paddingBottom
      : gridRows + gapYUnits * (gridRows - 1) + paddingTop + paddingBottom;

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

    // 4. Calculate Final Grid Bounding Box
    const gridWidth = cardWidth * cardWidthUnitsToFit;
    const gridHeight = cardHeight * cardHeightUnitsToFit;

    const paddingX = (paddingLeft + paddingRight) * cardWidth;
    const paddingY = (paddingTop + paddingBottom) * cardHeight;

    // 5. Perfect Centering: Divide remaining screen space evenly
    const offsetX = (containerWidth - gridWidth) / 2 + paddingLeft * cardWidth;
    const offsetY =
      (containerHeight - gridHeight) / 2 + paddingTop * cardHeight;

    const gridWidthPadded = gridWidth - paddingX;
    const gridHeightPadded = gridHeight - paddingY;

    return {
      cardWidth,
      cardHeight,
      actualGap: gap * cardWidth,
      startX: offsetX,
      startY: offsetY,
      endY: offsetY + gridHeightPadded,
      gridWidth,
      gridWidthPadded,
      gridHeight,
      gridHeightPadded,
    };
  }, [
    screenWidthActual,
    containerWidth,
    containerHeight,
    gridCols,
    gridRows,
    gap,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
  ]);

  const zoneMap = useMemo(() => {
    const map: Record<string, MapZone> = {};
    zones.forEach((z) => (map[z.id] = z));
    return map;
  }, [zones]);

  // Use the dynamic centering offsets instead of standard padding
  const getZoneBasePos = (zone: MapZone) => {
    return {
      x: startX + zone.col * (cardWidth + actualGap),
      y: startY + zone.row * (cardHeight + actualGap),
      width:
        zone.width === "full" ? gridWidthPadded : cardWidth * (zone.width ?? 1),
      height: cardHeight * (zone.height ?? 1),
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
      if (zone.cards && zone.cards.length > 0) {
        for (let i = 0; i < zone.cards.length; i++) {
          const card = zone.cards[i];
          const position = getCardPosition(
            zone,
            zone.cards.length,
            zone.baseZIndex ?? 1,
            i,
          );
          positionMap[`${zone.id}-${card.id}`] = {
            card,
            cardIndex: i,
            zoneId: zone.id,
            zoneName: zone.name,
            zoneType: zone.type,
            pileIndex: zone.pileIndex,
            x: position.x,
            y: position.y,
            zIndex: position.zIndex,
            isHiddenUnderDeck: position.isHiddenUnderDeck,
            topOfZone: i === zone.cards.length - 1,
          };
        }
      }
    }

    return positionMap;
  }, [game, zones, cardWidth]);

  const mappedCards = Object.values(cardPositions).map((mappedCard) => {
    return (
      <AnimatedCard
        key={mappedCard.card.id}
        {...cardMapper(mappedCard)}
        targetState={mappedCard}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        cardSize={cardSize}
      />
    );
  });

  const mapMetrics: MapMetrics = {
    startX,
    startY,
    endY,
    gridWidth,
    gridWidthPadded,
    gridHeight,
    gridHeightPadded,
    gridGap: actualGap,
  };

  const mapBackgrounds = (
    <CardMapBackgrounds
      zones={zones}
      getZoneBasePos={getZoneBasePos}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      game={game}
    />
  );
  const mapVisualizer = (
    <CardMapVisualizer
      zones={zones}
      getZoneStyles={getZoneStyles}
      mapMetrics={mapMetrics}
    />
  );

  return {
    mappedCards,
    mapVisualizer,
    mapBackgrounds,
    getZoneStyles,
    getZoneStylesById,
    cardPositions,
    cardWidth,
    cardHeight,
    mapMetrics,
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
