import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import {
  flipAllToBack,
  flipAllToFace,
  sortCardsBySuit,
  zoneFanOffset,
} from "../Cards/card-utils";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { Text } from "../common/Text";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { ProgressBar } from "../Home/ProgressBar";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";

const SIZE = 6;
const CELLS = SIZE * SIZE;
const winTarget = 21;

export type GridlinesCell = { card: PlayingCard | null; faceUp: boolean };
type GameState = {
  grid: GridlinesCell[];
  hand: PlayingCard[];
  playerWon: PlayingCard[];
  gridWon: PlayingCard[];
  discard: PlayingCard[];
  trump: PlayingCard | null;
  trumpPhase: boolean;
  youScore: number;
  gridScore: number;
  round: number;
  ended: boolean;
  won: boolean;
};

export type GridlinesGameState = GameState;

const gameStateInitial: GameState = {
  grid: Array.from({ length: CELLS }, () => ({ card: null, faceUp: false })),
  hand: [],
  playerWon: [],
  gridWon: [],
  discard: flipAllToBack(shuffle(createDeck().filter((c) => c.rank !== "10"))),
  trump: null,
  trumpPhase: false,
  youScore: 0,
  gridScore: 0,
  round: 1,
  ended: false,
  won: false,
};

type Orient = "row" | "col";
type Dir = "fwd" | "rev";

function rankHigh(card: PlayingCard) {
  return rankValue(card, 14);
}

function orderedCells(orient: Orient, index: number, dir: Dir) {
  const cells: number[] = [];
  if (orient === "row") {
    for (let c = 0; c < SIZE; c += 1) cells.push(index * SIZE + c);
  } else {
    for (let r = 0; r < SIZE; r += 1) cells.push(r * SIZE + index);
  }
  if (dir === "rev") cells.reverse();
  return cells;
}

function lineFull(grid: GridlinesCell[], orient: Orient, index: number) {
  return orderedCells(orient, index, "fwd").every((i) => grid[i].card !== null);
}

export type GridlinesChallengeResolution =
  | {
      type: "matched";
      cellIndex: number;
      youWin: boolean;
      revealCells: number[];
    }
  | {
      type: "trump";
      cellIndex: number;
      youWin: false;
      revealCells: number[];
    }
  | { type: "free"; cells: number[]; revealCells: number[] };

function resolveLineChallenge(
  grid: GridlinesCell[],
  cells: number[],
  handCard: PlayingCard,
  trumpSuit?: PlayingCard["suit"],
): GridlinesChallengeResolution | null {
  const lineCards = cells.map((cellIndex) => grid[cellIndex]?.card ?? null);
  if (lineCards.some((card) => card === null)) return null;

  const matchPosition = lineCards.findIndex(
    (card) => card?.suit === handCard.suit,
  );
  if (matchPosition >= 0) {
    const gridCard = lineCards[matchPosition] as PlayingCard;
    return {
      type: "matched",
      cellIndex: cells[matchPosition],
      youWin: rankHigh(handCard) > rankHigh(gridCard),
      revealCells: cells.slice(0, matchPosition + 1),
    };
  }

  if (trumpSuit && trumpSuit !== handCard.suit) {
    const trumpCells = cells.filter(
      (cellIndex) => grid[cellIndex].card?.suit === trumpSuit,
    );
    if (trumpCells.length > 0) {
      const cellIndex = trumpCells.reduce((lowest, candidate) =>
        rankHigh(grid[candidate].card!) < rankHigh(grid[lowest].card!)
          ? candidate
          : lowest,
      );
      return {
        type: "trump",
        cellIndex,
        youWin: false,
        revealCells: [...cells],
      };
    }
  }

  return { type: "free", cells: [...cells], revealCells: [...cells] };
}

function endTrickChecks(draft: GameState, gridTarget: number) {
  if (draft.youScore >= winTarget) {
    draft.ended = true;
    draft.won = true;
    return;
  }
  if (draft.gridScore >= gridTarget) {
    draft.ended = true;
    draft.won = false;
    return;
  }
  if (draft.hand.length === 0) draft.round += 1;
}

function applyTrickResultAction(
  draft: GameState,
  handIndex: number,
  cellIndex: number,
  youWin: boolean,
  gridTarget: number,
) {
  if (draft.ended) return false;
  const handCard = draft.hand[handIndex];
  const gridCard = draft.grid[cellIndex]?.card;
  if (!handCard || !gridCard) return false;

  draft.grid[cellIndex] = { card: null, faceUp: false };
  draft.hand.splice(handIndex, 1);
  if (youWin) {
    draft.youScore += 1;
    draft.playerWon.push(...flipAllToBack([gridCard, handCard]));
  } else {
    draft.gridScore += 1;
    draft.gridWon.push(...flipAllToBack([gridCard, handCard]));
  }
  endTrickChecks(draft, gridTarget);
  return true;
}

export const gridlinesRules = {
  rankHigh,
  orderedCells,
  lineFull,
  resolveLineChallenge,
  applyTrickResultAction,
  size: SIZE,
  winTarget,
};

// ── Component ────────────────────────────────────────────────────────────────
export default function Gridlines() {
  const { spacing } = useResponsiveMetrics();
  const { colorDark, colorPale } = useGameColors();
  const hardMode = useGameSettingValue("gridlinesHard") as boolean;

  const [selectedHand, setSelectedHand] = useState<number | null>(null);
  const [pendingPick, setPendingPick] = useState<{
    handIndex: number;
    cells: number[];
  } | null>(null);
  const [resolvingChallenge, setResolvingChallenge] = useState(false);
  const [resolvedCell, setResolvedCell] = useState<{
    index: number;
    color: "green" | "red";
  } | null>(null);

  async function startRound(initialDeal = false) {
    setGame((draft) => {
      const completedCells = new Set<number>();

      for (const orient of ["row", "col"] as const) {
        for (let index = 0; index < SIZE; index += 1) {
          const cells = orderedCells(orient, index, "fwd");
          if (
            cells.some(
              (cellIndex) =>
                draft.grid[cellIndex].card !== null &&
                !draft.grid[cellIndex].faceUp,
            )
          ) {
            continue;
          }
          cells.forEach((cellIndex) => completedCells.add(cellIndex));
        }
      }

      const gatheredGridCards = [...completedCells]
        .map((cellIndex) => draft.grid[cellIndex].card)
        .filter((card): card is PlayingCard => card !== null);

      draft.discard = flipAllToBack(
        shuffle([
          ...draft.discard,
          ...draft.playerWon,
          ...draft.gridWon,
          ...draft.hand,
          ...(draft.trump ? [draft.trump] : []),
          ...gatheredGridCards,
        ]),
      );

      completedCells.forEach((cellIndex) => {
        draft.grid[cellIndex] = { card: null, faceUp: false };
      });
      draft.playerWon = [];
      draft.gridWon = [];
      draft.hand = [];
      draft.trump = null;
      draft.trumpPhase = false;
    });

    await delay();

    setGame((draft) => {
      for (let i = 0; i < draft.grid.length; i += 1) {
        const cell = draft.grid[i];
        if (cell.card === null) {
          cell.card = draft.discard.pop() ?? null;
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          cell.faceUp = initialDeal && r + c === SIZE - 1;
        }
      }
    });

    await delay();

    setGame((draft) => {
      draft.hand = flipAllToFace(
        sortCardsBySuit(draft.discard.splice(0, 7), 14),
      );
      draft.trumpPhase = true;
    });
  }

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedHand(null);
        setPendingPick(null);
        setResolvingChallenge(false);
        setResolvedCell(null);
      },
      resetAndSetup: async () => {
        setGame((draft) => {
          // Gather all cards to discard pile, face down.
          const allCards = [
            ...draft.discard,
            ...draft.playerWon,
            ...draft.gridWon,
            ...(draft.grid.map((c) => c.card).filter(Boolean) as PlayingCard[]),
            ...draft.hand,
            ...(draft.trump ? [draft.trump] : []),
          ];
          draft.discard = flipAllToBack(shuffle(allCards));
          draft.grid = Array.from({ length: CELLS }, () => ({
            card: null,
            faceUp: false,
          }));
          draft.hand = [];
          draft.playerWon = [];
          draft.gridWon = [];
          draft.trump = null;
          draft.trumpPhase = false;
        });

        await delay();

        setGame((draft) => {
          draft.youScore = 0;
          draft.gridScore = 0;
          draft.round = 1;
          draft.ended = false;
          draft.won = false;
        });

        await startRound(true);
      },
    });

  const gridTarget = hardMode ? 15 : winTarget;

  function pickTrump(handIndex: number) {
    if (!game.trumpPhase || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.trump = draft.hand.splice(handIndex, 1)[0] ?? null;
      draft.trumpPhase = false;
    });
    setSelectedHand(null);
  }

  async function challenge(orient: Orient, index: number, dir: Dir) {
    if (
      game.ended ||
      game.trumpPhase ||
      pendingPick ||
      resolvingChallenge ||
      selectedHand === null
    ) {
      return;
    }

    if (!lineFull(game.grid, orient, index)) return;

    const handIndex = selectedHand;
    const hc = game.hand[handIndex];
    if (!hc) return;
    const cells = orderedCells(orient, index, dir);
    const resolution = resolveLineChallenge(
      game.grid,
      cells,
      hc,
      game.trump?.suit,
    );
    if (!resolution) return;

    setResolvingChallenge(true);
    saveUndoState(structuredClone(game));

    try {
      for (const cellIndex of resolution.revealCells) {
        const cell = game.grid[cellIndex];
        if (!cell.card) continue;

        if (!cell.faceUp) {
          setGame((draft) => {
            draft.grid[cellIndex].faceUp = true;
          });

          await delay(400);
        }
      }

      if (resolution.type === "matched" || resolution.type === "trump") {
        const removed = resolution.cellIndex;
        const youWin = resolution.youWin;
        const shouldStartRound =
          game.hand.length === 1 &&
          (youWin ? game.youScore + 1 : game.youScore) < winTarget &&
          (!youWin ? game.gridScore + 1 : game.gridScore) < gridTarget;

        setResolvedCell({ index: removed, color: youWin ? "green" : "red" });

        await delay(1000);

        setGame((draft) => {
          applyTrickResultAction(draft, handIndex, removed, youWin, gridTarget);
        });

        setResolvedCell(null);
        setSelectedHand(null);

        if (shouldStartRound) {
          await delay(1000);

          await startRound();
        }
        return;
      }

      // No matching suit and no trump: the user may pick any revealed card.
      setPendingPick({ handIndex, cells: resolution.cells });
    } finally {
      setResolvingChallenge(false);
    }
  }

  async function completeFreePick(cellIndex: number) {
    if (!pendingPick || !pendingPick.cells.includes(cellIndex)) return;
    const { handIndex } = pendingPick;
    const gridCard = game.grid[cellIndex].card;
    if (!gridCard) return;
    const shouldStartRound =
      game.hand.length === 1 && game.youScore + 1 < winTarget;

    setResolvingChallenge(true);
    setResolvedCell({ index: cellIndex, color: "green" });

    setGame((draft) => {
      applyTrickResultAction(draft, handIndex, cellIndex, true, gridTarget);
    });

    setPendingPick(null);
    setSelectedHand(null);
    setResolvedCell(null);
    setResolvingChallenge(false);
    if (shouldStartRound) await startRound();
  }

  function onHandPress(index: number) {
    if (game.ended || resolvingChallenge) return;
    if (game.trumpPhase) {
      pickTrump(index);
      return;
    }
    if (pendingPick) return;
    setSelectedHand((s) => (s === index ? null : index));
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const gridLeft = 0.8;
  const gridTop = 1.7;
  const handRow = gridTop + SIZE + 1; // below grid + bottom markers
  const cellCol = (c: number) => gridLeft + c;
  const cellRow = (r: number) => gridTop + r;

  const zones: MapZone[] = useMemo(() => {
    const result: MapZone[] = [
      // Discard
      {
        id: "discard",
        col: 0,
        row: 0,
        cards: game.discard,
        baseZIndex: 60,
        placeholder: { text: "Discard", infoPos: "right", showCount: false },
      },
      // HUD
      { id: "hud", col: 1.75, row: 0, width: 4, baseZIndex: 1 },
      // Trump
      {
        id: "trump",
        name: "trump",
        cards: game.trump ? [game.trump] : [],
        col: 6.6,
        row: 0,
        baseZIndex: 60,
        placeholder: { text: "Trump", infoPos: "left", showCount: false },
      },

      // Player won cards
      {
        id: "player-won",
        col: 0,
        row: handRow - 0.1,
        cards: game.playerWon,
        baseZIndex: 60,
        placeholder: {},
      },
      // Hand
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 1.3,
        row: handRow - 0.2,
        width: 5,
        height: 1.2,
        baseZIndex: 20,
        fan: {
          offset: zoneFanOffset(game.hand.length, 5, 0.3, 0.9),
          direction: "right",
        },
        placeholder: {},
      },

      // Grid won cards
      {
        id: "grid-won",
        col: 6.6,
        row: handRow - 0.1,
        cards: game.gridWon,
        baseZIndex: 60,
        placeholder: {},
      },
    ];

    game.grid.forEach((cell, i) => {
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      result.push({
        id: `cell-${i}`,
        name: "cell",
        pileIndex: i,
        cards: cell.card
          ? [cell.faceUp ? flipToFace(cell.card) : flipToBack(cell.card)]
          : [],
        col: cellCol(c),
        row: cellRow(r),
        baseZIndex: 2,
        placeholder: cell.card ? undefined : { hideBackground: true },
      });
    });

    // Perimeter marker anchor zones (rendered as arrow buttons).
    for (let r = 0; r < SIZE; r += 1) {
      result.push({
        id: `mk-row-${r}-L`,
        col: 0,
        row: cellRow(r),
        width: 0.8,
        height: 1,
      });
      result.push({
        id: `mk-row-${r}-R`,
        col: gridLeft + SIZE,
        row: cellRow(r),
        width: 0.8,
        height: 1,
      });
    }
    for (let c = 0; c < SIZE; c += 1) {
      result.push({
        id: `mk-col-${c}-T`,
        col: cellCol(c),
        row: 1.1,
        width: 1,
        height: 0.6,
      });
      result.push({
        id: `mk-col-${c}-B`,
        col: cellCol(c),
        row: gridTop + SIZE,
        width: 1,
        height: 0.6,
      });
    }

    return result;
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "cell" && mappedCard.pileIndex !== undefined) {
      const idx = mappedCard.pileIndex;
      const pickable = !!pendingPick && pendingPick.cells.includes(idx);
      const isResolved = resolvedCell?.index === idx;

      return {
        isDisabled: !pickable,
        forceOverlayColor: isResolved || pickable,
        selectColor: isResolved
          ? resolvedCell.color
          : pickable
            ? "green"
            : "none",
        onPress: () => completeFreePick(idx),
      };
    } else if (mappedCard.zoneName === "hand") {
      const index = mappedCard.cardIndex;
      const isSelected = selectedHand === index;

      return {
        isSelected,
        forceOverlayColor: game.trumpPhase,
        selectColor: game.trumpPhase
          ? "pink"
          : resolvedCell && isSelected
            ? resolvedCell.color
            : "blue",
        isDisabled: game.ended || !!pendingPick,
        onPress: () => onHandPress(index),
      };
    }
    return {};
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0.1,
    cardSize: "small",
  });

  const markerActive =
    selectedHand !== null &&
    !game.trumpPhase &&
    !pendingPick &&
    !resolvingChallenge &&
    !game.ended;

  const markers: {
    id: string;
    label: string;
    orient: Orient;
    index: number;
    dir: Dir;
  }[] = [];
  for (let r = 0; r < SIZE; r += 1) {
    markers.push({
      id: `mk-row-${r}-L`,
      label: "\u25B6",
      orient: "row",
      index: r,
      dir: "fwd",
    });
    markers.push({
      id: `mk-row-${r}-R`,
      label: "\u25C0",
      orient: "row",
      index: r,
      dir: "rev",
    });
  }
  for (let c = 0; c < SIZE; c += 1) {
    markers.push({
      id: `mk-col-${c}-T`,
      label: "\u25BC",
      orient: "col",
      index: c,
      dir: "fwd",
    });
    markers.push({
      id: `mk-col-${c}-B`,
      label: "\u25B2",
      orient: "col",
      index: c,
      dir: "rev",
    });
  }

  const statusText = game.trumpPhase
    ? "Choose a trump card"
    : pendingPick
      ? "Pick a revealed card"
      : selectedHand !== null
        ? "Select a line"
        : "Select a hand card";

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? `You beat the grid ${game.youScore}-${game.gridScore}!`
          : `The grid wins ${game.gridScore}-${game.youScore}.`
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          flexStyles.colCentered,
          flexStyles.spaceAround,
          getZoneStylesById("hud"),
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              width: "100%",
              gap: spacing(10),
            },
          ]}
        >
          <ProgressBar
            progressValue={game.youScore}
            totalValue={winTarget}
            color={Colors.winDark}
            autoTallyText
            scaledHeight={cardHeight * 0.4}
            style={{ flex: 1 }}
          />
          <ProgressBar
            progressValue={game.gridScore}
            totalValue={gridTarget}
            color={Colors.loseDark}
            autoTallyText
            scaledHeight={cardHeight * 0.4}
            style={{ flex: 1 }}
          />
        </View>

        <Text size="sm" weight={400} color={colorPale} lineHeight={1}>
          {statusText}
        </Text>
      </View>

      {markers.map((m) => {
        const available = lineFull(game.grid, m.orient, m.index);
        const enabled = markerActive && available;

        return (
          <View key={m.id} style={[getZoneStylesById(m.id)]}>
            <Button
              text={m.label}
              size="xxs"
              onPress={() => challenge(m.orient, m.index, m.dir)}
              disabled={!enabled}
              fullWidth
              theme={colorDark}
              style={{
                borderRadius: spacing(8),
                padding: 0,
                width: "100%",
                height: "100%",
                borderWidth: 0,
                opacity: available ? (enabled ? 1 : 0.6) : 0,
              }}
            />
          </View>
        );
      })}
    </GameWrapper>
  );
}
