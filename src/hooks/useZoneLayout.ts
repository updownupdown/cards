import { cardDims } from "@/components/Cards/card-utils";
import { IconName } from "@/icons";
import {
  HeaderHeight,
  MaxContentHeight,
  MaxContentWidth,
} from "@/styles/styles";
import { useMemo } from "react";
import { useWindowDimensions, ViewStyle } from "react-native";

export type FanDirection =
  | "none"
  | "up"
  | "down"
  | "left"
  | "right"
  | "diagonal-depth";

export type DeckInfoPosition = "above" | "below" | "left" | "right";

type CardPosition = {
  x: number;
  y: number;
  yOffset?: number;
  zIndex: number;
  isHiddenUnderDeck: boolean;
};

export type ZoneConfig = {
  id: string;
  col: number;
  row: number;
  width?: number | "full";
  height?: number;
  fan?: {
    direction?: FanDirection;
    offset?: number; // Multiplier of card dimension (e.g. 0.4 for 40%)
    maxVisible?: number;
  };
  placeholder?: {
    show: boolean;
    iconName?: IconName;
    text?: string;
    showCount?: boolean;
    infoPos?: DeckInfoPosition;
  };
};

export type LayoutConfig = {
  zones: ZoneConfig[];
  targetCols?: number;
  targetRows?: number;
  gapPc?: number; // Gap (x AND y) as a percentage of the layout width
  paddingTopPc?: number;
  paddingBottomPc?: number;
  paddingLeftPc?: number;
  paddingRightPc?: number;
};

export type LayoutMetrics = {
  startX: number;
  startY: number;
  endY: number;
  gridWidth: number;
  gridWidthPadded: number;
  gridHeight: number;
  gridHeightPadded: number;
  gridGap: number;
};

export type LayoutManager = {
  getCardPosition: (
    zoneId: string,
    cardIndex: number,
    totalCardsInZone: number,
    startingZIndex?: number,
  ) => CardPosition;

  getZoneBasePos: (zone: ZoneConfig) => {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  getZoneStyles: (zoneId: string) => ViewStyle;

  zones: ZoneConfig[];
  cardWidth: number;
  cardHeight: number;
  layoutMetrics: LayoutMetrics;
};

/**
 * @deprecated
 */
export function useZoneLayout({
  zones,
  targetCols,
  targetRows,
  gapPc = cardDims.layoutGap,
  paddingTopPc = cardDims.layoutPadding,
  paddingBottomPc = cardDims.layoutPadding,
  paddingLeftPc = cardDims.layoutPadding,
  paddingRightPc = cardDims.layoutPadding,
}: LayoutConfig) {
  const { width: screenWidthActual, height: screenHeightActual } =
    useWindowDimensions();

  const containerWidth = Math.min(screenWidthActual, MaxContentWidth);
  const containerHeight = Math.min(
    screenHeightActual - HeaderHeight,
    MaxContentHeight - HeaderHeight,
  );

  const gridCols = useMemo(() => {
    if (targetCols) return targetCols;
    return Math.max(...zones.map((z) => z.col)) + 1;
  }, [zones, targetCols]);

  const gridRows = useMemo(() => {
    if (targetRows) return targetRows;
    return Math.max(...zones.map((z) => z.row)) + 1;
  }, [zones, targetRows]);

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
    const cardWidthUnitsToFit = targetCols
      ? targetCols + paddingLeftPc + paddingRightPc
      : gridCols + gapPc * (gridCols - 1) + paddingLeftPc + paddingRightPc;

    const gapYUnits = gapPc * cardDims.aspectRatio;

    const cardHeightUnitsToFit = targetRows
      ? targetRows + paddingTopPc + paddingBottomPc
      : gridRows + gapYUnits * (gridRows - 1) + paddingTopPc + paddingBottomPc;

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

    const paddingX = (paddingLeftPc + paddingRightPc) * cardWidth;
    const paddingY = (paddingTopPc + paddingBottomPc) * cardHeight;

    // 5. Perfect Centering: Divide remaining screen space evenly
    const offsetX =
      (containerWidth - gridWidth) / 2 + paddingLeftPc * cardWidth;
    const offsetY =
      (containerHeight - gridHeight) / 2 + paddingTopPc * cardHeight;

    const gridWidthPadded = gridWidth - paddingX;
    const gridHeightPadded = gridHeight - paddingY;

    return {
      cardWidth,
      cardHeight,
      actualGap: gapPc * cardWidth,
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
    gapPc,
    paddingTopPc,
    paddingBottomPc,
    paddingLeftPc,
    paddingRightPc,
  ]);

  const zoneMap = useMemo(() => {
    const map: Record<string, ZoneConfig> = {};
    zones.forEach((z) => (map[z.id] = z));
    return map;
  }, [zones]);

  // Use the dynamic centering offsets instead of standard padding
  const getZoneBasePos = (zone: ZoneConfig) => {
    return {
      x: startX + zone.col * (cardWidth + actualGap),
      y: startY + zone.row * (cardHeight + actualGap),
      width:
        zone.width === "full" ? gridWidthPadded : cardWidth * (zone.width ?? 1),
      height: cardHeight * (zone.height ?? 1),
    };
  };

  const getZoneStyles = (zoneId: string) => {
    const styles: ViewStyle = {
      position: "absolute",
      top: 0,
      left: 0,
      width: 100,
      height: 100,
    };

    const zone = zones.find((z) => z.id === zoneId);

    if (zone) {
      const zonePos = getZoneBasePos(zone);

      if (zonePos) {
        styles.top = zonePos.y;
        styles.left = zonePos.x;
        styles.width = zonePos.width;
        styles.height = zonePos.height;
      }
    }

    return styles;
  };

  const getCardPosition = (
    zoneId: string,
    cardIndex: number,
    totalCardsInZone: number,
    startingZIndex: number = 0,
  ) => {
    const zone = zoneMap[zoneId];
    if (!zone) return { x: 0, y: 0, zIndex: 0, isHiddenUnderDeck: false };

    const base = getZoneBasePos(zone);
    let { x, y } = base;
    let zIndex = startingZIndex + cardIndex;
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

  return {
    getCardPosition,
    getZoneBasePos,
    getZoneStyles,
    zones,
    cardWidth,
    cardHeight,
    layoutMetrics: {
      startX,
      startY,
      endY,
      gridWidth,
      gridWidthPadded,
      gridHeight,
      gridHeightPadded,
      gridGap: actualGap,
    },
  } as LayoutManager;
}
