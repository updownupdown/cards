import {
  CardHitArea,
  createRect,
  DropHitArea,
  runTiming,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  cardDims,
  collectCards,
  createDeck,
  flipAllToBack,
  isRed,
  PlayingCard,
  RANK_VALUE,
  RANKS,
  redealWith,
  shuffle,
  StandardRank,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { useHint } from "@/hints/hint-store";
import { findClassicHint } from "@/hints/classic";

import { i18n } from "@/i18n";
const cardSize = "tableau";

type GameState = {
  foundations: PlayingCard[][];
  baseRank: StandardRank;
  reserve: PlayingCard[];
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  drawCount: 1 | 3;
};

export type CanfieldGameState = GameState;

type Selection =
  | { zone: "stock" }
  | { zone: "reserve" }
  | { zone: "waste" }
  | { zone: "tableau"; pileIndex: number; cardIndex: number }
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
  baseRank: StandardRank,
) {
  if (destination.length === 0) {
    return card.rank === baseRank;
  }

  const top = destination[destination.length - 1];
  return (
    card.suit === destination[0].suit &&
    nextRankWrap(top.rank as StandardRank) === card.rank
  );
}

function canPlaceOnTableau(card: PlayingCard, destinationTop?: PlayingCard) {
  if (!destinationTop) return true;

  return (
    isRed(card.suit) !== isRed(destinationTop.suit) &&
    nextRankWrap(card.rank as StandardRank) === destinationTop.rank
  );
}

function isValidTableauRun(cards: PlayingCard[]) {
  if (cards.length <= 1) return true;

  for (let i = 0; i < cards.length - 1; i += 1) {
    const current = cards[i];
    const next = cards[i + 1];

    if (isRed(current.suit) === isRed(next.suit)) return false;
    if (nextRankWrap(next.rank as StandardRank) !== current.rank) return false;
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
  foundations[0].push({ ...baseCard, faceUp: true });

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

/**
 * Ranks the moves on view. Getting the reserve's cards into play is what wins
 * Canfield, so its cards come before the waste's.
 */
function findCanfieldHint(state: GameState) {
  return findClassicHint(
    {
      tableau: state.tableau,
      foundations: state.foundations,
      reserves: [state.reserve, state.waste],
    },
    {
      toFoundation: (card, pile) =>
        canPlaceOnFoundation(card, pile, state.baseRank),
      toTableau: (cards, pile) => canPlaceOnTableau(cards[0], pile.at(-1)),
      canLift: (pile, index) => isValidTableauRun(pile.slice(index)),
      buildQuality: (card, base) => (canPlaceOnTableau(card, base) ? 2 : 0),
      bonus: (move) =>
        move.from.kind === "reserve" && move.from.pile === 0 ? 200 : 0,
    },
    {
      tableau: (pile) => `tableau-${pile}`,
      foundation: (pile) => `foundation-${pile}`,
    },
    {
      stock:
        state.stock.length > 0
          ? { zone: "stock", message: "draw" }
          : state.waste.length > 0
            ? { zone: "stock", message: "redeal" }
            : null,
    },
  );
}

export const canfieldRules = {
  findHint: findCanfieldHint,
  rankFromValue,
  nextRankWrap,
  popReserveTop,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  isValidTableauRun,
  fillEmptyTableauFromReserve,
  createInitialState,
};

/** The board with every card gathered face down into the stock. */
function gatherState(state: GameState): GameState {
  return {
    foundations: Array.from({ length: 4 }, () => []),
    baseRank: state.baseRank,
    reserve: [],
    tableau: Array.from({ length: 4 }, () => []),
    stock: shuffle(flipAllToBack(collectCards(state))),
    waste: [],
    drawCount: state.drawCount,
  };
}

// Starts with every card in the stock, to be dealt out from there.
const gameStateInitial = gatherState(createInitialState());

export default function Canfield() {
  const configuredDrawCount = useGameSettingValue("drawCount");

  const [selected, setSelected] = useState<Selection>(null);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetNonGameStates: () => {
      setSelected(null);
      setLastTap(null);
      clearDragGhost();
    },
    resetAndSetup: async () => {
      // Gather every card into the stock, then deal them back out.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) =>
        redealWith(createInitialState(configuredDrawCount), draft.stock),
      );
    },
  });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();

  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);
  const pendingAutoFoundationRef = useRef<{
    cardId: string;
    targetPileIndex: number;
  } | null>(null);

  const {
    hoverTarget,
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
    canDropOnTarget,
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
    getTapHandler,
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
      placeholder: { text: i18n.t("cards:tab"), showCount: true },
    }));

    const foundationZones: MapZone[] = game.foundations.map((_, pileIndex) => ({
      id: `foundation-${pileIndex}`,
      name: "foundation",
      cards: game.foundations[pileIndex] ?? [],
      pileIndex,
      col: pileIndex + 1.8,
      row: 0,
      baseZIndex: 30,
      fan: {},
      placeholder: {},
    }));

    return [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        pileIndex: 0,
        col: 0,
        row: 5,
        baseZIndex: 1,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "right",
          showCount: true,
        },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        pileIndex: 0,
        col: 0,
        row: 3.8,
        baseZIndex: 50,
        // Drawing three, the top three are fanned so the cards under the
        // playable one can be read; the label moves out of their way. The
        // first tableau column (col 1.8) limits the fan to the tightest
        // offset that still shows the suits.
        fan: {
          ...(game.drawCount === 3 && {
            direction: "right",
            offset: cardDims.tableauOffsetHorizontalSuitMin,
          }),
          maxVisible: 3,
          // Cards pushed out of the top three keep their shadows while they
          // slide under the new ones.
          shadowVisibleCount: 6,
        },
        placeholder: {
          text: i18n.t("cards:waste"),
          infoPos: game.drawCount === 3 ? "above" : "right",
          showCount: false,
        },
      },
      {
        id: "reserve",
        name: "reserve",
        cards: game.reserve,
        pileIndex: 0,
        col: 0,
        row: 0,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:reserve"),
          infoPos: "right",
          showCount: true,
        },
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

    if (mappedCard.zoneName === "reserve" && mappedCard.topOfZone) {
      return {
        selectColor: "blue",
        isSelected: selected?.zone === "reserve",
        isDisabled:
          (game.reserve[game.reserve.length - 1]?.faceUp ?? false) === false,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    if (mappedCard.zoneName === "waste") {
      return {
        selectColor: "blue",
        isSelected: mappedCard.topOfZone && selected?.zone === "waste",
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
        isSelected: isHoverTargetTop,
        isVisible: !isBeingDragged,
        animDuration,
        // Foundation cards are locked: taps go through to the zone, which
        // places the selected card.
        clickThroughCards: true,
      };
    }

    if (
      mappedCard.zoneName === "tableau" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isSelected =
        selected?.zone === "tableau" &&
        selected.pileIndex === mappedCard.pileIndex &&
        mappedCard.cardIndex >= selected.cardIndex;

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
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.pileIndex === foundationPileIndex;

      return {
        onPress: () => onFoundationPress(foundationPileIndex),
        isDisabled: !!dragGhost,
        isSelected: isHoverDropTarget,
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

  const { cardMap, getZoneBasePos, getCardPos, cardWidth, cardHeight } =
    useCardMap({
      game,
      zones,
      cardMapper,
      zoneMapper,
      cardSize,
      fixedRows: 6,
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

    const pile = source.zone === "reserve" ? game.reserve : game.waste;
    const top = getCardPos(zone, pile.length - 1);
    return createRect(top.x, top.y, cardWidth, cardHeight);
  }

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      const zoneRect = getZoneBasePos(zone);

      if (zone.name === "reserve") {
        const top = game.reserve[game.reserve.length - 1];
        if (top?.faceUp) {
          const topPos = getCardPos(zone, game.reserve.length - 1);
          areas.push({
            source: { zone: "reserve" },
            rect: createRect(topPos.x, topPos.y, cardWidth, cardHeight),
            priority: 105,
          });
        }
        return;
      }

      if (zone.name === "waste") {
        const top = game.waste[game.waste.length - 1];
        if (top) {
          const topPos = getCardPos(zone, game.waste.length - 1);
          areas.push({
            source: { zone: "waste" },
            rect: createRect(topPos.x, topPos.y, cardWidth, cardHeight),
            priority: 100,
          });
        }
        return;
      }

      // Foundation cards are locked: no drag or tap area.

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
  }, [cardHeight, cardWidth, game, getCardPos, getZoneBasePos, zones]);

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

  useHint(() => findCanfieldHint(game), {
    game,
    enabled: !isSettingUp && !won,
  });

  useLayoutEffect(() => {
    const pending = pendingAutoFoundationRef.current;
    if (!pending) return;

    const targetPile = game.foundations[pending.targetPileIndex];
    if (targetPile[targetPile.length - 1]?.id !== pending.cardId) return;

    pendingAutoFoundationRef.current = null;
    clearDragGhost();
  }, [clearDragGhost, game.foundations]);

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

    const pile = snapshot.tableau[source.pileIndex];
    const cards = pile.slice(source.cardIndex);
    if (cards.length === 0 || !cards[0].faceUp) return [];

    return cards;
  }

  function startGhostDrag(source: MoveSource) {
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
    return canPlaceOnFoundation(moving, targetPile, snapshot.baseRank);
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
    // The card lands on top of the foundation's diagonal stack.
    const targetRect = targetZone
      ? getCardPos(targetZone, game.foundations[targetPileIndex]?.length ?? 0)
      : null;
    const cards = getSourceCards(source, game);

    if (!sourceRect || !targetRect || cards.length === 0) {
      return;
    }

    startDrag(source, [cards[0]], sourceRect);

    await runTiming(dragTranslate, {
      x: targetRect.x - sourceRect.x,
      y: targetRect.y - sourceRect.y,
    });
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

    const isAutoFoundationAnimation = options?.animate && !dragGhost;
    if (isAutoFoundationAnimation) {
      await animateSourceToFoundation(source, targetPileIndex);
      const movingCard = getSourceCards(source, game)[0];
      if (movingCard) {
        justDroppedCardIds.current = new Set([movingCard.id]);
        pendingAutoFoundationRef.current = {
          cardId: movingCard.id,
          targetPileIndex,
        };
      }
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      let moving: PlayingCard | null = null;

      if (source.zone === "reserve") {
        moving = popReserveTop(draft.reserve) ?? null;
      } else if (source.zone === "waste") {
        moving = draft.waste.pop() ?? null;
      } else {
        const sourcePile = draft.tableau[source.pileIndex];
        if (source.cardIndex !== sourcePile.length - 1) return;

        moving = sourcePile.pop() ?? null;
      }

      if (!moving) return;

      const targetPile = draft.foundations[targetPileIndex];
      if (!canPlaceOnFoundation(moving, targetPile, draft.baseRank)) {
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

    // Foundations are locked: a tap only places the selected card there.
    if (!selected || selected.zone === "stock") {
      clearSelection();
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
      // Only a card that can move with the cards on it is selectable.
      if (isValidTableauRun(game.tableau[pileIndex].slice(cardIndex))) {
        setSelected({ zone: "tableau", pileIndex, cardIndex });
      }
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

  function getTapHandler(source: MoveSource) {
    if (source.zone === "reserve") {
      return onReservePress;
    }

    if (source.zone === "waste") {
      return onWastePress;
    }

    return () => onTableauCardPress(source.pileIndex, source.cardIndex);
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map((hit) => {
        const source = hit.source;
        const rect = hit.rect;

        return (
          <DragHandle
            key={
              source.zone === "reserve"
                ? "reserve"
                : source.zone === "waste"
                  ? "waste"
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
            gesture={makeHandlers(source)}
          />
        );
      }),
    [cardHitAreas],
  );

  return (
    <GameWrapper
      outcome={won ? "won" : "playing"}
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
          style={[
            pointerEventsStyles.boxNone,
            {
              ...StyleSheet.absoluteFill,
              zIndex: 3000,
              touchAction: "none",
              overscrollBehaviorX: "contain",
            },
          ]}
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
          <DragGhostCards
            ghost={dragGhost}
            translate={dragTranslate}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize={cardSize}
            isValidDrop={hoverTarget !== null}
          />
        )}
      </View>
    </GameWrapper>
  );
}
