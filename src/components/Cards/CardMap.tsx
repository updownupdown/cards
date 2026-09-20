import { cardDims, PlayingCard } from "@/components/Cards/card-utils";
import { useResponsiveUiLayoutFromWidth } from "@/hooks/useResponsiveLayout";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { roundToPixel } from "@/utils/utils";
import { useGamePath } from "@/hooks/useGamePath";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadingOverlay } from "../common/LoadingOverlay";
import {
  AnimatedCard,
  AnimatedCardMapping,
  CardMapBGMapping,
} from "./AnimatedCard";
import { isCardImageSetPreloaded, preloadCardImageSet } from "./CardAssets";
import { isBoardInputLocked } from "./input-lock";
import {
  CardMapBackgrounds,
  DeckFanDirection,
  DeckInfoPosition,
} from "./CardMapBackgrounds";
import { CardMapVisualizer } from "./CardMapVisualizer";
import { CardSizes } from "./CardStyles";
import { getHeaderHeightWithInset } from "@/styles/styles";
import { IconName } from "@/icons/generated";

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
    offsets?: number[]; // Per-card start-to-start offsets, beginning after the first card
    maxVisible?: number;
    shadowVisibleCount?: number;
    center?: boolean;
  };
  placeholder?: {
    showCount?: boolean;
    text?: string;
    infoPos?: DeckInfoPosition;
    hideBackground?: boolean;
    hideShadow?: boolean;
    backgroundColor?: string;
    iconName?: IconName;
    iconSize?: number;
    iconOpacity?: number;
  };
  clickThroughCards?: boolean;
};

type MapConfig = {
  game: unknown;
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

/** Space a card map can use: the viewport below the header, above the nav bar. */
export function useBoardArea() {
  const insets = useSafeAreaInsets();
  const { width, height } = useViewportDimensions();
  const ui = useResponsiveUiLayoutFromWidth(width, height);
  const headerHeight = getHeaderHeightWithInset(insets.top, ui.scale);

  return {
    width,
    // Keep the board clear of the system navigation bar at the bottom.
    height: Math.max(height - headerHeight - insets.bottom, 0),
  };
}

/**
 * Card width a board of `cols` x `rows` card slots gets in `area`, using the
 * same sizing as useCardMap with its default padding. Lets a game compare
 * candidate layouts and keep whichever shows the biggest cards.
 */
export function fitCardWidth(
  area: { width: number; height: number },
  {
    cols,
    rows,
    gap = cardDims.layoutGap,
  }: { cols: number; rows: number; gap?: number },
) {
  const pad = cardDims.layoutPadding;
  const widthUnits = cols + gap * (cols - 1) + pad * 2;
  const heightUnits =
    rows + gap * cardDims.aspectRatio * (rows - 1) + pad * 1.5;

  return Math.min(
    area.width / widthUnits,
    (area.height / heightUnits) * cardDims.aspectRatio,
  );
}

export function useCardMap({
  game,
  zones,
  gap = cardDims.layoutGap,
  paddingTop = cardDims.layoutPadding / 2,
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
  const pathname = useGamePath();
  const cardBackPath = pathname;
  const [cardImagesLoaded, setCardImagesLoaded] = useState(() =>
    isCardImageSetPreloaded(cardSize, cardBackPath),
  );

  const { width: containerWidth, height: containerHeight } = useBoardArea();

  useEffect(() => {
    let cancelled = false;

    setCardImagesLoaded(isCardImageSetPreloaded(cardSize, cardBackPath));

    preloadCardImageSet(cardSize, cardBackPath).finally(() => {
      if (!cancelled) {
        setCardImagesLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cardBackPath, cardSize]);

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
    gridStartX,
    gridStartY,
    startX,
    startY,
    gridWidth,
    gridWidthPadded,
    gridHeight,
    gridHeightPadded,
  } = useMemo(() => {
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

    if (cardWidth / cardDims.aspectRatio > cardHeight) {
      cardWidth = cardHeight * cardDims.aspectRatio;
    } else {
      cardHeight = cardWidth / cardDims.aspectRatio;
    }

    cardWidth = roundToPixel(cardWidth);
    cardHeight = roundToPixel(cardHeight);

    const gridWidth = roundToPixel(cardWidth * cardWidthUnitsToFit);
    const gridHeight = roundToPixel(cardHeight * cardHeightUnitsToFit);

    const paddingX = roundToPixel((paddingLeft + paddingRight) * cardWidth);
    const paddingY = roundToPixel((paddingTop + paddingBottom) * cardHeight);

    const gridWidthPadded = roundToPixel(gridWidth - paddingX);
    const gridHeightPadded = roundToPixel(gridHeight - paddingY);

    const offsetX = (containerWidth - gridWidth) / 2 + paddingLeft * cardWidth;
    const offsetY =
      (containerHeight - gridHeight) / 2 + paddingTop * cardHeight;

    const gridStartX = (containerWidth - gridWidth) / 2;
    const gridStartY = (containerHeight - gridHeight) / 2;

    return {
      cardWidth,
      cardHeight,
      gridGap: roundToPixel(gap * cardWidth),
      gridStartX: roundToPixel(gridStartX),
      gridStartY: roundToPixel(gridStartY),
      startX: roundToPixel(offsetX),
      startY: roundToPixel(offsetY),
      gridWidth,
      gridWidthPadded,
      gridHeight,
      gridHeightPadded,
    };
  }, [
    containerHeight,
    containerWidth,
    fixedCols,
    fixedRows,
    gap,
    gridCols,
    gridRows,
    paddingBottom,
    paddingLeft,
    paddingRight,
    paddingTop,
  ]);

  const zoneBasePosById = useMemo(() => {
    const map = new Map<string, CardPosition>();

    for (const zone of zones) {
      const zWidth = zone.width === "full" ? 1 : (zone.width ?? 1);
      const zHeight = zone.height ?? 1;

      map.set(zone.id, {
        x: roundToPixel(startX + zone.col * (cardWidth + gridGap)),
        y: roundToPixel(startY + zone.row * (cardHeight + gridGap)),
        width:
          zone.width === "full"
            ? gridWidthPadded
            : roundToPixel(cardWidth * zWidth + gridGap * (zWidth - 1)),
        height: roundToPixel(cardHeight * zHeight + gridGap * (zHeight - 1)),
        zIndex: zone.baseZIndex ?? 1,
      });
    }

    return map;
  }, [cardHeight, cardWidth, gridGap, gridWidthPadded, startX, startY, zones]);

  const zoneById = useMemo(() => {
    const map = new Map<string, MapZone>();
    for (const zone of zones) {
      map.set(zone.id, zone);
    }
    return map;
  }, [zones]);

  const getZoneBasePos = useCallback(
    (zone: MapZone) => {
      const cached = zoneBasePosById.get(zone.id);

      if (cached) {
        return cached;
      }

      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        zIndex: zone.baseZIndex ?? 1,
      } as CardPosition;
    },
    [zoneBasePosById],
  );

  const getZoneStyles = useCallback(
    (zone: MapZone) => {
      const zonePos = getZoneBasePos(zone);

      return {
        position: "absolute",
        top: zonePos.y,
        left: zonePos.x,
        width: zonePos.width,
        height: zonePos.height,
        zIndex: zonePos.zIndex,
      } as ViewStyle;
    },
    [getZoneBasePos],
  );

  const getZoneStylesById = useCallback(
    (zoneId: string) => {
      const zone = zoneById.get(zoneId);
      return (zone ? getZoneStyles(zone) : {}) as ViewStyle;
    },
    [getZoneStyles, zoneById],
  );

  const getCardPosition = useCallback(
    (
      zone: MapZone,
      totalCardsInZone: number,
      baseZIndex: number,
      cardIndex: number,
    ) => {
      const base = getZoneBasePos(zone);
      let { x, y } = base;
      // Keep the first card above the zone base layer (backgrounds/overlays).
      let zIndex = baseZIndex + cardIndex + 1;
      let isHiddenUnderDeck = false;
      let fanOffset = zone.fan?.offset ?? cardDims.fanOffset;
      const fanOffsets = zone.fan?.offsets;
      let fanCenter = zone.fan?.center ?? true;
      let numCardsVisible = zone.cards?.length ?? 1;

      if (zone.fan) {
        let visualIndex = cardIndex;
        const shadowVisibleCount =
          zone.fan.shadowVisibleCount ?? zone.fan.maxVisible;

        if (zone.fan.maxVisible !== undefined) {
          numCardsVisible = Math.min(zone.fan.maxVisible, numCardsVisible);

          const startVisible = Math.max(
            0,
            totalCardsInZone - zone.fan.maxVisible,
          );
          visualIndex = Math.max(0, cardIndex - startVisible);
        }

        if (shadowVisibleCount !== undefined) {
          const startShadowVisible = Math.max(
            0,
            totalCardsInZone - shadowVisibleCount,
          );
          if (cardIndex < startShadowVisible) isHiddenUnderDeck = true;
        }

        const fanDirection = zone.fan.direction ?? "diagonal-depth";
        const getFanDistance = (index: number) =>
          fanOffsets
            ? fanOffsets
                .slice(0, Math.max(0, index))
                .reduce((sum, offset) => sum + offset, 0)
            : fanOffset * index;

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
          const fanSpanX = fanOffsets
            ? Math.abs(
                getFanDistance(
                  Math.min(numCardsVisible, fanOffsets.length + 1) - 1,
                ) * cardWidth,
              )
            : Math.abs(offsetX * (numCardsVisible - 1));
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

        x +=
          fanOffsets && (fanDirection === "left" || fanDirection === "right")
            ? (fanDirection === "left" ? -1 : 1) *
              getFanDistance(visualIndex) *
              cardWidth
            : offsetX * visualIndex;
        y += offsetY * visualIndex;
      }

      return {
        x: roundToPixel(x),
        y: roundToPixel(y),
        zIndex,
        isHiddenUnderDeck,
      };
    },
    [cardHeight, cardWidth, getZoneBasePos],
  );

  /** Where a zone's card is drawn (top-left, board coordinates), fan included. */
  const getCardPos = useCallback(
    (zone: MapZone, cardIndex: number) => {
      const { x, y } = getCardPosition(
        zone,
        zone.cards?.length ?? 1,
        zone.baseZIndex ?? 1,
        cardIndex,
      );
      return { x, y };
    },
    [getCardPosition],
  );

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
  }, [game, getCardPosition, zones]);

  // Games build a new onPress closure for each card on every render. Passing
  // those straight through would defeat AnimatedCard's memo, so each card gets
  // a stable wrapper that calls the latest handler from this render.
  const pressHandlersRef = useRef(new Map<string, () => void>());
  const stablePressHandlersRef = useRef(new Map<string, () => void>());

  const getStablePressHandler = useCallback((cardId: string) => {
    let handler = stablePressHandlersRef.current.get(cardId);
    if (!handler) {
      handler = () => {
        if (isBoardInputLocked()) return;
        pressHandlersRef.current.get(cardId)?.();
      };
      stablePressHandlersRef.current.set(cardId, handler);
    }
    return handler;
  }, []);

  const mappedCards = useMemo(
    () =>
      Object.values(cardPositions).map((mappedCard) => {
        const cardId = mappedCard.card.id;
        const mapping = cardMapper(mappedCard);

        if (mapping?.onPress) {
          pressHandlersRef.current.set(cardId, mapping.onPress);
        } else {
          pressHandlersRef.current.delete(cardId);
        }

        return (
          <AnimatedCard
            key={cardId}
            targetState={mappedCard}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize={cardSize}
            cardBackPath={cardBackPath}
            {...mapping}
            onPress={
              mapping?.onPress ? getStablePressHandler(cardId) : undefined
            }
          />
        );
      }),
    [
      cardBackPath,
      cardHeight,
      cardMapper,
      cardPositions,
      cardSize,
      cardWidth,
      getStablePressHandler,
    ],
  );

  const mapBackgrounds = useMemo(
    () => (
      <CardMapBackgrounds
        zones={zones}
        getZoneBasePos={getZoneBasePos}
        zoneMapper={zoneMapper}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
      />
    ),
    [cardHeight, cardWidth, getZoneBasePos, zoneMapper, zones],
  );

  const mapVisualizer = useMemo(
    () =>
      visualizer ? (
        <CardMapVisualizer
          zones={zones}
          getZoneStyles={getZoneStyles}
          gridStartX={gridStartX}
          gridStartY={gridStartY}
          startX={startX}
          startY={startY}
          gridWidth={gridWidth}
          gridWidthPadded={gridWidthPadded}
          gridHeight={gridHeight}
          gridHeightPadded={gridHeightPadded}
        />
      ) : null,
    [
      getZoneStyles,
      gridHeight,
      gridHeightPadded,
      gridStartX,
      gridStartY,
      gridWidth,
      gridWidthPadded,
      startX,
      startY,
      visualizer,
      zones,
    ],
  );

  const cardMap = useMemo(
    () => (
      <>
        <LoadingOverlay isLoaded={cardImagesLoaded} />
        {mapBackgrounds}
        {mappedCards}
        {mapVisualizer}
      </>
    ),
    [cardImagesLoaded, mapBackgrounds, mapVisualizer, mappedCards],
  );

  return {
    cardMap,
    getZoneStyles,
    getZoneStylesById,
    getZoneBasePos,
    getCardPos,
    cardWidth,
    cardHeight,
    cardBackPath,
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
