import {
  CardHitArea,
  createRect,
  DropHitArea,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import { useStateManager } from "@/hooks/useStateManager";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  PlayingCard,
  RANKS,
  RANK_VALUE,
  shuffle,
  zoneFanOffset,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";

const PILE_COUNT = 3;
const CARDS_PER_PILE = 3;

type GameState = {
  deal: PlayingCard[];
  piles: PlayingCard[][];
  /** Cards moved this game; absent from games saved before it was counted. */
  moves?: number;
};

type MoveSource = { pileIndex: number };
type DropTarget = { pileIndex: number };

function createCards(faceUp: boolean) {
  return shuffle(
    RANKS.slice(0, PILE_COUNT * CARDS_PER_PILE).map((rank) => ({
      id: `clubs-${rank}-${Math.random().toString(36).slice(2, 8)}`,
      suit: "clubs" as const,
      rank,
      faceUp,
    })),
  );
}

function dealCards(cards: PlayingCard[]) {
  const dealPile = [...cards];
  const piles = Array.from({ length: PILE_COUNT }, () => [] as PlayingCard[]);

  for (let row = 0; row < CARDS_PER_PILE; row += 1) {
    for (let pileIndex = 0; pileIndex < PILE_COUNT; pileIndex += 1) {
      const card = dealPile.pop();
      if (card) piles[pileIndex].push({ ...card, faceUp: true });
    }
  }

  return piles;
}

function createInitialState(): GameState {
  return { deal: [], piles: dealCards(createCards(true)), moves: 0 };
}

function pileOffset(count: number) {
  return zoneFanOffset(count, 4, 0.1, 0.48);
}

function canPlaceOnPile(card: PlayingCard, destination?: PlayingCard) {
  return !destination || RANK_VALUE[card.rank] < RANK_VALUE[destination.rank];
}

function isWinningPile(pile: PlayingCard[]) {
  return (
    pile.length === PILE_COUNT * CARDS_PER_PILE &&
    pile.every((card, index) => RANK_VALUE[card.rank] === 9 - index)
  );
}

// The solution the last hint found, by position, so the hints that follow it
// come at once.
let solutionPath = new Map<string, [number, number]>();

/**
 * The first move of a shortest solution, found by searching every position
 * reachable from here (there are few enough): the optimal hint.
 */
function findTowerOfHanoiHint(state: GameState) {
  type Piles = number[][];
  const start: Piles = state.piles.map((pile) =>
    pile.map((card) => RANK_VALUE[card.rank]),
  );
  const key = (piles: Piles) => piles.map((pile) => pile.join(".")).join("|");
  const solved = (piles: Piles) =>
    piles.some(
      (pile) =>
        pile.length === PILE_COUNT * CARDS_PER_PILE &&
        pile.every((rank, index) => rank === 9 - index),
    );
  if (solved(start)) return null;
  const hintFor = ([from, to]: [number, number]) =>
    makeHint(
      "moveCard",
      cardTarget(state.piles[from][state.piles[from].length - 1]),
      zoneTarget(`pile-${to}`),
    );
  const known = solutionPath.get(key(start));
  if (known) return hintFor(known);

  const parent = new Map<string, { from: string; move: [number, number] }>();
  const seen = new Set([key(start)]);
  let layer: Piles[] = [start];
  while (layer.length > 0 && seen.size < 200000) {
    const next: Piles[] = [];
    for (const piles of layer) {
      for (let from = 0; from < piles.length; from += 1) {
        const rank = piles[from][piles[from].length - 1];
        if (rank === undefined) continue;
        for (let to = 0; to < piles.length; to += 1) {
          const destination = piles[to][piles[to].length - 1];
          if (to === from || (destination !== undefined && rank >= destination))
            continue;
          const moved = piles.map((pile, index) =>
            index === from
              ? pile.slice(0, -1)
              : index === to
                ? [...pile, rank]
                : pile,
          );
          const movedKey = key(moved);
          if (seen.has(movedKey)) continue;
          seen.add(movedKey);
          parent.set(movedKey, { from: key(piles), move: [from, to] });
          if (solved(moved)) {
            // Walk back to the start, remembering each position's move.
            solutionPath = new Map();
            let first: [number, number] = [from, to];
            for (
              let step = parent.get(movedKey);
              step;
              step = parent.get(step.from)
            ) {
              solutionPath.set(step.from, step.move);
              first = step.move;
            }
            return hintFor(first);
          }
          next.push(moved);
        }
      }
    }
    layer = next;
  }
  return null;
}

export const towerOfHanoiRules = {
  findHint: findTowerOfHanoiHint,
  canPlaceOnPile,
  isWinningPile,
};

const gameStateInitial = createInitialState();

export default function TowerOfHanoi() {
  const { width: windowWidth, height: windowHeight } = useViewportDimensions();
  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);

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
      clearDragGhost();
    },
    resetAndSetup: async () => {
      setGame((draft) => {
        draft.deal = shuffle([...draft.deal, ...draft.piles.flat()]).map(
          (card) => ({ ...card, faceUp: false }),
        );
        draft.piles = Array.from({ length: PILE_COUNT }, () => []);
        draft.moves = 0;
      });

      await delay(1000);
      setGame((draft) => {
        draft.piles = dealCards(draft.deal);
        draft.deal = [];
      });
    },
  });

  useHint(() => findTowerOfHanoiHint(game), {
    game,
    enabled: !isSettingUp && !game.deal.length,
  });

  const zones = useMemo<MapZone[]>(() => {
    const pileZones: MapZone[] = game.piles.map((pile, pileIndex) => ({
      id: `pile-${pileIndex}`,
      name: "pile",
      pileIndex,
      cards: pile,
      col: pileIndex,
      row: 0,
      baseZIndex: 10 + pileIndex,
      fan: {
        direction: "down",
        offset: pileOffset(pile.length),
      },
      placeholder: { showCount: false },
    }));

    return [
      {
        id: "deal",
        name: "deal",
        cards: game.deal,
        col: 1,
        row: 0,
        baseZIndex: 30,
        fan: {},
      },
      ...pileZones,
    ];
  }, [game]);

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
    canDropOnTarget: (source, target) => {
      if (source.pileIndex === target.pileIndex) return false;

      const moving = game.piles[source.pileIndex].at(-1);
      const destination = game.piles[target.pileIndex].at(-1);
      return !!moving && canPlaceOnPile(moving, destination);
    },
    onSuccessfulDrop: (source, target) => {
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        const moving = draft.piles[source.pileIndex].at(-1);
        const destination = draft.piles[target.pileIndex].at(-1);
        if (
          !moving ||
          source.pileIndex === target.pileIndex ||
          !canPlaceOnPile(moving, destination)
        ) {
          return;
        }

        draft.piles[source.pileIndex].pop();
        draft.piles[target.pileIndex].push(moving);
        draft.moves = (draft.moves ?? 0) + 1;
      });
    },
    getDroppedCardIds: (source) => {
      const card = game.piles[source.pileIndex].at(-1);
      return card ? [card.id] : [];
    },
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
  });

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const isHoverTarget =
      !!dragGhost &&
      mappedCard.topOfZone &&
      hoverTarget?.pileIndex === mappedCard.pileIndex;

    return {
      isVisible: !isDragged,
      isSelected: isHoverTarget,
      selectColor: isHoverTarget ? "green" : "none",
      animDuration:
        justDroppedCardIds.current?.has(mappedCard.card.id) === true
          ? 0
          : undefined,
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    const isHoverTarget =
      !!dragGhost && hoverTarget?.pileIndex === zone.pileIndex;
    return {
      isDisabled: !!dragGhost,
      isSelected: isHoverTarget,
      selectColor: isHoverTarget ? "green" : "none",
    };
  };

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedCols: 3,
    fixedRows: 4,
  });

  function getSourceRect(source: MoveSource) {
    const zone = zones.find(
      (entry) => entry.name === "pile" && entry.pileIndex === source.pileIndex,
    );
    const pile = game.piles[source.pileIndex];
    if (!zone || pile.length === 0) return null;

    const base = getZoneBasePos(zone);
    return createRect(
      base.x,
      base.y + (pile.length - 1) * pileOffset(pile.length) * cardHeight,
      cardWidth,
      cardHeight,
    );
  }

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(
    () =>
      game.piles.flatMap((pile, pileIndex) => {
        const zone = zones.find(
          (entry) => entry.name === "pile" && entry.pileIndex === pileIndex,
        );
        if (!zone || pile.length === 0) return [];

        const base = getZoneBasePos(zone);
        return [
          {
            source: { pileIndex },
            rect: createRect(
              base.x,
              base.y + (pile.length - 1) * pileOffset(pile.length) * cardHeight,
              cardWidth,
              cardHeight,
            ),
            priority: pileIndex,
          },
        ];
      }),
    [cardHeight, cardWidth, game.piles, getZoneBasePos, zones],
  );

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(
    () =>
      zones.flatMap((zone) => {
        if (zone.name !== "pile" || zone.pileIndex === undefined) return [];

        const pileIndex = zone.pileIndex;
        const base = getZoneBasePos(zone);
        const count = game.piles[pileIndex].length;
        const pileHeight =
          cardHeight + Math.max(0, count - 1) * pileOffset(count) * cardHeight;

        return [
          {
            target: { pileIndex },
            rect: createRect(
              base.x + boardPageOffset.x,
              base.y + boardPageOffset.y,
              cardWidth,
              pileHeight,
            ),
            priority: pileIndex,
          },
        ];
      }),
    [
      boardPageOffset.x,
      boardPageOffset.y,
      cardHeight,
      cardWidth,
      game.piles,
      getZoneBasePos,
      zones,
    ],
  );

  dropHitAreasRef.current = dropHitAreas;

  useEffect(() => {
    const frame = requestAnimationFrame(updateBoardOffset);
    return () => cancelAnimationFrame(frame);
  }, [cardHeight, cardWidth, updateBoardOffset, windowHeight, windowWidth]);

  function startGhostDrag(source: MoveSource) {
    const card = game.piles[source.pileIndex].at(-1);
    const rect = getSourceRect(source);
    if (!card || !rect) return;

    startDrag(source, [card], { x: rect.x, y: rect.y });
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map(({ source, rect }) => (
        <DragHandle
          key={`pile-${source.pileIndex}`}
          collapsable={false}
          style={{
            position: "absolute",
            backgroundColor: "transparent",
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
          gesture={makeDragHandlers(source, startGhostDrag)}
        />
      )),
    [cardHitAreas],
  );

  const won = useMemo(() => game.piles.some(isWinningPile), [game.piles]);

  return (
    <GameWrapper
      outcome={won ? "won" : "playing"}
      reset={() => {
        void reset();
      }}
      isLoaded={isLoaded}
      score={won ? game.moves : undefined}
      canUndo={canUndo}
      undo={undo}
    >
      <View ref={boardRef} style={styles.board}>
        {cardMap}

        <View style={styles.interactionLayer}>{interactionTargets}</View>

        {dragGhost && (
          <DragGhostCards
            ghost={dragGhost}
            translate={dragTranslate}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize="small"
            isValidDrop={hoverTarget !== null}
          />
        )}
      </View>
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    width: "100%",
    position: "relative",
    touchAction: "none",
    overscrollBehaviorX: "contain",
  },
  interactionLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3000,
    touchAction: "none",
    overscrollBehaviorX: "contain",
    pointerEvents: "box-none",
  },
});
