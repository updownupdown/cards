import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { flipAllToFace } from "../Cards/card-utils";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { Text } from "../common/Text";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  type CardSuit,
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const SIZE = 6;
const CELLS = SIZE * SIZE;
const winTarget = 21;

type Cell = { card: PlayingCard | null; faceUp: boolean };
type GameState = {
  grid: Cell[];
  hand: PlayingCard[];
  trump: PlayingCard | null;
  trumpPhase: boolean;
  youScore: number;
  gridScore: number;
  round: number;
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  grid: Array.from({ length: CELLS }, () => ({ card: null, faceUp: false })),
  hand: [],
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

// Aces are high in Optrita.
function rankHigh(card: PlayingCard) {
  return card.rank === "A" ? 14 : rankValue(card);
}
const SUIT_GLYPH: Record<CardSuit, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};

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
function lineFull(grid: Cell[], orient: Orient, index: number) {
  return orderedCells(orient, index, "fwd").every((i) => grid[i].card !== null);
}

function buildDeck() {
  // 48 cards: A, 2-9, J, Q, K in four suits (no 10s, no jokers).
  return createDeck().filter((c) => c.rank !== "10");
}

// ── Component ────────────────────────────────────────────────────────────────
export default function OptritaLines() {
  const { cardBg, cardText } = useGameZoneBackground();
  const hardMode = useGameSettingValue("optritaHard") as boolean;

  const [selectedHand, setSelectedHand] = useState<number | null>(null);
  const [pendingPick, setPendingPick] = useState<{
    handIndex: number;
    cells: number[];
  } | null>(null);

  function startRound(draft: GameState) {
    const deck = shuffle(buildDeck());
    const grid: Cell[] = [];
    for (let i = 0; i < CELLS; i += 1) {
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      grid.push({ card: deck.pop() ?? null, faceUp: r + c === SIZE - 1 });
    }
    draft.grid = grid;
    draft.hand = flipAllToFace(deck.splice(0, 7));
    draft.trump = null;
    draft.trumpPhase = true;
  }

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedHand(null);
        setPendingPick(null);
      },
      resetAndSetup: async () => {
        setGame((draft) => {
          draft.youScore = 0;
          draft.gridScore = 0;
          draft.round = 1;
          draft.ended = false;
          draft.won = false;
          startRound(draft);
        });
        await delay();
      },
    });

  const gridTarget = hardMode ? 15 : winTarget;

  function endTrickChecks(draft: GameState) {
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
    if (draft.hand.length === 0) {
      draft.round += 1;
      startRound(draft);
    }
  }

  function pickTrump(handIndex: number) {
    if (!game.trumpPhase || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.trump = draft.hand.splice(handIndex, 1)[0] ?? null;
      draft.trumpPhase = false;
    });
    setSelectedHand(null);
  }

  function challenge(orient: Orient, index: number, dir: Dir) {
    if (game.ended || game.trumpPhase || pendingPick || selectedHand === null) {
      return;
    }
    if (!lineFull(game.grid, orient, index)) return;

    const handIndex = selectedHand;
    const hc = game.hand[handIndex];
    if (!hc) return;
    const cells = orderedCells(orient, index, dir);

    const matchPos = cells.findIndex(
      (i) => game.grid[i].card && game.grid[i].card!.suit === hc.suit,
    );

    saveUndoState(structuredClone(game));

    if (matchPos >= 0) {
      const removed = cells[matchPos];
      const gridCard = game.grid[removed].card!;
      const youWin = rankHigh(hc) > rankHigh(gridCard);
      setGame((draft) => {
        for (let k = 0; k <= matchPos; k += 1)
          draft.grid[cells[k]].faceUp = true;
        draft.grid[removed] = { card: null, faceUp: false };
        draft.hand.splice(handIndex, 1);
        if (youWin) draft.youScore += 1;
        else draft.gridScore += 1;
        endTrickChecks(draft);
      });
      setSelectedHand(null);
      return;
    }

    // No same-suit card: reveal the whole line, then resolve by trump.
    const trumpSuit = game.trump?.suit;
    const trumpCells =
      trumpSuit && trumpSuit !== hc.suit
        ? cells.filter((i) => game.grid[i].card!.suit === trumpSuit)
        : [];

    if (trumpCells.length > 0) {
      let low = trumpCells[0];
      for (const i of trumpCells) {
        if (rankHigh(game.grid[i].card!) < rankHigh(game.grid[low].card!))
          low = i;
      }
      setGame((draft) => {
        for (const i of cells) draft.grid[i].faceUp = true;
        draft.grid[low] = { card: null, faceUp: false };
        draft.hand.splice(handIndex, 1);
        draft.gridScore += 1; // trump always wins
        endTrickChecks(draft);
      });
      setSelectedHand(null);
      return;
    }

    // No matching suit and no trump: reveal all, you win and pick any card.
    setGame((draft) => {
      for (const i of cells) draft.grid[i].faceUp = true;
    });
    setPendingPick({ handIndex, cells: [...cells] });
  }

  function completeFreePick(cellIndex: number) {
    if (!pendingPick || !pendingPick.cells.includes(cellIndex)) return;
    const { handIndex } = pendingPick;
    setGame((draft) => {
      draft.grid[cellIndex] = { card: null, faceUp: false };
      draft.hand.splice(handIndex, 1);
      draft.youScore += 1;
      endTrickChecks(draft);
    });
    setPendingPick(null);
    setSelectedHand(null);
  }

  function onHandPress(index: number) {
    if (game.ended) return;
    if (game.trumpPhase) {
      pickTrump(index);
      return;
    }
    if (pendingPick) return;
    setSelectedHand((s) => (s === index ? null : index));
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const gridLeft = 1;
  const gridTop = 1.7;
  const handRow = gridTop + SIZE + 1.1; // below grid + bottom markers
  const cellCol = (c: number) => gridLeft + c;
  const cellRow = (r: number) => gridTop + r;

  const zones: MapZone[] = useMemo(() => {
    const result: MapZone[] = [
      { id: "hud", col: 0, row: 0, width: "full", height: 0.65 },
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
        col: 0.15,
        row: cellRow(r),
        width: 0.75,
        height: 0.9,
      });
      result.push({
        id: `mk-row-${r}-R`,
        col: gridLeft + SIZE + 0.1,
        row: cellRow(r),
        width: 0.75,
        height: 0.9,
      });
    }
    for (let c = 0; c < SIZE; c += 1) {
      result.push({
        id: `mk-col-${c}-T`,
        col: cellCol(c),
        row: 0.85,
        width: 0.9,
        height: 0.7,
      });
      result.push({
        id: `mk-col-${c}-B`,
        col: cellCol(c),
        row: gridTop + SIZE + 0.05,
        width: 0.9,
        height: 0.7,
      });
    }

    game.hand.forEach((card, i) => {
      result.push({
        id: `hand-${i}`,
        name: "hand",
        pileIndex: i,
        cards: [card],
        col: 0.5 + i,
        row: handRow,
        baseZIndex: 60,
      });
    });

    result.push({
      id: "controls",
      col: 0,
      row: handRow + 1.1,
      width: "full",
      height: 0.8,
    });

    return result;
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "cell" && mappedCard.pileIndex !== undefined) {
      const idx = mappedCard.pileIndex;
      const pickable = !!pendingPick && pendingPick.cells.includes(idx);
      return {
        isDisabled: !pickable,
        selectColor: pickable ? "green" : "none",
        onPress: () => completeFreePick(idx),
      };
    }
    if (mappedCard.zoneName === "hand" && mappedCard.pileIndex !== undefined) {
      const index = mappedCard.pileIndex;
      return {
        isSelected: selectedHand === index,
        selectColor: game.trumpPhase ? "orange" : "blue",
        isDisabled: game.ended || !!pendingPick,
        onPress: () => onHandPress(index),
      };
    }
    return {};
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0.08,
    cardSize: "small",
  });

  const markerActive =
    selectedHand !== null && !game.trumpPhase && !pendingPick && !game.ended;

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
    ? "Choose a trump card (helps the grid)"
    : pendingPick
      ? "Pick any revealed card to capture"
      : selectedHand !== null
        ? "Challenge a line with an arrow"
        : "Select a card from your hand";

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      score={game.youScore}
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
          getZoneStylesById("hud"),
          {
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          },
        ]}
      >
        <Text size="sm" weight={600} color={cardText}>
          You {game.youScore}/{winTarget}
        </Text>
        <Text size="sm" weight={600} color={cardText}>
          Grid {game.gridScore}/{gridTarget}
        </Text>
        <Text size="sm" weight={600} color={cardText}>
          Trump {game.trump ? SUIT_GLYPH[game.trump.suit] : "\u2014"}
        </Text>
      </View>

      {markers.map((m) => {
        const available = lineFull(game.grid, m.orient, m.index);
        const enabled = markerActive && available;
        return (
          <View key={m.id} style={[getZoneStylesById(m.id)]}>
            <Button
              text={m.label}
              size="sm"
              onPress={() => challenge(m.orient, m.index, m.dir)}
              disabled={!enabled}
              fullWidth
              theme={enabled ? cardBg : undefined}
            />
          </View>
        );
      })}

      <View
        style={[
          getZoneStylesById("controls"),
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text size="xs" weight={400} color={cardText}>
          {statusText}
        </Text>
      </View>
    </GameWrapper>
  );
}
