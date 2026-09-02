import { Button } from "@/components/Button/Button";
import { AnimatedCardMapping } from "@/components/Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  isJoker,
  isRed,
  PlayingCard,
  rankValue,
  shuffle,
} from "@/components/Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "@/components/Cards/CardMap";
import { GameWrapper } from "@/components/common/GameWrapper";
import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { useMemo, useState } from "react";
import { View } from "react-native";

const TOWER_ROWS = 5;
const TOWER_COLS = 2;
const MAX_ACTIONS = 3;
const MAX_HITS = 3;

type Phase = "actions" | "hit";
type ActionMode = "move" | "swap";

export type KongTowerGameState = {
  tower: PlayingCard[];
  towerDraw: PlayingCard[];
  towerDiscard: PlayingCard[];
  available: PlayingCard[];
  planeDraw: PlayingCard[];
  planeDiscard: PlayingCard[];
  hits: PlayingCard[];
  removed: PlayingCard[];
  activeIndex: number;
  lockedRows: number[];
  actionsLeft: number;
  phase: Phase;
  pendingHit: PlayingCard | null;
  ended: boolean;
  won: boolean;
};

const gameStateInitial: KongTowerGameState = {
  tower: [],
  towerDraw: [],
  towerDiscard: [],
  available: [],
  planeDraw: [],
  planeDiscard: [],
  hits: [],
  removed: [],
  activeIndex: 0,
  lockedRows: [],
  actionsLeft: MAX_ACTIONS,
  phase: "actions",
  pendingHit: null,
  ended: false,
  won: false,
};

function rowOf(index: number) {
  return Math.floor(index / TOWER_COLS);
}

function colOf(index: number) {
  return index % TOWER_COLS;
}

function areAdjacent(firstIndex: number, secondIndex: number) {
  if (firstIndex === secondIndex) return false;
  return (
    Math.abs(rowOf(firstIndex) - rowOf(secondIndex)) <= 1 &&
    Math.abs(colOf(firstIndex) - colOf(secondIndex)) <= 1
  );
}

function isLockedIndex(state: KongTowerGameState, index: number) {
  return state.lockedRows.includes(rowOf(index));
}

function canLockNextRow(state: KongTowerGameState) {
  const nextRow = state.lockedRows.length;
  return (
    state.phase === "actions" &&
    state.actionsLeft > 0 &&
    nextRow < TOWER_ROWS - 1 &&
    rowOf(state.activeIndex) === nextRow + 1
  );
}

function ascendingPathExists(tower: PlayingCard[], activeIndex: number) {
  if (tower.length !== TOWER_ROWS * TOWER_COLS) return false;

  const concrete = tower
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !isJoker(card))
    .sort((first, second) => rankValue(first.card) - rankValue(second.card));

  if (
    concrete.some(
      (entry, index) =>
        index > 0 &&
        rankValue(entry.card) === rankValue(concrete[index - 1].card),
    )
  ) {
    return false;
  }

  const joker = tower.findIndex(isJoker);
  const insertionPoints =
    joker < 0 ? [-1] : Array.from({ length: tower.length }, (_, i) => i);

  return insertionPoints.some((insertionPoint) => {
    const path = concrete.map(({ index }) => index);
    if (joker >= 0) path.splice(insertionPoint, 0, joker);
    if (rowOf(path[0]) !== 0 || path.at(-1) !== activeIndex) return false;
    return path.every(
      (index, pathIndex) =>
        pathIndex === 0 || areAdjacent(path[pathIndex - 1], index),
    );
  });
}

function drawPlaneCard(state: KongTowerGameState) {
  if (state.planeDraw.length === 0) {
    state.planeDraw = shuffle(state.planeDiscard.map(flipToBack));
    state.planeDiscard = [];
  }
  const card = state.planeDraw.pop();
  return card ? flipToFace(card) : null;
}

function startNextTurn(state: KongTowerGameState) {
  state.towerDiscard.push(...state.available.map(flipToBack));
  state.available = [];

  if (state.towerDraw.length <= 1) {
    state.towerDraw = shuffle(
      [...state.towerDraw, ...state.towerDiscard].map(flipToBack),
    );
    state.towerDiscard = [];
  }

  for (let index = 0; index < 2; index += 1) {
    const card = state.towerDraw.pop();
    if (card) state.available.push(flipToFace(card));
  }
  state.actionsLeft = MAX_ACTIONS;
  state.phase = "actions";
}

function performPlaneAttack(state: KongTowerGameState) {
  const attackCount = rowOf(state.activeIndex) + 1;
  const activeCard = state.tower[state.activeIndex];

  for (let draw = 0; draw < attackCount; draw += 1) {
    const planeCard = drawPlaneCard(state);
    if (!planeCard) break;
    if (isJoker(planeCard) || planeCard.rank === activeCard.rank) {
      state.pendingHit = planeCard;
      state.phase = "hit";
      return;
    }
    state.planeDiscard.push(flipToBack(planeCard));
  }

  startNextTurn(state);
}

function createInitialState(): KongTowerGameState {
  const deck = createDeck({ includeJokers: true, faceUp: false });
  const blackCards = shuffle(deck.filter((card) => !isRed(card.suit)));
  const planeDraw = shuffle(deck.filter((card) => isRed(card.suit)));
  const tower = blackCards.splice(0, TOWER_ROWS * TOWER_COLS);
  const state: KongTowerGameState = {
    tower,
    towerDraw: blackCards,
    towerDiscard: [],
    available: [],
    planeDraw,
    planeDiscard: [],
    hits: [],
    removed: [],
    activeIndex: 0,
    lockedRows: [],
    actionsLeft: MAX_ACTIONS,
    phase: "actions",
    pendingHit: null,
    ended: false,
    won: false,
  };
  startNextTurn(state);
  return state;
}

export const kongTowerRules = {
  areAdjacent,
  canLockNextRow,
  ascendingPathExists,
  startNextTurn,
  performPlaneAttack,
  createInitialState,
};

export default function KongTower() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();
  const [actionMode, setActionMode] = useState<ActionMode>("move");
  const [peekedRow, setPeekedRow] = useState<number | null>(null);
  const { game, setGame, reset, isLoaded, canUndo, undo, saveUndoState } =
    useStateManager<KongTowerGameState>({
      gameStateInitial: createInitialState(),
      resetAndSetup: async () => {
        setGame(createInitialState());
      },
      resetNonGameStates: () => {
        setActionMode("move");
        setPeekedRow(null);
      },
    });

  function spendAction(update: (draft: KongTowerGameState) => void) {
    if (game.phase !== "actions" || game.ended || game.actionsLeft <= 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      update(draft);
      draft.actionsLeft -= 1;
    });
    setPeekedRow(null);
  }

  function selectTowerCard(index: number) {
    if (!areAdjacent(game.activeIndex, index)) {
      return;
    }
    if (
      actionMode === "swap" &&
      (isLockedIndex(game, index) || isLockedIndex(game, game.activeIndex))
    ) {
      return;
    }

    spendAction((draft) => {
      if (actionMode === "swap") {
        [draft.tower[draft.activeIndex], draft.tower[index]] = [
          draft.tower[index],
          draft.tower[draft.activeIndex],
        ];
        draft.activeIndex = index;
      } else {
        draft.activeIndex = index;
      }
    });
  }

  function swapAvailable(index: number) {
    if (isLockedIndex(game, game.activeIndex)) return;
    spendAction((draft) => {
      const active = draft.tower[draft.activeIndex];
      draft.tower[draft.activeIndex] = flipToBack(draft.available[index]);
      draft.available[index] = flipToFace(active);
    });
  }

  function peek() {
    const row = rowOf(game.activeIndex) - 1;
    if (
      row < 0 ||
      game.phase !== "actions" ||
      game.ended ||
      game.actionsLeft <= 0
    ) {
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.actionsLeft -= 1;
    });
    setPeekedRow(row);
  }

  function lockRow() {
    if (!canLockNextRow(game)) return;
    spendAction((draft) => draft.lockedRows.push(draft.lockedRows.length));
  }

  function endTurn() {
    if (game.phase !== "actions" || game.ended) return;
    saveUndoState(structuredClone(game));
    setPeekedRow(null);
    setGame((draft) => performPlaneAttack(draft));
  }

  function resolveHit(swat: boolean) {
    if (game.phase !== "hit" || !game.pendingHit || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const hit = draft.pendingHit;
      if (!hit) return;
      draft.pendingHit = null;

      if (swat && draft.towerDraw.length >= 2) {
        draft.removed.push(draft.towerDraw.pop()!, draft.towerDraw.pop()!);
        draft.planeDiscard.push(flipToBack(hit));
      } else {
        draft.hits.push(hit);
        if (draft.hits.length >= MAX_HITS) {
          draft.ended = true;
          draft.won = false;
          return;
        }
      }
      startNextTurn(draft);
    });
  }

  function finishClimb() {
    if (rowOf(game.activeIndex) !== TOWER_ROWS - 1 || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.ended = true;
      draft.won = ascendingPathExists(draft.tower, draft.activeIndex);
    });
  }

  const zones = useMemo<MapZone[]>(() => {
    const towerZones = game.tower.map((card, index) => {
      const row = rowOf(index);
      const visible =
        index === game.activeIndex ||
        game.lockedRows.includes(row) ||
        peekedRow === row ||
        game.ended;
      return {
        id: `tower-${index}`,
        name: "tower",
        pileIndex: index,
        cards: [visible ? flipToFace(card) : flipToBack(card)],
        col: colOf(index),
        row: TOWER_ROWS - 1 - row,
        baseZIndex: 10,
        placeholder: {},
      };
    });

    return [
      ...towerZones,
      {
        id: "tower-draw",
        name: "tower-draw",
        cards: game.towerDraw,
        col: 2.5,
        row: 3,
        placeholder: { text: "Tower", showCount: true },
      },
      ...game.available.map((card, index) => ({
        id: `available-${index}`,
        name: "available",
        pileIndex: index,
        cards: [card],
        col: 2.5 + index,
        row: 4,
        placeholder: { text: "Available" },
      })),
      {
        id: "plane-draw",
        name: "plane-draw",
        cards: game.planeDraw,
        col: 4.5,
        row: 0,
        placeholder: { text: "Planes", showCount: true },
      },
      {
        id: "pending-hit",
        name: "pending-hit",
        cards: game.pendingHit ? [game.pendingHit] : [],
        col: 4.5,
        row: 1.2,
        placeholder: { text: "Attack" },
      },
      {
        id: "hits",
        name: "hits",
        cards: game.hits,
        col: 4.5,
        row: 2.4,
        fan: { direction: "down", offset: 0.2 },
        placeholder: { text: `Hits ${game.hits.length}/${MAX_HITS}` },
      },
      { id: "status", col: 2.3, row: 0, width: 2, height: 1.8 },
      { id: "controls", col: 2.3, row: 1.5, width: 2, height: 1.3 },
    ];
  }, [game, peekedRow]);

  const cardMapper = (mappedCard: MappedCard): AnimatedCardMapping => {
    if (mappedCard.zoneName === "tower") {
      const index = mappedCard.pileIndex ?? -1;
      const active = index === game.activeIndex;
      return {
        onPress: () => selectTowerCard(index),
        isDisabled: active || game.phase !== "actions" || game.ended,
        isSelected: active,
        selectColor: active ? Colors.buttonOrange : "none",
        forceOverlayColor: active,
      };
    }
    if (mappedCard.zoneName === "available") {
      return {
        onPress: () => swapAvailable(mappedCard.pileIndex ?? -1),
        isDisabled:
          game.phase !== "actions" ||
          game.ended ||
          isLockedIndex(game, game.activeIndex),
      };
    }
    return {};
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    fixedCols: 5.5,
    fixedRows: 5,
    gap: 0.12,
  });

  const onTop = rowOf(game.activeIndex) === TOWER_ROWS - 1;
  const status =
    game.phase === "hit"
      ? "The plane scored a hit"
      : `${game.actionsLeft} action${game.actionsLeft === 1 ? "" : "s"} left`;

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        game.won ? "Kong reached the summit!" : "Kong fell from the tower."
      }
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("status"),
          flexStyles.colCentered,
          { gap: spacing(6) },
        ]}
      >
        <Text size="sm" color={colorPale}>
          {status}
        </Text>
        <View style={[flexStyles.rowCentered, { gap: spacing(6) }]}>
          {Array.from({ length: MAX_HITS }, (_, index) => (
            <View
              key={`hit-dot-${index}`}
              style={{
                width: spacing(12),
                height: spacing(12),
                borderRadius: spacing(6),
                backgroundColor: rgba(
                  Colors.lose,
                  index < game.hits.length ? 1 : 0.25,
                ),
              }}
            />
          ))}
        </View>
      </View>

      <View
        style={[
          getZoneStylesById("controls"),
          flexStyles.colCentered,
          { gap: spacing(8) },
        ]}
      >
        {game.phase === "hit" ? (
          <>
            <Button
              text="Swat"
              theme="orange"
              size="sm"
              fullWidth
              disabled={game.towerDraw.length < 2}
              onPress={() => resolveHit(true)}
            />
            <Button
              text="Take Hit"
              theme="red"
              size="sm"
              fullWidth
              onPress={() => resolveHit(false)}
            />
          </>
        ) : (
          <>
            <View style={[flexStyles.rowCentered, { gap: spacing(6) }]}>
              <Button
                text="Move"
                size="xs"
                theme={actionMode === "move" ? "green" : "blue"}
                disabled={game.ended}
                onPress={() => setActionMode("move")}
              />
              <Button
                text="Swap"
                size="xs"
                theme={actionMode === "swap" ? "green" : "blue"}
                disabled={game.ended}
                onPress={() => setActionMode("swap")}
              />
            </View>
            <View style={[flexStyles.rowCentered, { gap: spacing(6) }]}>
              <Button
                text="Peek"
                size="xs"
                disabled={
                  rowOf(game.activeIndex) === 0 ||
                  game.actionsLeft === 0 ||
                  game.ended
                }
                onPress={peek}
              />
              <Button
                text="Lock"
                size="xs"
                disabled={!canLockNextRow(game) || game.ended}
                onPress={lockRow}
              />
            </View>
            <Button
              text={onTop ? "Finish Climb" : "Plane Attack"}
              theme={onTop ? "green" : "red"}
              size="sm"
              fullWidth
              disabled={game.ended}
              onPress={onTop ? finishClimb : endTurn}
            />
          </>
        )}
      </View>
    </GameWrapper>
  );
}
