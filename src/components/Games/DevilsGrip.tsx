import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { useStateManager } from "@/hooks/useStateManager";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipToFace,
  PlayingCard,
  RANK_VALUE,
  shuffle,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { delay } from "@/utils/utils";
import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";

const GRID_SIZE = 24;

export type DevilsGripGameState = {
  grid: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
};

export type DevilsGripMoveSource =
  | { zone: "grid"; pileIndex: number; cardIndex: number }
  | { zone: "waste" };

type DropTarget = { pileIndex: number };

function rowForRank(card: PlayingCard) {
  const value = RANK_VALUE[card.rank];
  if (value < 2 || value > 13) return -1;
  return (value - 2) % 3;
}

function isValidStack(cards: PlayingCard[]) {
  return cards.every((card, index) => {
    if (index === 0) return true;
    const previous = cards[index - 1];
    return (
      card.suit === previous.suit &&
      RANK_VALUE[card.rank] === RANK_VALUE[previous.rank] + 3
    );
  });
}

function canBuild(moving: PlayingCard[], destination: PlayingCard[]) {
  if (moving.length === 0 || destination.length === 0) return false;
  if (!isValidStack(moving)) return false;
  const lead = moving[0];
  const top = destination[destination.length - 1];
  return (
    lead.suit === top.suit && RANK_VALUE[lead.rank] === RANK_VALUE[top.rank] + 3
  );
}

function pileIsInValidRow(pile: PlayingCard[], pileIndex: number) {
  if (pile.length === 0) return false;
  const base = pile[0];
  return (
    (base.rank === "2" || base.rank === "3" || base.rank === "4") &&
    rowForRank(base) === Math.floor(pileIndex / 8)
  );
}

function isBuiltStack(pile: PlayingCard[]) {
  return pile.length > 1 && isValidStack(pile);
}

function isMovableGridSource(pile: PlayingCard[], cardIndex: number) {
  return !isBuiltStack(pile) || cardIndex === 0;
}

function pileOverlayColor(pile: PlayingCard[], pileIndex: number) {
  if (!pileIsInValidRow(pile, pileIndex) || !isValidStack(pile)) return null;
  return pile.length === 4 ? "lightGrey" : "purple";
}

function createInitialState(random: () => number = Math.random) {
  const stock = shuffle(
    createDeck({ deckCount: 2, faceUp: false }).filter(
      (card) => card.rank !== "A",
    ),
    random,
  );
  return {
    grid: Array.from({ length: GRID_SIZE }, () => [] as PlayingCard[]),
    stock,
    waste: [],
  };
}

function gatherToDrawAction(
  state: DevilsGripGameState,
  random: () => number = Math.random,
) {
  state.stock = shuffle(
    flipAllToBack([...state.stock, ...state.grid.flat(), ...state.waste]),
    random,
  );
  state.grid = Array.from({ length: GRID_SIZE }, () => [] as PlayingCard[]);
  state.waste = [];
}

function dealInitialGridAction(state: DevilsGripGameState) {
  for (let index = 0; index < GRID_SIZE; index += 1) {
    const card = state.stock.pop();
    if (card) state.grid[index].push(flipToFace(card));
  }
}

function getSourceCards(
  source: DevilsGripMoveSource,
  state: DevilsGripGameState,
) {
  if (source.zone === "waste") {
    const card = state.waste[state.waste.length - 1];
    return card ? [card] : [];
  }
  return state.grid[source.pileIndex].slice(source.cardIndex);
}

function canMove(
  source: DevilsGripMoveSource,
  targetPileIndex: number,
  state: DevilsGripGameState,
) {
  return getMoveType(source, targetPileIndex, state) !== null;
}

function getMoveType(
  source: DevilsGripMoveSource,
  targetPileIndex: number,
  state: DevilsGripGameState,
): "build" | "swap" | null {
  if (source.zone === "grid" && source.pileIndex === targetPileIndex) {
    return null;
  }
  if (source.zone === "grid") {
    const sourcePile = state.grid[source.pileIndex];
    if (!isMovableGridSource(sourcePile, source.cardIndex)) return null;
  }
  const destination = state.grid[targetPileIndex];
  const moving = getSourceCards(source, state);
  if (canBuild(moving, destination)) return "build";
  if (source.zone === "grid" && source.cardIndex === 0 && destination.length) {
    return "swap";
  }
  return null;
}

function moveAction(
  state: DevilsGripGameState,
  source: DevilsGripMoveSource,
  targetPileIndex: number,
) {
  if (!canMove(source, targetPileIndex, state)) return false;
  const destination = state.grid[targetPileIndex];
  const moving = getSourceCards(source, state);

  if (
    source.zone === "grid" &&
    source.cardIndex === 0 &&
    destination.length &&
    !canBuild(moving, destination)
  ) {
    [state.grid[source.pileIndex], state.grid[targetPileIndex]] = [
      state.grid[targetPileIndex],
      state.grid[source.pileIndex],
    ];
    return true;
  }

  const removed =
    source.zone === "waste"
      ? state.waste.splice(-1)
      : state.grid[source.pileIndex].splice(source.cardIndex);
  destination.push(...removed);

  if (source.zone === "grid" && state.grid[source.pileIndex].length === 0) {
    redealWasteAction(state);
    const replacement = state.stock.pop();
    if (replacement) state.grid[source.pileIndex].push(flipToFace(replacement));
  }
  return true;
}

function dealThreeAction(state: DevilsGripGameState) {
  if (state.stock.length === 0) return false;
  for (let count = 0; count < 3 && state.stock.length > 0; count += 1) {
    const card = state.stock.pop();
    if (card) state.waste.push(flipToFace(card));
  }
  return true;
}

function redealWasteAction(state: DevilsGripGameState) {
  if (state.stock.length > 0 || state.waste.length === 0) return false;
  state.stock = flipAllToBack(state.waste.slice().reverse());
  state.waste = [];
  return true;
}

function hasTableauBuildMove(state: DevilsGripGameState) {
  const sources: DevilsGripMoveSource[] = [];
  state.grid.forEach((pile, pileIndex) => {
    pile.forEach((_card, cardIndex) => {
      if (!isMovableGridSource(pile, cardIndex)) return;
      sources.push({ zone: "grid", pileIndex, cardIndex });
    });
  });
  return sources.some((source) =>
    state.grid.some((destination, pileIndex) => {
      if (!destination.length) return false;
      return (
        canBuild(getSourceCards(source, state), destination) &&
        !(source.zone === "grid" && source.pileIndex === pileIndex)
      );
    }),
  );
}

function canCardBuildOnGrid(card: PlayingCard, grid: PlayingCard[][]) {
  return grid.some((destination) => canBuild([card], destination));
}

function getReachableDrawThreeCards(state: DevilsGripGameState) {
  const reachable: PlayingCard[] = [];
  const addExposedCards = (draw: PlayingCard[]) => {
    for (let cursor = draw.length; cursor > 0; ) {
      cursor = Math.max(0, cursor - 3);
      const card = draw[cursor];
      if (card && !reachable.some((candidate) => candidate.id === card.id)) {
        reachable.push(card);
      }
    }
  };

  const wasteTop = state.waste[state.waste.length - 1];
  if (wasteTop) reachable.push(wasteTop);

  addExposedCards(state.stock);
  const fullDraw = [...state.stock, ...state.waste.slice().reverse()];
  addExposedCards(fullDraw);
  return reachable;
}

function hasPlayableDrawMove(state: DevilsGripGameState) {
  return getReachableDrawThreeCards(state).some((card) =>
    canCardBuildOnGrid(card, state.grid),
  );
}

function hasAnyProgressMove(state: DevilsGripGameState) {
  return hasTableauBuildMove(state) || hasPlayableDrawMove(state);
}

function scoreRating(score: number) {
  if (score <= 2) return "Brilliant";
  if (score <= 5) return "Excellent";
  if (score <= 10) return "Good";
  return null;
}

/**
 * Builds come first, onto piles already in their row; then the waste's card;
 * then a swap that brings a 2, 3 or 4 into its own row. Drawing (or turning
 * the waste over) when nothing else helps.
 */
function findDevilsGripHint(state: DevilsGripGameState) {
  const sources: DevilsGripMoveSource[] = [
    ...state.grid.flatMap((pile, pileIndex) =>
      pile.flatMap((_, cardIndex) =>
        isMovableGridSource(pile, cardIndex)
          ? [{ zone: "grid" as const, pileIndex, cardIndex }]
          : [],
      ),
    ),
    ...(state.waste.length ? [{ zone: "waste" as const }] : []),
  ];
  let best: {
    source: DevilsGripMoveSource;
    target: number;
    worth: number;
  } | null = null;
  for (const source of sources) {
    for (let target = 0; target < state.grid.length; target += 1) {
      const type = getMoveType(source, target, state);
      if (!type) continue;
      let worth = 0;
      const inRow = pileIsInValidRow(state.grid[target], target);
      if (type === "build") {
        worth = (source.zone === "waste" ? 80 : 100) + (inRow ? 50 : 0);
        if (
          source.zone === "grid" &&
          source.cardIndex === 0 &&
          !pileIsInValidRow(state.grid[source.pileIndex], source.pileIndex)
        ) {
          worth += 20; // Empties a cell, which takes a new card.
        }
      } else if (source.zone === "grid") {
        const pile = state.grid[source.pileIndex];
        const base = pile[0];
        const fits =
          ["2", "3", "4"].includes(base.rank) &&
          isValidStack(pile) &&
          rowForRank(base) === Math.floor(target / 8) &&
          !pileIsInValidRow(pile, source.pileIndex) &&
          !inRow;
        worth = fits ? 60 : 0;
      }
      if (worth > 0 && (!best || worth > best.worth)) {
        best = { source, target, worth };
      }
    }
  }
  if (best) {
    const cards = getSourceCards(best.source, state);
    return makeHint(
      cards.length > 1 ? "moveCards" : "moveCard",
      cardTarget(cards[0]),
      zoneTarget(`grid-${best.target}`),
    );
  }
  if (state.stock.length > 0) return makeHint("draw", zoneTarget("stock"));
  return state.waste.length > 0
    ? makeHint("redeal", zoneTarget("stock"))
    : null;
}

export const devilsGripRules = {
  findHint: findDevilsGripHint,
  rowForRank,
  isValidStack,
  canBuild,
  pileIsInValidRow,
  isBuiltStack,
  isMovableGridSource,
  pileOverlayColor,
  createInitialState,
  gatherToDrawAction,
  dealInitialGridAction,
  getSourceCards,
  canMove,
  getMoveType,
  moveAction,
  dealThreeAction,
  redealWasteAction,
  hasTableauBuildMove,
  getReachableDrawThreeCards,
  hasPlayableDrawMove,
  hasAnyProgressMove,
  scoreRating,
};

const gameStateInitial = createInitialState();

async function resetAndSetup(
  setGame: (
    updater: DevilsGripGameState | ((draft: DevilsGripGameState) => void),
  ) => void,
) {
  setGame((draft) => {
    gatherToDrawAction(draft);
  });

  await delay();

  setGame((draft) => {
    dealInitialGridAction(draft);
  });
}

export default function DevilsGrip() {
  const [selected, setSelected] = useState<DevilsGripMoveSource | null>(null);
  const { width: windowWidth, height: windowHeight } = useViewportDimensions();
  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<DevilsGripGameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    resetNonGameStates: () => {
      setSelected(null);
    },
  });

  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);
  const {
    hoverTarget,
    dragGhost,
    draggedCardIds,
    justDroppedCardIds,
    dragTranslate,
    boardRef,
    boardPageOffset,
    startDrag,
    updateBoardOffset,
    makeDragHandlers,
  } = useDragDrop<DevilsGripMoveSource, DropTarget>({
    canDropOnTarget: (source, target) =>
      canMove(source, target.pileIndex, game),
    onSuccessfulDrop: (source, target) => performMove(source, target.pileIndex),
    getDroppedCardIds: (source) =>
      getSourceCards(source, game).map((card) => card.id),
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler: (source) => () => onSourcePress(source),
  });

  const zones: MapZone[] = useMemo(() => {
    const gridZones = game.grid.map((pile, pileIndex) => ({
      id: `grid-${pileIndex}`,
      name: "grid",
      pileIndex,
      cards: pile,
      col: pileIndex % 8,
      row: Math.floor(pileIndex / 8),
      baseZIndex: 10 + pileIndex,
      fan: {
        offset: cardDims.fanOffset,
        maxVisible: 4,
      },
      placeholder: {},
    }));
    return [
      ...gridZones,
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: 8.4,
        row: 0,
        baseZIndex: 60,
        fan: {
          direction: "right",
          offset: 0.4,
          maxVisible: 3,
          shadowVisibleCount: 6,
        },
        placeholder: {
          text: i18n.t("cards:waste"),
          showCount: true,
          infoPos: "below",
        },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 8.4,
        row: 2,
        baseZIndex: 70,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          showCount: true,
          infoPos: "above",
        },
      },
    ];
  }, [game]);

  const cardMapper = (mappedCard: MappedCard): AnimatedCardMapping => {
    const source =
      mappedCard.zoneName === "waste"
        ? ({ zone: "waste" } as const)
        : mappedCard.zoneName === "grid" && mappedCard.pileIndex !== undefined
          ? ({
              zone: "grid" as const,
              pileIndex: mappedCard.pileIndex,
              cardIndex: mappedCard.cardIndex,
            } as const)
          : null;
    const pileIndex = mappedCard.pileIndex;
    const pile =
      mappedCard.zoneName === "grid" && pileIndex !== undefined
        ? game.grid[pileIndex]
        : [];
    const movableSource =
      mappedCard.zoneName !== "grid" ||
      isMovableGridSource(pile, mappedCard.cardIndex);
    const overlayColor =
      pileIndex !== undefined ? pileOverlayColor(pile, pileIndex) : null;
    const isSelected =
      !!source &&
      (mappedCard.zoneName !== "waste" || mappedCard.topOfZone) &&
      selected !== null &&
      JSON.stringify(source) === JSON.stringify(selected);
    const isHoverTarget =
      mappedCard.zoneName === "grid" &&
      mappedCard.topOfZone &&
      hoverTarget?.pileIndex === pileIndex;
    const hoverMoveType =
      isHoverTarget && dragGhost && pileIndex !== undefined
        ? getMoveType(dragGhost.source, pileIndex, game)
        : null;
    const hoverColor = hoverMoveType === "build" ? "purple" : "blue";

    return {
      isVisible: !draggedCardIds?.has(mappedCard.card.id),
      animDuration: justDroppedCardIds.current?.has(mappedCard.card.id)
        ? 0
        : undefined,
      isDisabled:
        source === null || mappedCard.zoneName === "stock" || !movableSource,
      isSelected: isSelected || isHoverTarget,
      selectColor: isHoverTarget
        ? hoverColor
        : isSelected
          ? "blue"
          : (overlayColor ?? "none"),
      forceOverlayColor: overlayColor !== null,
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: onDrawPress,
        isDisabled: game.stock.length === 0 && game.waste.length === 0,
      };
    }
    if (zone.name === "grid" && zone.pileIndex !== undefined) {
      const isHoverTarget = hoverTarget?.pileIndex === zone.pileIndex;
      const hoverMoveType =
        isHoverTarget && dragGhost
          ? getMoveType(dragGhost.source, zone.pileIndex, game)
          : null;
      return {
        onPress: () => onTargetPress(zone.pileIndex!),
        isDisabled: !selected || !!dragGhost,
        isSelected: isHoverTarget,
        selectColor: hoverMoveType === "build" ? "purple" : "blue",
      };
    }
  };

  const { cardMap, getZoneBasePos, getCardPos, cardWidth, cardHeight } =
    useCardMap({
      game,
      zones,
      cardMapper,
      zoneMapper,
      cardSize: "small",
      gap: 0.16,
      paddingRight: 1.2,
    });

  function getSourceRect(source: DevilsGripMoveSource) {
    const zone = zones.find((entry) =>
      source.zone === "waste"
        ? entry.name === "waste"
        : entry.name === "grid" && entry.pileIndex === source.pileIndex,
    );
    if (!zone) return null;
    const cardIndex =
      source.zone === "waste" ? game.waste.length - 1 : source.cardIndex;
    const position = getCardPos(zone, cardIndex);
    return createRect(position.x, position.y, cardWidth, cardHeight);
  }

  const cardHitAreas = useMemo<CardHitArea<DevilsGripMoveSource>[]>(() => {
    const areas: CardHitArea<DevilsGripMoveSource>[] = [];
    for (const zone of zones) {
      if (zone.name === "waste" && game.waste.length) {
        const cardIndex = game.waste.length - 1;
        const position = getCardPos(zone, cardIndex);
        areas.push({
          source: { zone: "waste" },
          rect: createRect(position.x, position.y, cardWidth, cardHeight),
          priority: 100,
        });
      }
      if (zone.name === "grid" && zone.pileIndex !== undefined) {
        const pile = game.grid[zone.pileIndex];
        pile.forEach((_card, cardIndex) => {
          if (!isMovableGridSource(pile, cardIndex)) return;
          const position = getCardPos(zone, cardIndex);
          areas.push({
            source: { zone: "grid", pileIndex: zone.pileIndex!, cardIndex },
            rect: createRect(position.x, position.y, cardWidth, cardHeight),
            priority: 20 + cardIndex,
          });
        });
      }
    }
    return areas;
  }, [cardHeight, cardWidth, game.grid, game.waste.length, getCardPos, zones]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(
    () =>
      zones
        .filter((zone) => zone.name === "grid" && zone.pileIndex !== undefined)
        .map((zone) => {
          const position = getZoneBasePos(zone);
          return {
            target: { pileIndex: zone.pileIndex! },
            rect: createRect(
              position.x + boardPageOffset.x,
              position.y + boardPageOffset.y,
              cardWidth,
              cardHeight * 1.3,
            ),
            priority: 50 + (zone.cards?.length ?? 0),
          };
        }),
    [
      boardPageOffset.x,
      boardPageOffset.y,
      cardHeight,
      cardWidth,
      getZoneBasePos,
      zones,
    ],
  );
  dropHitAreasRef.current = dropHitAreas;

  useEffect(() => {
    const frame = requestAnimationFrame(updateBoardOffset);
    return () => cancelAnimationFrame(frame);
  }, [cardHeight, cardWidth, updateBoardOffset, windowHeight, windowWidth]);

  function performMove(source: DevilsGripMoveSource, targetPileIndex: number) {
    if (!canMove(source, targetPileIndex, game)) {
      setSelected(null);
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      moveAction(draft, source, targetPileIndex);
    });
    setSelected(null);
  }

  function onSourcePress(source: DevilsGripMoveSource) {
    if (dragGhost) return;
    if (
      selected &&
      source.zone === "grid" &&
      canMove(selected, source.pileIndex, game)
    ) {
      performMove(selected, source.pileIndex);
      return;
    }
    setSelected((current) =>
      current && JSON.stringify(current) === JSON.stringify(source)
        ? null
        : source,
    );
  }

  function onTargetPress(pileIndex: number) {
    if (selected) performMove(selected, pileIndex);
  }

  function onDrawPress() {
    if ((!game.stock.length && !game.waste.length) || dragGhost) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (draft.stock.length > 0) {
        dealThreeAction(draft);
      } else {
        redealWasteAction(draft);
      }
    });
    setSelected(null);
  }

  function startGhostDrag(source: DevilsGripMoveSource) {
    const cards = getSourceCards(source, game);
    const rect = getSourceRect(source);
    if (!rect || !cards.length) return;
    const fanDirection = "diagonal-depth";
    const fanOffset =
      source.zone === "grid" ? cardDims.fanOffset : cardDims.fanOffset;
    startDrag(source, cards, { x: rect.x, y: rect.y }, fanOffset, fanDirection);
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map(({ source, rect }) => (
        <DragHandle
          key={JSON.stringify(source)}
          collapsable={false}
          style={{
            position: "absolute",
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            backgroundColor: "transparent",
          }}
          gesture={makeDragHandlers(source, startGhostDrag)}
        />
      )),
    [cardHitAreas],
  );

  const won = game.stock.length === 0 && game.waste.length === 0;
  const ended = !isSettingUp && (won || !hasAnyProgressMove(game));

  useHint(() => findDevilsGripHint(game), {
    game,
    enabled: !isSettingUp && !ended,
  });
  const score = game.stock.length + game.waste.length;
  const rating = scoreRating(score);
  const hoverMoveType =
    dragGhost && hoverTarget
      ? getMoveType(dragGhost.source, hoverTarget.pileIndex, game)
      : null;

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      showDeviceRotateHint="landscape"
      winLoseMessage={
        won
          ? i18n.t("games:devilsGrip.everyCardIsInTheGrid")
          : i18n.t(`games:devilsGrip.cardsRemain${rating ?? ""}`, {
              count: score,
            })
      }
    >
      <View
        ref={boardRef}
        style={{
          flex: 1,
          width: "100%",
          position: "relative",
          touchAction: "none",
        }}
      >
        {cardMap}
        <View
          style={[
            pointerEventsStyles.boxNone,
            {
              ...StyleSheet.absoluteFillObject,
              zIndex: 3000,
            },
          ]}
        >
          {interactionTargets}
          {(game.stock.length > 0 || game.waste.length > 0) &&
            (() => {
              const stock = zones.find((zone) => zone.name === "stock")!;
              const position = getZoneBasePos(stock);
              return (
                <Pressable
                  style={{
                    position: "absolute",
                    left: position.x,
                    top: position.y,
                    width: cardWidth,
                    height: cardHeight,
                  }}
                  onPress={onDrawPress}
                />
              );
            })()}
        </View>
        {dragGhost && (
          <DragGhostCards
            ghost={dragGhost}
            translate={dragTranslate}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize="small"
            isValidDrop={hoverTarget !== null}
            validDropColor={hoverMoveType === "build" ? "purple" : "blue"}
          />
        )}
      </View>
    </GameWrapper>
  );
}
