import { useStateManager } from "@/hooks/useStateManager";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  pointInRect,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Card } from "../Cards/Card";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  createDeck,
  type PlayingCard,
  RANK_VALUE,
  shuffle,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

type TableauCard = PlayingCard & {
  row: 0 | 1 | 2 | 3;
  col: number;
  removed: boolean;
  blockers: number[];
};

type GameState = {
  tableau: TableauCard[];
  stock: PlayingCard[];
  waste: PlayingCard[];
};

type MoveSource = { zone: "tableau"; index: number };
type DropTarget = { zone: "waste" };

const ROW_LAYOUT: readonly (readonly number[])[] = [
  [1.5, 4.5, 7.5],
  [1, 2, 4, 5, 7, 8],
  [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
] as const;

const CARDS_PER_ROW = [3, 6, 9, 10] as const;
const TABLEAU_ROW_BASE = 0.9;
const TABLEAU_ROW_STEP = 0.43;

function isAdjacentRank(a: PlayingCard, b: PlayingCard) {
  if (
    (a.rank === "A" && b.rank === "K") ||
    (a.rank === "K" && b.rank === "A")
  ) {
    return true;
  }

  return Math.abs(RANK_VALUE[a.rank] - RANK_VALUE[b.rank]) === 1;
}

function tableauIndex(row: 0 | 1 | 2 | 3, col: number) {
  const rowOffsets = [0, 3, 9, 18] as const;
  return rowOffsets[row] + col;
}

function blockersFor(row: 0 | 1 | 2 | 3, col: number) {
  if (row === 3) return [];

  if (row === 2) {
    return [tableauIndex(3, col), tableauIndex(3, col + 1)];
  }

  if (row === 1) {
    if (col < 2) return [tableauIndex(2, col), tableauIndex(2, col + 1)];
    if (col < 4) {
      const local = col - 2;
      return [tableauIndex(2, 3 + local), tableauIndex(2, 4 + local)];
    }
    const local = col - 4;
    return [tableauIndex(2, 6 + local), tableauIndex(2, 7 + local)];
  }

  if (col === 0) return [tableauIndex(1, 0), tableauIndex(1, 1)];
  if (col === 1) return [tableauIndex(1, 2), tableauIndex(1, 3)];
  return [tableauIndex(1, 4), tableauIndex(1, 5)];
}

function isExposed(card: TableauCard, tableau: TableauCard[]) {
  if (card.removed) return false;

  return card.blockers.every((index) => tableau[index]?.removed);
}

function revealExposedCards(tableau: TableauCard[]) {
  tableau.forEach((card, index) => {
    if (card.removed || card.faceUp) return;
    if (!isExposed(card, tableau)) return;

    tableau[index] = { ...card, faceUp: true };
  });
}

function canMoveToWaste(index: number, snapshot: GameState) {
  const card = snapshot.tableau[index];
  const wasteTop = snapshot.waste[snapshot.waste.length - 1];

  if (!card || card.removed || !card.faceUp || !wasteTop) {
    return false;
  }

  if (!isExposed(card, snapshot.tableau)) {
    return false;
  }

  return isAdjacentRank(card, wasteTop);
}

function hasAvailableMoves(snapshot: GameState) {
  return snapshot.tableau.some((card, index) => {
    if (card.removed || !card.faceUp) return false;
    if (!isExposed(card, snapshot.tableau)) return false;
    return canMoveToWaste(index, snapshot);
  });
}

function createInitialState(): GameState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const tableau: TableauCard[] = [];

  for (
    let row = 0 as 0 | 1 | 2 | 3;
    row <= 3;
    row = (row + 1) as 0 | 1 | 2 | 3
  ) {
    for (let col = 0; col < CARDS_PER_ROW[row]; col += 1) {
      const baseCard = deck.pop();
      if (!baseCard) continue;

      tableau.push({
        ...baseCard,
        row,
        col,
        removed: false,
        faceUp: row === 3,
        blockers: blockersFor(row, col),
      });
    }
  }

  const wasteSeed = deck.pop();

  return {
    tableau,
    stock: deck,
    waste: wasteSeed ? [{ ...wasteSeed, faceUp: true }] : [],
  };
}

const gameStateInitial = createInitialState();

export default function TriPeaks() {
  const navigation = useNavigation();
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);

  const {
    isLoaded,
    showIntro,
    setShowIntro,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetNonGameStates: () => {
      clearDragGhost();
      setHoverTarget(null);
    },
    resetAndSetup: async () => {
      setGame(createInitialState());
    },
  });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();

  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);

  const sameDropTarget = useCallback(
    (a: DropTarget | null, b: DropTarget | null) => {
      if (!a || !b) return a === b;
      return a.zone === b.zone;
    },
    [],
  );

  const handleHoverTargetChange = useCallback(
    (next: DropTarget | null) => {
      setHoverTarget((prev) => (sameDropTarget(prev, next) ? prev : next));
    },
    [sameDropTarget],
  );

  function canDropOnTarget(
    source: MoveSource,
    target: DropTarget,
    snapshot = game,
  ) {
    if (target.zone !== "waste") return false;
    return canMoveToWaste(source.index, snapshot);
  }

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
    onSuccessfulDrop: (source) => {
      moveTableauToWaste(source.index);
    },
    getDroppedCardIds: (source) => {
      const card = game.tableau[source.index];
      return card && !card.removed ? [card.id] : [];
    },
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    onHoverTargetChange: handleHoverTargetChange,
  });

  const won = useMemo(
    () => game.tableau.every((card) => card.removed),
    [game.tableau],
  );

  const lost = useMemo(() => {
    if (won) return false;
    if (game.stock.length > 0) return false;
    return !hasAvailableMoves(game);
  }, [game, won]);

  const ended = won || lost;

  const zones: MapZone[] = useMemo(() => {
    const tableauZones: MapZone[] = game.tableau.map((card, index) => ({
      id: `tableau-${index}`,
      name: "tableau",
      pileIndex: index,
      cards: card.removed ? [] : [card],
      col: ROW_LAYOUT[card.row][card.col],
      row: TABLEAU_ROW_BASE + card.row * TABLEAU_ROW_STEP,
      baseZIndex: 20 + card.row,
    }));

    return [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 3,
        row: 0,
        baseZIndex: 60,
        fan: { maxVisible: 3 },
        placeholder: { text: "Draw", infoPos: "below" },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: 6,
        row: 0,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: "Waste", infoPos: "below" },
      },
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
        onPress: drawFromStock,
        isDisabled: game.stock.length === 0 || ended,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    if (mappedCard.zoneName === "waste") {
      const isWasteDropTarget = !!dragGhost && hoverTarget?.zone === "waste";
      return {
        selectColor: isWasteDropTarget ? "green" : "none",
        isSelected: isWasteDropTarget,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    if (
      mappedCard.zoneName === "tableau" &&
      mappedCard.pileIndex !== undefined
    ) {
      const source = game.tableau[mappedCard.pileIndex];
      if (!source) return undefined;

      const exposed = isExposed(source, game.tableau);
      const playable = canMoveToWaste(mappedCard.pileIndex, game);
      return {
        selectColor: playable ? "blue" : "none",
        isSelected: playable,
        isDisabled: !source.faceUp || source.removed || !exposed || ended,
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
        isDisabled: game.stock.length === 0 || ended,
      };
    }

    if (zone.name === "waste") {
      const isWasteDropTarget = !!dragGhost && hoverTarget?.zone === "waste";

      return {
        isDisabled: true,
        isSelected: isWasteDropTarget,
        selectColor: isWasteDropTarget ? "green" : "none",
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
    visualizer: true,
    // fixedCols: 10,
    // fixedRows: 6,
  });

  const stockTapRect = useMemo(() => {
    const stockZone = zones.find((zone) => zone.name === "stock");
    if (!stockZone) return null;
    const pos = getZoneBasePos(stockZone);
    return createRect(pos.x, pos.y, cardWidth, cardHeight);
  }, [cardHeight, cardWidth, getZoneBasePos, zones]);

  function getSourceRect(source: MoveSource) {
    const zone = zones.find(
      (entry) => entry.name === "tableau" && entry.pileIndex === source.index,
    );
    if (!zone) return null;

    const base = getZoneBasePos(zone);
    return createRect(base.x, base.y, cardWidth, cardHeight);
  }

  function startGhostDrag(source: MoveSource, _event: GestureResponderEvent) {
    const card = game.tableau[source.index];
    if (!card || card.removed || !card.faceUp || ended) return;
    if (!isExposed(card, game.tableau)) return;

    const rect = getSourceRect(source);
    if (!rect) return;

    startDrag(source, [card], { x: rect.x, y: rect.y });
  }

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    game.tableau.forEach((card, index) => {
      if (card.removed || !card.faceUp || ended) return;
      if (!isExposed(card, game.tableau)) return;

      const zone = zones.find(
        (entry) => entry.name === "tableau" && entry.pileIndex === index,
      );
      if (!zone) return;

      const pos = getZoneBasePos(zone);
      areas.push({
        source: { zone: "tableau", index },
        rect: createRect(pos.x, pos.y, cardWidth, cardHeight),
        priority: 10 + card.row,
      });
    });

    return areas;
  }, [cardHeight, cardWidth, ended, game.tableau, getZoneBasePos, zones]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(() => {
    const wasteZone = zones.find((zone) => zone.name === "waste");
    if (!wasteZone || ended) return [];

    const zoneRect = getZoneBasePos(wasteZone);

    return [
      {
        target: { zone: "waste" },
        rect: createRect(
          zoneRect.x + boardPageOffset.x,
          zoneRect.y + boardPageOffset.y,
          cardWidth,
          cardHeight,
        ),
        priority: 100,
      },
    ];
  }, [
    boardPageOffset.x,
    boardPageOffset.y,
    cardHeight,
    cardWidth,
    ended,
    getZoneBasePos,
    zones,
  ]);

  dropHitAreasRef.current = dropHitAreas;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      updateBoardOffset();
    });

    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });

    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  function drawFromStock() {
    if (dragGhost || ended) {
      clearDragGhost();
    }

    if (game.stock.length === 0 || ended) {
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const drawn = draft.stock[draft.stock.length - 1];
      if (!drawn) return;

      draft.stock.pop();
      draft.waste.push({ ...drawn, faceUp: true });
    });
  }

  function moveTableauToWaste(index: number) {
    if (!canMoveToWaste(index, game) || ended) {
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.tableau[index];
      if (!card || card.removed || !card.faceUp) return;
      if (!isExposed(card, draft.tableau)) return;

      const top = draft.waste[draft.waste.length - 1];
      if (!top || !isAdjacentRank(card, top)) return;

      draft.tableau[index] = { ...card, removed: true };
      draft.waste.push({
        id: card.id,
        suit: card.suit,
        rank: card.rank,
        faceUp: true,
      });

      revealExposedCards(draft.tableau);
    });
  }

  function onTableauPress(index: number) {
    if (ended) return;
    moveTableauToWaste(index);
  }

  function makeHandlers(source: MoveSource, onTap?: () => void) {
    return makeDragHandlers(source, startGhostDrag, onTap);
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map((hit) => {
        const source = hit.source;
        const rect = hit.rect;

        return (
          <View
            key={`tableau-target-${source.index}`}
            collapsable={false}
            style={{
              position: "absolute",
              backgroundColor: "transparent",
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
            {...makeHandlers(source, () => onTableauPress(source.index))}
          />
        );
      }),
    [cardHitAreas],
  );

  const ghostLeft = dragGhost ? dragGhost.origin.x : 0;
  const ghostTop = dragGhost ? dragGhost.origin.y : 0;
  const ghostHasValidDrop = !!dragGhost && hoverTarget !== null;

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={ended}
      won={won}
      winLoseMessage={lost ? "No moves left." : undefined}
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
                disabled={game.stock.length === 0 || ended}
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
              {dragGhost.cards.map((card) => (
                <View
                  key={`ghost-${card.id}`}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    opacity: 1,
                    width: cardWidth,
                    height: cardHeight,
                  }}
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
