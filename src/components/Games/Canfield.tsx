import { Text } from "@/components/common/Text";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  pointInRect,
  runTiming,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Card } from "../Cards/Card";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  cardDims,
  createDeck,
  isRed,
  PlayingCard,
  RANK_VALUE,
  RANKS,
  shuffle,
  StandardRank,
  SUITS,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { DOUBLE_TAP_MS } from "@/utils/utils";

type GameState = {
  foundations: PlayingCard[][];
  baseRank: StandardRank;
  reserve: PlayingCard[];
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  drawCount: 1 | 3;
};

type Selection =
  | { zone: "stock" }
  | { zone: "reserve" }
  | { zone: "waste" }
  | { zone: "tableau"; pileIndex: number; cardIndex: number }
  | { zone: "foundation"; pileIndex: number }
  | null;

type MoveSource = Exclude<Selection, null | { zone: "stock" }>;

type DropTarget =
  | { zone: "tableau"; pileIndex: number }
  | { zone: "foundation"; pileIndex: number };

function rankFromValue(rankValue: number): StandardRank {
  return RANKS[rankValue - 1] ?? "A";
}

function nextRankWrap(rank: StandardRank): StandardRank {
  const value = RANK_VALUE[rank];
  const next = value === 13 ? 1 : value + 1;
  return rankFromValue(next);
}

function popReserveTop(reserve: PlayingCard[]) {
  const card = reserve.pop();
  const top = reserve[reserve.length - 1];
  if (top && !top.faceUp) {
    reserve[reserve.length - 1] = { ...top, faceUp: true };
  }
  return card;
}

function canPlaceOnFoundation(
  card: PlayingCard,
  destination: PlayingCard[],
  foundationSuit: PlayingCard["suit"],
  baseRank: StandardRank,
) {
  if (card.suit !== foundationSuit) return false;

  if (destination.length === 0) {
    return card.rank === baseRank;
  }

  const top = destination[destination.length - 1];
  return nextRankWrap(top.rank as StandardRank) === card.rank;
}

function canPlaceOnTableau(card: PlayingCard, destinationTop?: PlayingCard) {
  if (!destinationTop) return true;

  return (
    isRed(card.suit) !== isRed(destinationTop.suit) &&
    RANK_VALUE[card.rank] + 1 === RANK_VALUE[destinationTop.rank]
  );
}

function isValidTableauRun(cards: PlayingCard[]) {
  if (cards.length <= 1) return true;

  for (let i = 0; i < cards.length - 1; i += 1) {
    const current = cards[i];
    const next = cards[i + 1];

    if (isRed(current.suit) === isRed(next.suit)) return false;
    if (RANK_VALUE[current.rank] !== RANK_VALUE[next.rank] + 1) return false;
  }

  return true;
}

function fillEmptyTableauFromReserve(snapshot: GameState) {
  for (let i = 0; i < snapshot.tableau.length; i += 1) {
    if (snapshot.tableau[i].length > 0 || snapshot.reserve.length === 0) {
      continue;
    }

    const reserveTop = popReserveTop(snapshot.reserve);
    if (!reserveTop) continue;
    snapshot.tableau[i].push({ ...reserveTop, faceUp: true });
  }
}

function createInitialState(drawCount: 1 | 3 = 1): GameState {
  const deck = shuffle(createDeck({ faceUp: false }));

  const reserve = deck.splice(0, 13).map((card, index, all) => ({
    ...card,
    faceUp: index === all.length - 1,
  }));

  const foundations = Array.from({ length: 4 }, () => [] as PlayingCard[]);
  const baseCard = deck.shift();

  if (!baseCard) {
    return {
      foundations,
      baseRank: "A",
      reserve,
      tableau: Array.from({ length: 4 }, () => [] as PlayingCard[]),
      stock: [],
      waste: [],
      drawCount,
    };
  }

  const baseRank = baseCard.rank as StandardRank;
  const foundationIndex = SUITS.indexOf(baseCard.suit);
  foundations[Math.max(0, foundationIndex)].push({ ...baseCard, faceUp: true });

  const tableau = Array.from({ length: 4 }, () => [] as PlayingCard[]);
  for (let i = 0; i < 4; i += 1) {
    const card = deck.shift();
    if (!card) continue;
    tableau[i].push({ ...card, faceUp: true });
  }

  const stock = deck.map((card) => ({ ...card, faceUp: false }));

  return {
    foundations,
    baseRank,
    reserve,
    tableau,
    stock,
    waste: [],
    drawCount,
  };
}

function sameDropTarget(a: DropTarget | null, b: DropTarget | null) {
  if (!a || !b) return a === b;
  if (a.zone !== b.zone) return false;
  return a.pileIndex === b.pileIndex;
}

const gameStateInitial = createInitialState();

export default function Canfield() {
  const configuredDrawCount = useGameSettingValue("drawCount");

  const navigation = useNavigation();
  const [selected, setSelected] = useState<Selection>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected(null);
        setLastTap(null);
        clearDragGhost();
      },
      resetAndSetup: async () => {
        setGame(createInitialState(configuredDrawCount));
      },
    });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();

  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);

  const handleHoverTargetChange = useCallback((next: DropTarget | null) => {
    setHoverTarget((prev) => (sameDropTarget(prev, next) ? prev : next));
  }, []);

  const {
    dragGhost,
    draggedCardIds,
    justDroppedCardIds,
    dragTranslate,
    boardRef,
    boardPageOffset,
    clearDragGhost,
    startDrag,
    updateBoardOffset,
    makeDragHandlers,
  } = useDragDrop<MoveSource, DropTarget>({
    findDropTarget: (pageX, pageY) => {
      const hit = [...dropHitAreasRef.current]
        .filter(({ rect }) => pointInRect(pageX, pageY, rect))
        .sort((a, b) => b.priority - a.priority)[0];
      return hit?.target ?? null;
    },
    canDropOnTarget,
    sameTarget: sameDropTarget,
    onSuccessfulDrop: async (source, target) => {
      if (target.zone === "foundation") {
        await moveSourceToFoundation(source, target.pileIndex);
      } else {
        moveSourceToTableau(source, target.pileIndex);
      }
    },
    getDroppedCardIds: (source) =>
      getSourceCards(source, game).map((c) => c.id),
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    onHoverTargetChange: handleHoverTargetChange,
  });

  const wasteTop = game.waste[game.waste.length - 1];

  const zones: MapZone[] = useMemo(() => {
    const tableauZones: MapZone[] = game.tableau.map((pile, pileIndex) => ({
      id: `tableau-${pileIndex}`,
      name: "tableau",
      pileIndex,
      cards: pile,
      col: pileIndex + 1.8,
      row: 1.6,
      baseZIndex: 12 + pileIndex,
      fan: { direction: "down", offset: cardDims.tableauOffset },
      placeholder: { text: "Tab", showCount: true },
    }));

    const foundationZones: MapZone[] = SUITS.map((suit, pileIndex) => ({
      id: `foundation-${pileIndex}`,
      name: "foundation",
      cards: game.foundations[pileIndex] ?? [],
      pileIndex,
      col: pileIndex + 1.8,
      row: 0,
      baseZIndex: 30,
      fan: {},
      placeholder: {
        text: suit,
        infoPos: "below",
        showCount: false,
      },
    }));

    return [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        pileIndex: 0,
        col: 0,
        row: 0,
        baseZIndex: 20,
        fan: { maxVisible: 3 },
        placeholder: { text: "Draw", infoPos: "right", showCount: true },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        pileIndex: 0,
        col: 0,
        row: 1,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: { text: "Waste", infoPos: "right", showCount: true },
      },
      {
        id: "reserve",
        name: "reserve",
        cards: game.reserve,
        pileIndex: 0,
        col: 0,
        row: 2.5,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: { text: "Res", infoPos: "right", showCount: true },
      },
      ...foundationZones,
      ...tableauZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const animDuration =
      justDroppedCardIds.current?.has(mappedCard.card.id) === true
        ? 0
        : undefined;

    if (mappedCard.zoneName === "stock" && mappedCard.topOfZone) {
      return {
        selectColor: "blue",
        isSelected: selected?.zone === "stock",
        onPress: drawFromStock,
        isDisabled: game.stock.length === 0 && game.waste.length === 0,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    // if (mappedCard.zoneName === "reserve" && mappedCard.topOfZone) {
    //   const isHoverTargetTop =
    //     !!dragGhost &&
    //     hoverTarget?.zone === "tableau" &&
    //     hoverTarget.pileIndex >= 0;

    //   return {
    //     selectColor: isHoverTargetTop ? "green" : "blue",
    //     isSelected: selected?.zone === "reserve" || isHoverTargetTop,
    //     isDisabled:
    //       (game.reserve[game.reserve.length - 1]?.faceUp ?? false) === false,
    //     isVisible: !isBeingDragged,
    //     animDuration,
    //   };
    // }

    if (mappedCard.zoneName === "waste") {
      return {
        selectColor: "blue",
        isSelected: selected?.zone === "waste",
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    if (
      mappedCard.zoneName === "foundation" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.pileIndex === mappedCard.pileIndex;

      return {
        selectColor: "green",
        isSelected:
          (selected?.zone === "foundation" &&
            selected.pileIndex === mappedCard.pileIndex) ||
          isHoverTargetTop,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    if (
      mappedCard.zoneName === "tableau" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isSelected =
        selected?.zone === "tableau" &&
        selected.pileIndex === mappedCard.pileIndex &&
        selected.cardIndex === mappedCard.cardIndex;

      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "tableau" &&
        hoverTarget.pileIndex === mappedCard.pileIndex;

      return {
        selectColor: isHoverTargetTop ? "green" : isSelected ? "blue" : "none",
        isSelected: isSelected || isHoverTargetTop,
        isDisabled: !mappedCard.card.faceUp,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    return undefined;
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: drawFromStock,
        isDisabled: game.stock.length === 0 && game.waste.length === 0,
        isSelected: selected?.zone === "stock",
      };
    }

    if (zone.name === "reserve") {
      return {
        onPress: onReservePress,
        isDisabled: game.reserve.length === 0 || !!dragGhost,
        isSelected: selected?.zone === "reserve",
      };
    }

    if (zone.name === "waste") {
      return {
        onPress: onWastePress,
        isDisabled: !wasteTop || !!dragGhost,
        isSelected: selected?.zone === "waste",
      };
    }

    if (zone.name === "foundation" && zone.pileIndex !== undefined) {
      const foundationPileIndex = zone.pileIndex;
      const selectedFoundation =
        selected?.zone === "foundation" &&
        selected.pileIndex === foundationPileIndex;
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.pileIndex === foundationPileIndex;

      return {
        onPress: () => onFoundationPress(foundationPileIndex),
        isDisabled: !!dragGhost,
        isSelected: selectedFoundation || isHoverDropTarget,
        selectColor: isHoverDropTarget ? "green" : "blue",
      };
    }

    if (zone.name === "tableau" && zone.pileIndex !== undefined) {
      const isSelected =
        selected?.zone === "tableau" && selected.pileIndex === zone.pileIndex;
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "tableau" &&
        hoverTarget.pileIndex === zone.pileIndex;

      return {
        onPress: () => onEmptyTableauPress(zone.pileIndex!),
        isDisabled: !selected || !!dragGhost,
        isSelected:
          isSelected || (isHoverDropTarget && zone.cards?.length === 0),
        selectColor: isHoverDropTarget ? "green" : "blue",
      };
    }

    return undefined;
  };

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedRows: 6,
    // visualizer: true,
  });

  const stockTapRect = useMemo(() => {
    const stockZone = zones.find((zone) => zone.name === "stock");
    if (!stockZone) return null;
    const pos = getZoneBasePos(stockZone);
    return createRect(pos.x, pos.y, cardWidth, cardHeight);
  }, [cardHeight, cardWidth, getZoneBasePos, zones]);

  function getSourceRect(source: MoveSource) {
    const zone = zones.find((entry) => {
      if (source.zone === "reserve") return entry.name === "reserve";
      if (source.zone === "waste") return entry.name === "waste";
      if (source.zone === "foundation") {
        return (
          entry.name === "foundation" && entry.pileIndex === source.pileIndex
        );
      }
      return entry.name === "tableau" && entry.pileIndex === source.pileIndex;
    });

    if (!zone) return null;

    const base = getZoneBasePos(zone);

    if (source.zone === "tableau") {
      return createRect(
        base.x,
        base.y + source.cardIndex * cardDims.tableauOffset * cardHeight,
        cardWidth,
        cardHeight,
      );
    }

    return createRect(base.x, base.y, cardWidth, cardHeight);
  }

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      const zoneRect = getZoneBasePos(zone);

      if (zone.name === "reserve") {
        const top = game.reserve[game.reserve.length - 1];
        if (top?.faceUp) {
          areas.push({
            source: { zone: "reserve" },
            rect: createRect(zoneRect.x, zoneRect.y, cardWidth, cardHeight),
            priority: 105,
          });
        }
        return;
      }

      if (zone.name === "waste") {
        const top = game.waste[game.waste.length - 1];
        if (top) {
          areas.push({
            source: { zone: "waste" },
            rect: createRect(zoneRect.x, zoneRect.y, cardWidth, cardHeight),
            priority: 100,
          });
        }
        return;
      }

      if (zone.name === "foundation" && zone.pileIndex !== undefined) {
        const top =
          game.foundations[zone.pileIndex][
            game.foundations[zone.pileIndex].length - 1
          ];
        if (top) {
          areas.push({
            source: { zone: "foundation", pileIndex: zone.pileIndex },
            rect: createRect(zoneRect.x, zoneRect.y, cardWidth, cardHeight),
            priority: 90,
          });
        }
        return;
      }

      if (zone.name === "tableau" && zone.pileIndex !== undefined) {
        const pile = game.tableau[zone.pileIndex];

        pile.forEach((card, cardIndex) => {
          if (!card.faceUp) return;

          areas.push({
            source: {
              zone: "tableau",
              pileIndex: zone.pileIndex!,
              cardIndex,
            },
            rect: createRect(
              zoneRect.x,
              zoneRect.y + cardIndex * cardDims.tableauOffset * cardHeight,
              cardWidth,
              cardHeight,
            ),
            priority: 10 + cardIndex,
          });
        });
      }
    });

    return areas;
  }, [cardHeight, cardWidth, game, getZoneBasePos, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      updateBoardOffset();
    });
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(() => {
    const areas: DropHitArea<DropTarget>[] = [];

    zones.forEach((zone) => {
      const zoneRect = getZoneBasePos(zone);

      if (zone.name === "foundation" && zone.pileIndex !== undefined) {
        areas.push({
          target: { zone: "foundation", pileIndex: zone.pileIndex },
          rect: createRect(
            zoneRect.x + boardPageOffset.x,
            zoneRect.y + boardPageOffset.y,
            cardWidth,
            cardHeight,
          ),
          priority: 90,
        });
        return;
      }

      if (zone.name === "tableau" && zone.pileIndex !== undefined) {
        const pile = game.tableau[zone.pileIndex];
        const pileHeight =
          cardHeight +
          Math.max(0, pile.length - 1) * cardDims.tableauOffset * cardHeight;

        areas.push({
          target: { zone: "tableau", pileIndex: zone.pileIndex },
          rect: createRect(
            zoneRect.x + boardPageOffset.x,
            zoneRect.y + boardPageOffset.y,
            cardWidth,
            pileHeight,
          ),
          priority: 50 + pile.length,
        });
      }
    });

    return areas;
  }, [
    boardPageOffset.x,
    boardPageOffset.y,
    cardHeight,
    cardWidth,
    game.tableau,
    getZoneBasePos,
    zones,
  ]);

  dropHitAreasRef.current = dropHitAreas;

  const foundationCount = useMemo(
    () => game.foundations.reduce((sum, pile) => sum + pile.length, 0),
    [game.foundations],
  );
  const won = foundationCount === 52;

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  function clearSelection() {
    setSelected(null);
  }

  function getSourceCards(source: MoveSource, snapshot: GameState) {
    if (source.zone === "reserve") {
      const top = snapshot.reserve[snapshot.reserve.length - 1];
      return top?.faceUp ? [top] : [];
    }

    if (source.zone === "waste") {
      const top = snapshot.waste[snapshot.waste.length - 1];
      return top ? [top] : [];
    }

    if (source.zone === "foundation") {
      const top =
        snapshot.foundations[source.pileIndex][
          snapshot.foundations[source.pileIndex].length - 1
        ];
      return top ? [top] : [];
    }

    const pile = snapshot.tableau[source.pileIndex];
    const cards = pile.slice(source.cardIndex);
    if (cards.length === 0 || !cards[0].faceUp) return [];

    return cards;
  }

  function startGhostDrag(source: MoveSource, _event: GestureResponderEvent) {
    const cards = getSourceCards(source, game);
    if (cards.length === 0) return;

    if (source.zone === "tableau" && !isValidTableauRun(cards)) {
      return;
    }

    const rect = getSourceRect(source);
    if (!rect) return;

    startDrag(source, cards, { x: rect.x, y: rect.y });
  }

  function drawFromStock() {
    if (dragGhost) {
      clearDragGhost();
    }

    if (game.stock.length === 0 && game.waste.length === 0) {
      clearSelection();
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (draft.stock.length === 0 && draft.waste.length > 0) {
        draft.stock = draft.waste
          .slice()
          .reverse()
          .map((card) => ({ ...card, faceUp: false }));
        draft.waste = [];
      }

      const drawTotal = Math.min(draft.drawCount, draft.stock.length);
      for (let i = 0; i < drawTotal; i += 1) {
        const next = draft.stock.pop();
        if (!next) break;
        draft.waste.push({ ...next, faceUp: true });
      }
    });

    clearSelection();
  }

  function canMoveSourceToFoundation(
    source: MoveSource,
    targetPileIndex: number,
    snapshot: GameState,
  ) {
    const movingCards = getSourceCards(source, snapshot);
    if (movingCards.length !== 1) return false;

    const moving = movingCards[0];

    if (source.zone === "tableau") {
      const pile = snapshot.tableau[source.pileIndex];
      if (source.cardIndex !== pile.length - 1) return false;
      if (!moving.faceUp) return false;
    }

    const targetPile = snapshot.foundations[targetPileIndex];
    return canPlaceOnFoundation(
      moving,
      targetPile,
      SUITS[targetPileIndex],
      snapshot.baseRank,
    );
  }

  async function animateSourceToFoundation(
    source: MoveSource,
    targetPileIndex: number,
  ) {
    const sourceRect = getSourceRect(source);
    const targetZone = zones.find(
      (entry) =>
        entry.name === "foundation" && entry.pileIndex === targetPileIndex,
    );
    const targetRect = targetZone ? getZoneBasePos(targetZone) : null;
    const cards = getSourceCards(source, game);

    if (!sourceRect || !targetRect || cards.length === 0) {
      return;
    }

    startDrag(source, [cards[0]], sourceRect);

    await runTiming(dragTranslate, {
      x: targetRect.x - sourceRect.x,
      y: targetRect.y - sourceRect.y,
    });

    clearDragGhost();
  }

  async function moveSourceToFoundation(
    source: MoveSource,
    targetPileIndex: number,
    options?: { animate?: boolean },
  ) {
    if (!canMoveSourceToFoundation(source, targetPileIndex, game)) {
      clearSelection();
      return;
    }

    if (options?.animate && !dragGhost) {
      await animateSourceToFoundation(source, targetPileIndex);
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      let moving: PlayingCard | null = null;

      if (source.zone === "reserve") {
        moving = popReserveTop(draft.reserve) ?? null;
      } else if (source.zone === "waste") {
        moving = draft.waste.pop() ?? null;
      } else if (source.zone === "foundation") {
        if (source.pileIndex === targetPileIndex) return;
        moving = draft.foundations[source.pileIndex].pop() ?? null;
      } else {
        const sourcePile = draft.tableau[source.pileIndex];
        if (source.cardIndex !== sourcePile.length - 1) return;

        moving = sourcePile.pop() ?? null;
      }

      if (!moving) return;

      const targetPile = draft.foundations[targetPileIndex];
      if (
        !canPlaceOnFoundation(
          moving,
          targetPile,
          SUITS[targetPileIndex],
          draft.baseRank,
        )
      ) {
        return;
      }

      targetPile.push({ ...moving, faceUp: true });
      fillEmptyTableauFromReserve(draft);
    });

    clearSelection();
  }

  function moveSourceToTableau(source: MoveSource, destinationIndex: number) {
    if (
      !canDropOnTarget(source, { zone: "tableau", pileIndex: destinationIndex })
    ) {
      clearSelection();
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      let movingCards: PlayingCard[] = [];

      if (source.zone === "reserve") {
        const top = popReserveTop(draft.reserve);
        if (!top) return;
        movingCards = [{ ...top, faceUp: true }];
      } else if (source.zone === "waste") {
        const top = draft.waste.pop();
        if (!top) return;
        movingCards = [top];
      } else if (source.zone === "foundation") {
        const sourcePile = draft.foundations[source.pileIndex];
        const top = sourcePile.pop();
        if (!top) return;
        movingCards = [top];
      } else {
        const sourcePile = draft.tableau[source.pileIndex];
        movingCards = sourcePile.slice(source.cardIndex);

        if (movingCards.length === 0 || !movingCards[0].faceUp) {
          return;
        }

        if (!isValidTableauRun(movingCards)) {
          return;
        }

        if (source.pileIndex === destinationIndex) {
          return;
        }

        draft.tableau[source.pileIndex] = sourcePile.slice(0, source.cardIndex);
      }

      const destinationPile = draft.tableau[destinationIndex];
      const destinationTop = destinationPile[destinationPile.length - 1];

      if (destinationPile.length === 0 && draft.reserve.length > 0) {
        return;
      }

      if (!canPlaceOnTableau(movingCards[0], destinationTop)) {
        return;
      }

      destinationPile.push(
        ...movingCards.map((card) => ({ ...card, faceUp: true })),
      );

      fillEmptyTableauFromReserve(draft);
    });

    clearSelection();
  }

  async function tryAutoFoundation(source: MoveSource) {
    const targetPileIndex = game.foundations.findIndex((_, pileIndex) =>
      canMoveSourceToFoundation(source, pileIndex, game),
    );

    if (targetPileIndex < 0) return;
    await moveSourceToFoundation(source, targetPileIndex, { animate: true });
  }

  function onReservePress() {
    if (game.reserve.length === 0 || dragGhost) {
      clearSelection();
      return;
    }

    const top = game.reserve[game.reserve.length - 1];
    if (!top?.faceUp) {
      clearSelection();
      return;
    }

    const now = Date.now();
    if (lastTap?.key === "reserve" && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      void tryAutoFoundation({ zone: "reserve" });
      return;
    }

    setLastTap({ key: "reserve", at: now });

    if (!selected) {
      setSelected({ zone: "reserve" });
      return;
    }

    clearSelection();
  }

  function onWastePress() {
    if (!wasteTop || dragGhost) {
      clearSelection();
      return;
    }

    const now = Date.now();
    if (lastTap?.key === "waste" && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      void tryAutoFoundation({ zone: "waste" });
      return;
    }

    setLastTap({ key: "waste", at: now });

    if (!selected) {
      setSelected({ zone: "waste" });
      return;
    }

    clearSelection();
  }

  function onFoundationPress(pileIndex: number) {
    if (dragGhost) {
      clearSelection();
      return;
    }

    const now = Date.now();
    const tapKey = `foundation-${pileIndex}`;

    if (lastTap?.key === tapKey && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      void tryAutoFoundation({ zone: "foundation", pileIndex });
      return;
    }

    setLastTap({ key: tapKey, at: now });

    if (selected?.zone === "stock") {
      clearSelection();
      return;
    }

    if (!selected) {
      const pile = game.foundations[pileIndex];
      if (pile.length > 0) {
        setSelected({ zone: "foundation", pileIndex });
      }
      return;
    }

    void moveSourceToFoundation(selected, pileIndex, { animate: true });
  }

  function onTableauCardPress(pileIndex: number, cardIndex: number) {
    if (dragGhost) {
      clearSelection();
      return;
    }

    const card = game.tableau[pileIndex][cardIndex];
    if (!card?.faceUp) return;

    const now = Date.now();
    const tapKey = `tableau-${pileIndex}-${cardIndex}`;

    if (lastTap?.key === tapKey && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      void tryAutoFoundation({ zone: "tableau", pileIndex, cardIndex });
      return;
    }

    setLastTap({ key: tapKey, at: now });

    if (selected?.zone === "stock") {
      clearSelection();
      return;
    }

    if (!selected) {
      setSelected({ zone: "tableau", pileIndex, cardIndex });
      return;
    }

    moveSourceToTableau(selected, pileIndex);
  }

  function onEmptyTableauPress(pileIndex: number) {
    if (selected?.zone === "stock") {
      clearSelection();
      return;
    }

    if (!selected || dragGhost) return;
    moveSourceToTableau(selected, pileIndex);
  }

  function canDropOnTarget(
    source: MoveSource,
    target: DropTarget,
    snapshot = game,
  ) {
    if (target.zone === "foundation") {
      return canMoveSourceToFoundation(source, target.pileIndex, snapshot);
    }

    const movingCards = getSourceCards(source, snapshot);
    if (movingCards.length === 0) return false;

    if (source.zone === "tableau" && !isValidTableauRun(movingCards)) {
      return false;
    }

    if (source.zone === "tableau" && source.pileIndex === target.pileIndex) {
      return false;
    }

    const destinationPile = snapshot.tableau[target.pileIndex];
    if (destinationPile.length === 0 && snapshot.reserve.length > 0) {
      return false;
    }

    const destinationTop = destinationPile[destinationPile.length - 1];
    return canPlaceOnTableau(movingCards[0], destinationTop);
  }

  function makeHandlers(source: MoveSource, onTap?: () => void) {
    return makeDragHandlers(source, startGhostDrag, onTap);
  }

  const ghostLeft = dragGhost ? dragGhost.origin.x : 0;
  const ghostTop = dragGhost ? dragGhost.origin.y : 0;
  const ghostHasValidDrop = !!dragGhost && hoverTarget !== null;

  const tapHandlerResolverRef = useRef(
    (_source: MoveSource): (() => void) =>
      () => {},
  );
  tapHandlerResolverRef.current = (source: MoveSource) => {
    if (source.zone === "reserve") {
      return onReservePress;
    }

    if (source.zone === "waste") {
      return onWastePress;
    }

    if (source.zone === "foundation") {
      return () => onFoundationPress(source.pileIndex);
    }

    return () => onTableauCardPress(source.pileIndex, source.cardIndex);
  };

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map((hit) => {
        const source = hit.source;
        const rect = hit.rect;

        return (
          <View
            key={
              source.zone === "reserve"
                ? "reserve"
                : source.zone === "waste"
                  ? "waste"
                  : source.zone === "foundation"
                    ? `foundation-${source.pileIndex}`
                    : `tableau-${source.pileIndex}-${source.cardIndex}`
            }
            collapsable={false}
            style={{
              position: "absolute",
              backgroundColor: "transparent",
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
            {...makeHandlers(source, () =>
              tapHandlerResolverRef.current(source)(),
            )}
          />
        );
      }),
    [cardHitAreas],
  );

  return (
    <GameWrapper
      ended={won}
      won={won}
      reset={() => {
        void reset();
      }}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      <View
        ref={boardRef}
        style={{
          flex: 1,
          width: "100%",
          position: "relative",
          touchAction: "none",
          overscrollBehaviorX: "contain",
        }}
      >
        {cardMap}

        <View
          style={{
            ...StyleSheet.absoluteFill,
            zIndex: 3000,
            touchAction: "none",
            overscrollBehaviorX: "contain",
            pointerEvents: "box-none",
          }}
        >
          {stockTapRect && (
            <Pressable
              style={{
                position: "absolute",
                backgroundColor: "transparent",
                left: stockTapRect.x,
                top: stockTapRect.y,
                width: stockTapRect.width,
                height: stockTapRect.height,
              }}
              onPress={drawFromStock}
              disabled={game.stock.length === 0 && game.waste.length === 0}
            />
          )}
          {interactionTargets}
        </View>

        {dragGhost && (
          <Animated.View
            style={[
              {
                pointerEvents: "none",
                position: "absolute",
                zIndex: 4000,
                left: ghostLeft,
                top: ghostTop,
                transform: dragTranslate.getTranslateTransform(),
              },
            ]}
          >
            {dragGhost.cards.map((card, index) => (
              <View
                key={`ghost-${card.id}`}
                style={[
                  {
                    position: "absolute",
                    left: 0,
                    opacity: 1,
                    width: cardWidth,
                    height: cardHeight,
                  },
                  {
                    top: index * cardDims.tableauOffset * cardHeight,
                    zIndex: index + 1,
                  },
                ]}
              >
                <Card
                  card={card}
                  cardWidth={cardWidth}
                  cardSize="small"
                  selectColor={ghostHasValidDrop ? "green" : "none"}
                  isSelected={ghostHasValidDrop}
                />
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </GameWrapper>
  );
}
