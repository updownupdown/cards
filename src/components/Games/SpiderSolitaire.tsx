import { Text } from "@/components/common/Text";
import { useStateManager } from "@/hooks/useStateManager";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  pointInRect,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { delay } from "@/utils/utils";
import { Button } from "../Button/Button";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Card } from "../Cards/Card";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  PlayingCard,
  RANK_VALUE,
  createDeck,
  shuffle,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

const TABLEAU_FAN_OFFSET = 0.26;

type SpiderState = {
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  foundations: PlayingCard[][];
};

export type SpiderGameState = SpiderState;

type Selection = {
  zone: "tableau";
  pileIndex: number;
  cardIndex: number;
} | null;

type MoveSource = Exclude<Selection, null>;

type DropTarget = {
  zone: "tableau";
  pileIndex: number;
};

function createInitialState(): SpiderState {
  const fullDeck = shuffle(
    createDeck({
      deckCount: 2,
      faceUp: false,
    }),
  );

  return dealSpider(fullDeck);
}

function dealSpider(deckCards: PlayingCard[]): SpiderState {
  const deck = [...deckCards];

  const tableau: PlayingCard[][] = Array.from({ length: 10 }, () => []);
  let cursor = 0;

  // Deal 54 cards: first 4 piles get 6, remaining 6 piles get 5.
  for (let pileIndex = 0; pileIndex < 10; pileIndex += 1) {
    const count = pileIndex < 4 ? 6 : 5;
    for (let depth = 0; depth < count; depth += 1) {
      const baseCard = deck[cursor++];
      if (!baseCard) continue;
      tableau[pileIndex].push({
        ...baseCard,
        faceUp: depth === count - 1,
      });
    }
  }

  return {
    tableau,
    stock: deck.slice(cursor),
    foundations: Array.from({ length: 8 }, () => [] as PlayingCard[]),
  };
}

async function resetAndSetup(
  setGame: (next: SpiderState | ((draft: SpiderState) => void)) => void,
) {
  setGame((draft: SpiderState) => {
    const allCards = [
      ...draft.tableau.flat(),
      ...draft.stock,
      ...draft.foundations.flat(),
    ].map((card) => ({
      ...card,
      faceUp: false,
    }));

    draft.tableau = Array.from({ length: 10 }, () => [] as PlayingCard[]);
    draft.foundations = Array.from({ length: 8 }, () => [] as PlayingCard[]);
    draft.stock = allCards;
  });

  await delay();

  setGame((draft: SpiderState) => {
    const next = dealSpider(shuffle([...draft.stock]));
    draft.tableau = next.tableau;
    draft.stock = next.stock;
    draft.foundations = next.foundations;
  });
}

function revealLastIfNeeded(pile: PlayingCard[]) {
  if (pile.length === 0) return pile;

  const top = pile[pile.length - 1];
  if (top.faceUp) return pile;

  return [...pile.slice(0, -1), { ...top, faceUp: true }];
}

function isValidDescendingRun(cards: PlayingCard[]) {
  if (cards.length === 0) return false;
  if (cards.some((card) => !card.faceUp)) return false;

  for (let i = 0; i < cards.length - 1; i += 1) {
    const current = cards[i];
    const next = cards[i + 1];

    if (RANK_VALUE[current.rank] !== RANK_VALUE[next.rank] + 1) {
      return false;
    }
  }

  return true;
}

function isCompleteRun(cards: PlayingCard[]) {
  if (cards.length !== 13) return false;
  if (!cards.every((card) => card.faceUp)) return false;

  const suit = cards[0].suit;
  if (!cards.every((card) => card.suit === suit)) return false;
  if (cards[0].rank !== "K") return false;

  for (let i = 0; i < cards.length - 1; i += 1) {
    const current = cards[i];
    const next = cards[i + 1];

    if (RANK_VALUE[current.rank] !== RANK_VALUE[next.rank] + 1) {
      return false;
    }
  }

  return cards[cards.length - 1].rank === "A";
}

function canPlaceOnTableau(card: PlayingCard, destinationTop?: PlayingCard) {
  if (!destinationTop) {
    return true;
  }

  return RANK_VALUE[card.rank] + 1 === RANK_VALUE[destinationTop.rank];
}

function moveCompletedRunsToFoundations(
  tableau: PlayingCard[][],
  foundations: PlayingCard[][],
) {
  for (let pileIndex = 0; pileIndex < tableau.length; pileIndex += 1) {
    const pile = tableau[pileIndex];

    while (pile.length >= 13) {
      const tail = pile.slice(-13);
      if (!isCompleteRun(tail)) {
        break;
      }

      const targetFoundationIndex = foundations.findIndex(
        (foundation) => foundation.length === 0,
      );
      if (targetFoundationIndex < 0) {
        break;
      }

      pile.splice(pile.length - 13, 13);
      foundations[targetFoundationIndex] = tail.map((card) => ({
        ...card,
        faceUp: true,
      }));
    }

    tableau[pileIndex] = revealLastIfNeeded(pile);
  }
}

function canDealStock(snapshot: SpiderState) {
  return (
    snapshot.stock.length >= 10 &&
    snapshot.tableau.every((pile) => pile.length > 0)
  );
}

function dealStockRow(snapshot: SpiderState) {
  if (!canDealStock(snapshot)) return false;

  for (let pileIndex = 0; pileIndex < 10; pileIndex += 1) {
    const top = snapshot.stock.pop();
    if (!top) return false;
    snapshot.tableau[pileIndex].push({ ...top, faceUp: true });
  }

  moveCompletedRunsToFoundations(snapshot.tableau, snapshot.foundations);
  return true;
}

function isWon(snapshot: SpiderState) {
  return snapshot.foundations.every((foundation) => foundation.length === 13);
}

export const spiderRules = {
  createInitialState,
  dealSpider,
  revealLastIfNeeded,
  isValidDescendingRun,
  isCompleteRun,
  canPlaceOnTableau,
  moveCompletedRunsToFoundations,
  canDealStock,
  dealFromStock: dealStockRow,
  isWon,
};

const gameStateInitial = createInitialState();

export default function SpiderSolitaire() {
  const navigation = useNavigation();
  const [selected, setSelected] = useState<Selection>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);
  const { width: windowWidth, height: windowHeight } = useViewportDimensions();

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<SpiderState>({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected(null);
        clearDragGhost();
      },
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
    });

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
      moveSourceToTableau(source, target.pileIndex);
    },
    getDroppedCardIds: (source) =>
      getSourceCards(source, game).map((card) => card.id),
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    onHoverTargetChange: handleHoverTargetChange,
  });

  const canDeal = useMemo(() => canDealStock(game), [game]);

  const completedRuns = useMemo(
    () => game.foundations.filter((foundation) => foundation.length > 0).length,
    [game.foundations],
  );
  const won = useMemo(() => isWon(game), [game]);

  const zones: MapZone[] = useMemo(() => {
    const tableauZones: MapZone[] = game.tableau.map((pile, pileIndex) => ({
      id: `tableau-${pileIndex}`,
      name: "tableau",
      pileIndex,
      cards: pile,
      col: pileIndex,
      row: 1.6,
      baseZIndex: 10 + pileIndex,
      fan: { direction: "down", offset: TABLEAU_FAN_OFFSET, maxVisible: 104 },
      placeholder: { showCount: false, text: "Empty" },
    }));

    const foundationZones: MapZone[] = game.foundations.map(
      (pile, pileIndex) => ({
        id: `foundation-${pileIndex}`,
        name: "foundation",
        pileIndex,
        cards: pile,
        col: 2 + pileIndex,
        row: 0,
        baseZIndex: 20 + pileIndex,
        fan: { direction: "down", offset: 0.02, maxVisible: 3 },
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
        baseZIndex: 30,
        fan: { maxVisible: 3 },
        placeholder: { text: "Stock", infoPos: "below" },
      },
      ...foundationZones,
      ...tableauZones,
    ];
  }, [game.foundations, game.stock, game.tableau]);

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
        isSelected: false,
        onPress: dealFromStock,
        isDisabled: !canDeal,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    if (
      mappedCard.zoneName === "tableau" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isSelectedSource =
        selected?.zone === "tableau" &&
        selected.pileIndex === mappedCard.pileIndex &&
        mappedCard.cardIndex >= selected.cardIndex;
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "tableau" &&
        hoverTarget.pileIndex === mappedCard.pileIndex;

      return {
        selectColor: isHoverTargetTop
          ? "green"
          : isSelectedSource
            ? "blue"
            : "none",
        isSelected: isSelectedSource || isHoverTargetTop,
        isDisabled: !mappedCard.card.faceUp,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    if (mappedCard.zoneName === "foundation") {
      return {
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    return {
      isVisible: !isBeingDragged,
      animDuration,
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: dealFromStock,
        isDisabled: !canDeal,
        isSelected: false,
      };
    }

    if (zone.name === "tableau" && zone.pileIndex !== undefined) {
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "tableau" &&
        hoverTarget.pileIndex === zone.pileIndex;

      return {
        onPress: () => onEmptyTableauPress(zone.pileIndex!),
        isDisabled: !selected || !!dragGhost,
        isSelected: isHoverDropTarget && zone.cards?.length === 0,
        selectColor: isHoverDropTarget ? "green" : "blue",
      };
    }

    if (zone.name === "foundation") {
      return {
        isDisabled: true,
      };
    }

    return undefined;
  };

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    gap: 0.18,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedRows: 6,
  });

  const stockTapRect = useMemo(() => {
    const stockZone = zones.find((zone) => zone.name === "stock");
    if (!stockZone) return null;

    const pos = getZoneBasePos(stockZone);
    return createRect(pos.x, pos.y, cardWidth, cardHeight);
  }, [cardHeight, cardWidth, getZoneBasePos, zones]);

  function getSourceRect(source: MoveSource) {
    const zone = zones.find(
      (entry) =>
        entry.name === "tableau" && entry.pileIndex === source.pileIndex,
    );
    if (!zone) return null;

    const base = getZoneBasePos(zone);
    return createRect(
      base.x,
      base.y + source.cardIndex * TABLEAU_FAN_OFFSET * cardHeight,
      cardWidth,
      cardHeight,
    );
  }

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      if (zone.name !== "tableau" || zone.pileIndex === undefined) {
        return;
      }

      const zoneRect = getZoneBasePos(zone);
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
            zoneRect.y + cardIndex * TABLEAU_FAN_OFFSET * cardHeight,
            cardWidth,
            cardHeight,
          ),
          priority: 10 + cardIndex,
        });
      });
    });

    return areas;
  }, [cardHeight, cardWidth, game.tableau, getZoneBasePos, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      updateBoardOffset();
    });
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(() => {
    const areas: DropHitArea<DropTarget>[] = [];

    zones.forEach((zone) => {
      if (zone.name !== "tableau" || zone.pileIndex === undefined) {
        return;
      }

      const zoneRect = getZoneBasePos(zone);
      const pile = game.tableau[zone.pileIndex];
      const pileHeight =
        cardHeight +
        Math.max(0, pile.length - 1) * TABLEAU_FAN_OFFSET * cardHeight;

      areas.push({
        target: { zone: "tableau", pileIndex: zone.pileIndex },
        rect: createRect(
          zoneRect.x + boardPageOffset.x,
          zoneRect.y + boardPageOffset.y,
          cardWidth,
          pileHeight,
        ),
        priority: 40 + pile.length,
      });
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

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });

    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  function clearSelection() {
    setSelected(null);
  }

  function getSourceCards(source: MoveSource, snapshot: SpiderState) {
    const pile = snapshot.tableau[source.pileIndex];
    const cards = pile.slice(source.cardIndex);

    if (!isValidDescendingRun(cards)) {
      return [];
    }

    if (cards.length > 1) {
      const suit = cards[0].suit;
      if (!cards.every((card) => card.suit === suit)) {
        return [];
      }
    }

    return cards;
  }

  function startGhostDrag(source: MoveSource, _event: GestureResponderEvent) {
    const cards = getSourceCards(source, game);
    if (cards.length === 0) return;

    const rect = getSourceRect(source);
    if (!rect) return;

    startDrag(source, cards, { x: rect.x, y: rect.y });
  }

  function dealFromStock() {
    if (dragGhost) {
      clearDragGhost();
    }

    if (!canDeal) {
      clearSelection();
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      dealStockRow(draft);
    });

    clearSelection();
  }

  function moveSourceToTableau(source: MoveSource, destinationIndex: number) {
    if (
      !canDropOnTarget(source, {
        zone: "tableau",
        pileIndex: destinationIndex,
      })
    ) {
      clearSelection();
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (source.pileIndex === destinationIndex) {
        return;
      }

      const sourcePile = draft.tableau[source.pileIndex];
      const movingCards = sourcePile.slice(source.cardIndex);

      if (!isValidDescendingRun(movingCards)) {
        return;
      }

      const destinationPile = draft.tableau[destinationIndex];
      const destinationTop = destinationPile[destinationPile.length - 1];
      if (!canPlaceOnTableau(movingCards[0], destinationTop)) {
        return;
      }

      sourcePile.splice(source.cardIndex, movingCards.length);
      destinationPile.push(
        ...movingCards.map((card) => ({ ...card, faceUp: true })),
      );

      draft.tableau[source.pileIndex] = revealLastIfNeeded(sourcePile);
      draft.tableau[destinationIndex] = revealLastIfNeeded(destinationPile);
      moveCompletedRunsToFoundations(draft.tableau, draft.foundations);
    });

    clearSelection();
  }

  function onTableauCardPress(pileIndex: number, cardIndex: number) {
    if (dragGhost) {
      clearSelection();
      return;
    }

    const card = game.tableau[pileIndex]?.[cardIndex];
    if (!card?.faceUp) {
      return;
    }

    const source: MoveSource = { zone: "tableau", pileIndex, cardIndex };

    if (!selected) {
      if (getSourceCards(source, game).length > 0) {
        setSelected(source);
      }
      return;
    }

    if (selected.pileIndex === pileIndex && selected.cardIndex === cardIndex) {
      clearSelection();
      return;
    }

    if (selected.pileIndex === pileIndex) {
      if (getSourceCards(source, game).length > 0) {
        setSelected(source);
      }
      return;
    }

    moveSourceToTableau(selected, pileIndex);
  }

  function onEmptyTableauPress(pileIndex: number) {
    if (!selected || dragGhost) return;
    moveSourceToTableau(selected, pileIndex);
  }

  function sameDropTarget(a: DropTarget | null, b: DropTarget | null) {
    if (!a || !b) return a === b;
    return a.zone === b.zone && a.pileIndex === b.pileIndex;
  }

  function canDropOnTarget(
    source: MoveSource,
    target: DropTarget,
    snapshot = game,
  ) {
    if (source.pileIndex === target.pileIndex) {
      return false;
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
    return () => onTableauCardPress(source.pileIndex, source.cardIndex);
  };

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map((hit) => {
        const source = hit.source;
        const rect = hit.rect;

        return (
          <View
            key={`tableau-${source.pileIndex}-${source.cardIndex}`}
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
      outcome={won ? "won" : "playing"}
      score={completedRuns * 13}
      reset={() => {
        void reset();
      }}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        won ? "All eight K-to-A suit runs are complete." : undefined
      }
      showDeviceRotateHint
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
                onPress={dealFromStock}
                disabled={!canDeal || !!dragGhost}
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
                      top: index * TABLEAU_FAN_OFFSET * cardHeight,
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
      </View>
    </GameWrapper>
  );
}
