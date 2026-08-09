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
import { delay } from "@/utils/utils";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { Animated, StyleSheet, View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Card } from "../Cards/Card";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  PlayingCard,
  shuffle,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

const TABLEAU_COUNT = 5;
const HAND_COUNT = 4;
const NUMBER_RANKS = new Set(["A", "2", "3", "4", "5", "6", "7", "8"]);

export type JacksDreamGameState = {
  tableau: PlayingCard[][];
  hand: (PlayingCard | null)[];
  discard: PlayingCard[];
};

export type JacksDreamMoveSource =
  | { zone: "hand"; pileIndex: number }
  | { zone: "tableau"; pileIndex: number; cardIndex: number };

type DropTarget = { zone: "tableau"; pileIndex: number };

function isNumberCard(card: PlayingCard) {
  return NUMBER_RANKS.has(card.rank);
}

function isPillow(card: PlayingCard) {
  return isNumberCard(card) && !card.faceUp;
}

function createInitialState(): JacksDreamGameState {
  const discard = shuffle(
    createDeck({ faceUp: false }).filter(
      (card) => isNumberCard(card) || card.rank === "J",
    ),
  );

  return {
    tableau: Array.from({ length: TABLEAU_COUNT }, () => []),
    hand: Array.from({ length: HAND_COUNT }, () => null),
    discard,
  };
}

function dealCards(cards: PlayingCard[]): JacksDreamGameState {
  const numberCards = cards
    .filter(isNumberCard)
    .map((card) => ({ ...card, faceUp: true }));
  const jacks = cards
    .filter((card) => card.rank === "J")
    .map((card) => ({ ...card, faceUp: true }));
  const tableau = Array.from(
    { length: TABLEAU_COUNT },
    () => [] as PlayingCard[],
  );

  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < TABLEAU_COUNT; column += 1) {
      const card = numberCards.pop();
      if (card) tableau[column].push(card);
    }
  }

  const firstExtra = numberCards.pop();
  const lastExtra = numberCards.pop();
  if (firstExtra) tableau[0].push(firstExtra);
  if (lastExtra) tableau[TABLEAU_COUNT - 1].push(lastExtra);

  return {
    tableau,
    hand: Array.from(
      { length: HAND_COUNT },
      (_, index) => jacks[index] ?? null,
    ),
    discard: [],
  };
}

function getSourceCards(
  source: JacksDreamMoveSource,
  snapshot: JacksDreamGameState,
) {
  if (source.zone === "hand") {
    const card = snapshot.hand[source.pileIndex];
    return card ? [card] : [];
  }

  const pile = snapshot.tableau[source.pileIndex];
  const card = pile[source.cardIndex];
  if (!card) return [];

  if (card.rank === "J" || isPillow(card)) {
    return source.cardIndex === pile.length - 1 ? [card] : [];
  }

  const cards = pile.slice(source.cardIndex);
  if (
    cards.length === 0 ||
    cards.some(
      (entry) =>
        !entry.faceUp || !isNumberCard(entry) || entry.rank !== card.rank,
    )
  ) {
    return [];
  }

  return cards;
}

function canPlaceJack(destination: PlayingCard[], hardMode: boolean) {
  if (hardMode) {
    return destination.every((card) => card.rank !== "J");
  }

  for (let index = destination.length - 1; index >= 0; index -= 1) {
    const card = destination[index];
    if (isPillow(card)) return true;
    if (card.rank === "J") return false;
  }

  return true;
}

function canMoveCardsToPile(
  movingCards: PlayingCard[],
  destination: PlayingCard[],
  hardMode: boolean,
) {
  if (movingCards.length === 0) return false;

  const moving = movingCards[0];
  const destinationTop = destination[destination.length - 1];

  if (moving.rank === "J") {
    return movingCards.length === 1 && canPlaceJack(destination, hardMode);
  }

  if (isPillow(moving)) {
    return (
      movingCards.length === 1 &&
      (!destinationTop || destinationTop.rank === "J")
    );
  }

  if (
    movingCards.some(
      (card) =>
        !card.faceUp || !isNumberCard(card) || card.rank !== moving.rank,
    )
  ) {
    return false;
  }

  if (!destinationTop || destinationTop.rank === "J") return true;
  return destinationTop.faceUp && destinationTop.rank === moving.rank;
}

function collapseCompletedPile(pile: PlayingCard[], discard: PlayingCard[]) {
  if (pile.length < 4) return false;

  const completed = pile.slice(-4);
  const rank = completed[0].rank;
  if (
    !completed.every(
      (card) => card.faceUp && isNumberCard(card) && card.rank === rank,
    )
  ) {
    return false;
  }

  pile.splice(-4, 4);
  pile.push({ ...completed[0], faceUp: false });
  discard.push(
    ...completed.slice(1).map((card) => ({ ...card, faceUp: false })),
  );
  return true;
}

function canMove(
  source: JacksDreamMoveSource,
  destinationIndex: number,
  snapshot: JacksDreamGameState,
  hardMode: boolean,
) {
  if (source.zone === "tableau" && source.pileIndex === destinationIndex) {
    return false;
  }

  return canMoveCardsToPile(
    getSourceCards(source, snapshot),
    snapshot.tableau[destinationIndex],
    hardMode,
  );
}

function moveCards(
  source: JacksDreamMoveSource,
  destinationIndex: number,
  snapshot: JacksDreamGameState,
  hardMode: boolean,
) {
  if (!canMove(source, destinationIndex, snapshot, hardMode)) return false;

  let movingCards: PlayingCard[];
  if (source.zone === "hand") {
    const card = snapshot.hand[source.pileIndex];
    if (!card) return false;
    snapshot.hand[source.pileIndex] = null;
    movingCards = [card];
  } else {
    movingCards = snapshot.tableau[source.pileIndex].splice(source.cardIndex);
  }

  const destination = snapshot.tableau[destinationIndex];
  destination.push(...movingCards);
  collapseCompletedPile(destination, snapshot.discard);
  return true;
}

function isWinningState(snapshot: JacksDreamGameState) {
  if (snapshot.hand.some(Boolean)) return false;

  const completedColumns = snapshot.tableau.filter(
    (pile) =>
      pile.length === 3 &&
      isPillow(pile[0]) &&
      pile[1].rank === "J" &&
      isPillow(pile[2]),
  );
  const emptyColumns = snapshot.tableau.filter((pile) => pile.length === 0);

  return completedColumns.length === 4 && emptyColumns.length === 1;
}

export const jacksDreamRules = {
  isNumberCard,
  isPillow,
  createInitialState,
  dealCards,
  getSourceCards,
  canPlaceJack,
  canMoveCardsToPile,
  collapseCompletedPile,
  canMove,
  moveCards,
  isWinningState,
};

const gameStateInitial = createInitialState();

function sameDropTarget(first: DropTarget | null, second: DropTarget | null) {
  if (!first || !second) return first === second;
  return first.pileIndex === second.pileIndex;
}

export default function JacksDream() {
  const hardMode = useGameSettingValue("jacksDreamHardMode");
  const navigation = useNavigation();
  const [selected, setSelected] = useState<JacksDreamMoveSource | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);

  const {
    isSettingUp,
    isLoaded,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<JacksDreamGameState>({
    gameStateInitial,
    resetNonGameStates: () => {
      setSelected(null);
      clearDragGhost();
    },
    resetAndSetup: async () => {
      setGame((draft) => {
        const allCards = flipAllToBack([
          ...draft.tableau.flat(),
          ...draft.hand.filter((card): card is PlayingCard => card !== null),
          ...draft.discard,
        ]);
        draft.tableau = Array.from({ length: TABLEAU_COUNT }, () => []);
        draft.hand = Array.from({ length: HAND_COUNT }, () => null);
        draft.discard = shuffle(allCards);
      });

      await delay();

      setGame((draft) => {
        const dealt = dealCards(shuffle(draft.discard));
        draft.tableau = dealt.tableau;
        draft.hand = dealt.hand;
        draft.discard = dealt.discard;
      });
    },
  });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();
  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);
  const handleHoverTargetChange = useCallback((next: DropTarget | null) => {
    setHoverTarget((previous) =>
      sameDropTarget(previous, next) ? previous : next,
    );
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
  } = useDragDrop<JacksDreamMoveSource, DropTarget>({
    findDropTarget: (pageX, pageY) => {
      const hit = [...dropHitAreasRef.current]
        .filter(({ rect }) => pointInRect(pageX, pageY, rect))
        .sort((first, second) => second.priority - first.priority)[0];
      return hit?.target ?? null;
    },
    canDropOnTarget: (source, target) =>
      canMove(source, target.pileIndex, game, hardMode),
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

  const zones: MapZone[] = useMemo(() => {
    const handZones = game.hand.map((card, pileIndex) => ({
      id: `hand-${pileIndex}`,
      name: "hand",
      pileIndex,
      cards: card ? [card] : [],
      col: pileIndex,
      row: 0,
      baseZIndex: 40,
      placeholder: { text: "Jack", showCount: false },
    }));
    const tableauZones = game.tableau.map((pile, pileIndex) => ({
      id: `tableau-${pileIndex}`,
      name: "tableau",
      pileIndex,
      cards: pile,
      col: pileIndex,
      row: 1.5,
      baseZIndex: 10 + pileIndex,
      fan: { direction: "down" as const, offset: cardDims.tableauOffset },
      placeholder: { text: "Column", showCount: true },
    }));

    return [
      ...handZones,
      {
        id: "discard",
        name: "discard",
        pileIndex: 0,
        cards: game.discard,
        col: 4,
        row: 0,
        baseZIndex: 30,
        fan: { maxVisible: 3 },
        placeholder: { text: "Discard", showCount: true },
      },
      ...tableauZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const animDuration = justDroppedCardIds.current?.has(mappedCard.card.id)
      ? 0
      : undefined;
    let isSelected = false;
    if (selected?.zone === "hand") {
      isSelected =
        mappedCard.zoneName === "hand" &&
        selected.pileIndex === mappedCard.pileIndex;
    } else if (selected?.zone === "tableau") {
      isSelected =
        mappedCard.zoneName === "tableau" &&
        selected.pileIndex === mappedCard.pileIndex &&
        mappedCard.cardIndex >= selected.cardIndex;
    }
    const isHoverTarget =
      !!dragGhost &&
      mappedCard.zoneName === "tableau" &&
      mappedCard.topOfZone &&
      hoverTarget?.pileIndex === mappedCard.pileIndex;

    return {
      isVisible: !isBeingDragged,
      animDuration,
      isSelected: isSelected || isHoverTarget,
      selectColor: isHoverTarget ? "green" : isSelected ? "blue" : "none",
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "tableau" || zone.pileIndex === undefined) return;
    const isHoverTarget =
      !!dragGhost && hoverTarget?.pileIndex === zone.pileIndex;

    return {
      onPress: () => moveSelectedToTableau(zone.pileIndex!),
      isDisabled: !selected || !!dragGhost,
      isSelected: isHoverTarget && (zone.cards?.length ?? 0) === 0,
      selectColor: isHoverTarget ? "green" : "blue",
    };
  };

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    gap: 0.14,
    cardSize: "tableau",
    fixedRows: 7,
  });

  function getSourceRect(source: JacksDreamMoveSource) {
    const zone = zones.find(
      (entry) =>
        entry.name === source.zone && entry.pileIndex === source.pileIndex,
    );
    if (!zone) return null;

    const base = getZoneBasePos(zone);
    const cardIndex = source.zone === "tableau" ? source.cardIndex : 0;
    return createRect(
      base.x,
      base.y + cardIndex * cardDims.tableauOffset * cardHeight,
      cardWidth,
      cardHeight,
    );
  }

  const cardHitAreas = useMemo<CardHitArea<JacksDreamMoveSource>[]>(() => {
    const areas: CardHitArea<JacksDreamMoveSource>[] = [];

    zones.forEach((zone) => {
      if (zone.pileIndex === undefined) return;
      const base = getZoneBasePos(zone);

      if (zone.name === "hand") {
        if (!game.hand[zone.pileIndex]) return;
        areas.push({
          source: { zone: "hand", pileIndex: zone.pileIndex },
          rect: createRect(base.x, base.y, cardWidth, cardHeight),
          priority: 100,
        });
        return;
      }

      if (zone.name !== "tableau") return;
      game.tableau[zone.pileIndex].forEach((_, cardIndex) => {
        const source: JacksDreamMoveSource = {
          zone: "tableau",
          pileIndex: zone.pileIndex!,
          cardIndex,
        };
        if (getSourceCards(source, game).length === 0) return;

        areas.push({
          source,
          rect: createRect(
            base.x,
            base.y + cardIndex * cardDims.tableauOffset * cardHeight,
            cardWidth,
            cardHeight,
          ),
          priority: 10 + cardIndex,
        });
      });
    });

    return areas;
  }, [cardHeight, cardWidth, game, getZoneBasePos, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(updateBoardOffset);
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(
    () =>
      zones.flatMap((zone) => {
        if (zone.name !== "tableau" || zone.pileIndex === undefined) return [];
        const base = getZoneBasePos(zone);
        const pile = game.tableau[zone.pileIndex];
        const pileHeight =
          cardHeight +
          Math.max(0, pile.length - 1) * cardDims.tableauOffset * cardHeight;
        return [
          {
            target: { zone: "tableau" as const, pileIndex: zone.pileIndex },
            rect: createRect(
              base.x + boardPageOffset.x,
              base.y + boardPageOffset.y,
              cardWidth,
              pileHeight,
            ),
            priority: 50 + pile.length,
          },
        ];
      }),
    [
      boardPageOffset.x,
      boardPageOffset.y,
      cardHeight,
      cardWidth,
      game.tableau,
      getZoneBasePos,
      zones,
    ],
  );
  dropHitAreasRef.current = dropHitAreas;

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    return () => navigation.setOptions({ gestureEnabled: true });
  }, [navigation]);

  function startGhostDrag(
    source: JacksDreamMoveSource,
    _event: GestureResponderEvent,
  ) {
    const cards = getSourceCards(source, game);
    const rect = getSourceRect(source);
    if (cards.length === 0 || !rect) return;
    startDrag(source, cards, { x: rect.x, y: rect.y });
  }

  function moveSourceToTableau(
    source: JacksDreamMoveSource,
    destinationIndex: number,
  ) {
    if (!canMove(source, destinationIndex, game, hardMode)) {
      setSelected(null);
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      moveCards(source, destinationIndex, draft, hardMode);
    });
    setSelected(null);
  }

  function moveSelectedToTableau(destinationIndex: number) {
    if (selected) moveSourceToTableau(selected, destinationIndex);
  }

  function onSourcePress(source: JacksDreamMoveSource) {
    if (dragGhost) return;
    if (selected) {
      moveSourceToTableau(selected, source.pileIndex);
      return;
    }
    setSelected(source);
  }

  const tapHandlerResolverRef = useRef(
    (_source: JacksDreamMoveSource): (() => void) =>
      () => {},
  );
  tapHandlerResolverRef.current = (source) => () => onSourcePress(source);

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map(({ source, rect }) => (
        <View
          key={`${source.zone}-${source.pileIndex}-${source.zone === "tableau" ? source.cardIndex : 0}`}
          collapsable={false}
          style={{
            position: "absolute",
            backgroundColor: "transparent",
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
          {...makeDragHandlers(source, startGhostDrag, () =>
            tapHandlerResolverRef.current(source)(),
          )}
        />
      )),
    [cardHitAreas],
  );

  const won = !isSettingUp && isWinningState(game);
  const ghostHasValidDrop = !!dragGhost && hoverTarget !== null;

  return (
    <GameWrapper
      outcome={won ? "won" : "playing"}
      reset={() => void reset()}
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
            ...StyleSheet.absoluteFillObject,
            zIndex: 3000,
            pointerEvents: "box-none",
            touchAction: "none",
          }}
        >
          {interactionTargets}
        </View>
        {dragGhost && (
          <Animated.View
            style={{
              pointerEvents: "none",
              position: "absolute",
              zIndex: 4000,
              left: dragGhost.origin.x,
              top: dragGhost.origin.y,
              transform: dragTranslate.getTranslateTransform(),
            }}
          >
            {dragGhost.cards.map((card, index) => (
              <View
                key={`ghost-${card.id}`}
                style={{
                  position: "absolute",
                  top: index * cardDims.tableauOffset * cardHeight,
                  width: cardWidth,
                  height: cardHeight,
                  zIndex: index + 1,
                }}
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
    </GameWrapper>
  );
}
