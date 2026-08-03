import {
  CardHitArea,
  createRect,
  DropHitArea,
  pointInRect,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { DOUBLE_TAP_MS } from "@/utils/utils";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Card } from "../Cards/Card";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  cardDims,
  CardSuit,
  createDeck,
  PlayingCard,
  RANK_VALUE,
  shuffle,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

type GameState = {
  foundations: PlayingCard[][];
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  redealsUsed: number;
};

export type FortyThievesGameState = GameState;

type Selection =
  | { zone: "stock" }
  | { zone: "waste" }
  | { zone: "tableau"; pileIndex: number; cardIndex: number }
  | { zone: "foundation"; pileIndex: number }
  | null;

type MoveSource = Exclude<Selection, null | { zone: "stock" }>;

type DropTarget =
  | { zone: "tableau"; pileIndex: number }
  | { zone: "foundation"; pileIndex: number };

function createInitialState(): GameState {
  const deck = shuffle(createDeck({ deckCount: 2, faceUp: false }));
  const tableau: PlayingCard[][] = Array.from({ length: 10 }, () => []);

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      const card = deck.shift();
      if (!card) continue;
      tableau[col].push({ ...card, faceUp: true });
    }
  }

  return {
    foundations: Array.from({ length: 8 }, () => [] as PlayingCard[]),
    tableau,
    stock: deck.map((card) => ({ ...card, faceUp: false })),
    waste: [],
    redealsUsed: 0,
  };
}

function foundationSuit(pile: PlayingCard[]) {
  return pile[pile.length - 1]?.suit ?? null;
}

function countStartedFoundationSuits(
  foundations: PlayingCard[],
  suit: CardSuit,
) {
  return foundations.filter((pileTop) => pileTop.suit === suit).length;
}

function canPlaceOnFoundation(
  card: PlayingCard,
  destination: PlayingCard[],
  startedFoundationsBySuit: PlayingCard[],
) {
  if (destination.length === 0) {
    if (card.rank !== "A") return false;
    return countStartedFoundationSuits(startedFoundationsBySuit, card.suit) < 2;
  }

  const top = destination[destination.length - 1];
  return (
    card.suit === top.suit && RANK_VALUE[card.rank] === RANK_VALUE[top.rank] + 1
  );
}

function canPlaceOnTableau(card: PlayingCard, destinationTop?: PlayingCard) {
  if (!destinationTop) return true;

  return (
    card.suit === destinationTop.suit &&
    RANK_VALUE[destinationTop.rank] === RANK_VALUE[card.rank] + 1
  );
}

function sameDropTarget(a: DropTarget | null, b: DropTarget | null) {
  if (!a || !b) return a === b;
  if (a.zone !== b.zone) return false;
  return a.pileIndex === b.pileIndex;
}

const gameStateInitial = createInitialState();

export default function FortyThieves() {
  const difficulty = useGameSettingValue("difficulty");
  const allowInfiniteRedeals = difficulty !== "difficult";

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
        setGame(createInitialState());
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
      col: pileIndex,
      row: 1.5,
      baseZIndex: 10 + pileIndex,
      fan: { direction: "down", offset: cardDims.tableauOffset },
      placeholder: { text: "Tab", showCount: true },
    }));

    const foundationZones: MapZone[] = Array.from(
      { length: 8 },
      (_, pileIndex) => ({
        id: `foundation-${pileIndex}`,
        name: "foundation",
        cards: game.foundations[pileIndex],
        pileIndex,
        col: 2 + pileIndex,
        row: 0,
        baseZIndex: 30,
        fan: { maxVisible: 1 },
        placeholder: {},
      }),
    );

    return [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        pileIndex: 0,
        col: 0,
        row: 0,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: { text: "Draw", infoPos: "below", showCount: true },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        pileIndex: 0,
        col: 1,
        row: 0,
        baseZIndex: 36,
        fan: { maxVisible: 3 },
        placeholder: { text: "Waste", infoPos: "below", showCount: true },
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

    if (mappedCard.zoneName === "waste") {
      return {
        selectColor: "blue",
        isSelected: selected?.zone === "waste",
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    if (mappedCard.zoneName === "stock" && mappedCard.topOfZone) {
      return {
        selectColor: "blue",
        isSelected: selected?.zone === "stock",
        onPress: drawFromStock,
        isDisabled: !canDrawFromStock(game, allowInfiniteRedeals),
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
      const pile = game.tableau[mappedCard.pileIndex];
      const topIndex = pile.length - 1;
      const isTopCard = mappedCard.cardIndex === topIndex;
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
        isDisabled: !isTopCard,
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
        isDisabled: !canDrawFromStock(game, allowInfiniteRedeals),
        isSelected: selected?.zone === "stock",
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
    gap: 0.14,
    cardSize: "tableau",
    fixedRows: 5,
  });

  const stockTapRect = useMemo(() => {
    const stockZone = zones.find((zone) => zone.name === "stock");
    if (!stockZone) return null;
    const pos = getZoneBasePos(stockZone);
    return createRect(pos.x, pos.y, cardWidth, cardHeight);
  }, [cardHeight, cardWidth, getZoneBasePos, zones]);

  function getSourceRect(source: MoveSource) {
    const zone = zones.find((entry) => {
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
        const topIndex = pile.length - 1;
        if (topIndex < 0) return;

        areas.push({
          source: {
            zone: "tableau",
            pileIndex: zone.pileIndex,
            cardIndex: topIndex,
          },
          rect: createRect(
            zoneRect.x,
            zoneRect.y + topIndex * cardDims.tableauOffset * cardHeight,
            cardWidth,
            cardHeight,
          ),
          priority: 10 + topIndex,
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
  const won = foundationCount === 104;

  const ended = useMemo(() => {
    if (won) return true;
    return !hasAnyLegalMove(game, allowInfiniteRedeals);
  }, [allowInfiniteRedeals, game, won]);

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
    if (source.cardIndex !== pile.length - 1) return [];
    const top = pile[pile.length - 1];
    return top ? [top] : [];
  }

  function startGhostDrag(source: MoveSource, _event: GestureResponderEvent) {
    const cards = getSourceCards(source, game);
    if (cards.length === 0) return;

    const rect = getSourceRect(source);
    if (!rect) return;

    startDrag(source, cards, { x: rect.x, y: rect.y });
  }

  function drawFromStock() {
    if (dragGhost) {
      clearDragGhost();
    }

    if (!canDrawFromStock(game, allowInfiniteRedeals)) {
      clearSelection();
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (draft.stock.length > 0) {
        const top = draft.stock.pop();
        if (top) {
          draft.waste.push({ ...top, faceUp: true });
        }
        return;
      }

      if (!allowInfiniteRedeals || draft.waste.length === 0) {
        return;
      }

      draft.stock = draft.waste
        .slice()
        .reverse()
        .map((card) => ({ ...card, faceUp: false }));
      draft.waste = [];
      draft.redealsUsed += 1;
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
    }

    const targetPile = snapshot.foundations[targetPileIndex];
    const startedFoundationsBySuit = snapshot.foundations
      .map((pile) => pile[pile.length - 1])
      .filter((card): card is PlayingCard => !!card);

    return canPlaceOnFoundation(moving, targetPile, startedFoundationsBySuit);
  }

  function moveSourceToFoundation(source: MoveSource, targetPileIndex: number) {
    if (!canMoveSourceToFoundation(source, targetPileIndex, game)) {
      clearSelection();
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      let moving: PlayingCard | null = null;

      if (source.zone === "waste") {
        moving = draft.waste[draft.waste.length - 1] ?? null;
        if (!moving) return;
        draft.waste.pop();
      } else if (source.zone === "foundation") {
        if (source.pileIndex === targetPileIndex) return;
        moving =
          draft.foundations[source.pileIndex][
            draft.foundations[source.pileIndex].length - 1
          ] ?? null;
        if (!moving) return;
        draft.foundations[source.pileIndex].pop();
      } else {
        const sourcePile = draft.tableau[source.pileIndex];
        if (source.cardIndex !== sourcePile.length - 1) return;
        moving = sourcePile[sourcePile.length - 1] ?? null;
        if (!moving) return;
        sourcePile.pop();
      }

      const targetPile = draft.foundations[targetPileIndex];
      const startedFoundationsBySuit = draft.foundations
        .map((pile) => pile[pile.length - 1])
        .filter((card): card is PlayingCard => !!card);

      if (!canPlaceOnFoundation(moving, targetPile, startedFoundationsBySuit)) {
        return;
      }

      targetPile.push({ ...moving, faceUp: true });
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
      let movingCard: PlayingCard | null = null;

      if (source.zone === "waste") {
        movingCard = draft.waste[draft.waste.length - 1] ?? null;
        if (!movingCard) return;
        draft.waste.pop();
      } else if (source.zone === "foundation") {
        const sourcePile = draft.foundations[source.pileIndex];
        movingCard = sourcePile[sourcePile.length - 1] ?? null;
        if (!movingCard) return;
        sourcePile.pop();
      } else {
        const sourcePile = draft.tableau[source.pileIndex];
        if (source.cardIndex !== sourcePile.length - 1) return;
        movingCard = sourcePile[sourcePile.length - 1] ?? null;
        if (!movingCard) return;
        sourcePile.pop();
      }

      const destinationPile = draft.tableau[destinationIndex];
      const destinationTop = destinationPile[destinationPile.length - 1];
      if (!canPlaceOnTableau(movingCard, destinationTop)) {
        return;
      }

      destinationPile.push({ ...movingCard, faceUp: true });
    });

    clearSelection();
  }

  async function tryAutoFoundation(source: MoveSource) {
    const targetPileIndex = game.foundations.findIndex((_, pileIndex) =>
      canMoveSourceToFoundation(source, pileIndex, game),
    );

    if (targetPileIndex < 0) return;
    moveSourceToFoundation(source, targetPileIndex);
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

    moveSourceToFoundation(selected, pileIndex);
  }

  function onTableauCardPress(pileIndex: number, cardIndex: number) {
    if (dragGhost) {
      clearSelection();
      return;
    }

    const pile = game.tableau[pileIndex];
    const card = pile[cardIndex];
    if (!card) return;
    if (cardIndex !== pile.length - 1) return;

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

    const destinationPile = snapshot.tableau[target.pileIndex];
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
              source.zone === "waste"
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
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      reset={() => {
        void reset();
      }}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      <View style={{ flex: 1, width: "100%", gap: 12 }}>
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
                disabled={!canDrawFromStock(game, allowInfiniteRedeals)}
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
                    cardSize="tableau"
                    selectColor={ghostHasValidDrop ? "green" : "none"}
                    isSelected={ghostHasValidDrop}
                  />
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </View>
    </GameWrapper>
  );
}

function canDrawFromStock(snapshot: GameState, allowInfiniteRedeals: boolean) {
  if (snapshot.stock.length > 0) return true;
  if (!allowInfiniteRedeals) return false;
  return snapshot.waste.length > 0;
}

function hasAnyLegalMove(snapshot: GameState, allowInfiniteRedeals: boolean) {
  const startedFoundationsBySuit = snapshot.foundations
    .map((pile) => pile[pile.length - 1])
    .filter((card): card is PlayingCard => !!card);

  const wasteTop = snapshot.waste[snapshot.waste.length - 1];
  if (wasteTop) {
    for (let i = 0; i < snapshot.foundations.length; i += 1) {
      if (
        canPlaceOnFoundation(
          wasteTop,
          snapshot.foundations[i],
          startedFoundationsBySuit,
        )
      ) {
        return true;
      }
    }

    for (let i = 0; i < snapshot.tableau.length; i += 1) {
      const top = snapshot.tableau[i][snapshot.tableau[i].length - 1];
      if (canPlaceOnTableau(wasteTop, top)) return true;
    }
  }

  for (let i = 0; i < snapshot.tableau.length; i += 1) {
    const top = snapshot.tableau[i][snapshot.tableau[i].length - 1];
    if (!top) continue;

    for (let j = 0; j < snapshot.foundations.length; j += 1) {
      if (
        canPlaceOnFoundation(
          top,
          snapshot.foundations[j],
          startedFoundationsBySuit,
        )
      ) {
        return true;
      }
    }

    for (let j = 0; j < snapshot.tableau.length; j += 1) {
      if (i === j) continue;
      const targetTop = snapshot.tableau[j][snapshot.tableau[j].length - 1];
      if (canPlaceOnTableau(top, targetTop)) {
        return true;
      }
    }
  }

  return canDrawFromStock(snapshot, allowInfiniteRedeals);
}

export const fortyThievesRules = {
  createInitialState,
  foundationSuit,
  countStartedFoundationSuits,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  canDrawFromStock,
  hasAnyLegalMove,
};
