import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToFace,
  redealWith,
  shuffle,
  type CardRank,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";

// Shisen-Sho in cards: two cards of the same rank can be taken together when
// a path of at most three straight lines (two turns) joins them through empty
// spaces. Every deal is built from a way to clear it, so it can always be won.
const COLS = 6;
const ROWS = 8;
const CELLS = COLS * ROWS;
const RANKS_USED: CardRank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
];
const GRID_ROW = 1.15;
const PATH_SHOW_MS = 380;
// Neighbouring pairs make a deal too easy, so the deal-builder favours others.
const NEIGHBOUR_WEIGHT = 0.15;

type Point = [number, number];

type GameState = {
  /** Cards gathered for the deal; empty during play. */
  deal: PlayingCard[];
  /** Row by row; null for an empty space. */
  grid: (PlayingCard | null)[];
  cleared: PlayingCard[];
};

export type IrisGardenGameState = GameState;

const DIRS: Point[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function occupied(grid: unknown[], x: number, y: number) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS && grid[y * COLS + x] != null;
}

function inside(x: number, y: number) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

/** The cell itself and every empty cell in a straight line from it. */
function straightReach(grid: unknown[], x: number, y: number): Point[] {
  const reach: Point[] = [[x, y]];
  for (const [dx, dy] of DIRS) {
    let cx = x + dx;
    let cy = y + dy;
    while (inside(cx, cy) && !occupied(grid, cx, cy)) {
      reach.push([cx, cy]);
      cx += dx;
      cy += dy;
    }
  }
  return reach;
}

function clearBetween(grid: unknown[], [x1, y1]: Point, [x2, y2]: Point) {
  if (x1 === x2) {
    const step = Math.sign(y2 - y1);
    for (let y = y1 + step; y !== y2; y += step) {
      if (occupied(grid, x1, y)) return false;
    }
    return true;
  }
  if (y1 === y2) {
    const step = Math.sign(x2 - x1);
    for (let x = x1 + step; x !== x2; x += step) {
      if (occupied(grid, x, y1)) return false;
    }
    return true;
  }
  return false;
}

/**
 * The corners of a path of at most three straight lines joining two cells
 * through empty cells, or null if there is none.
 */
function findPath(grid: unknown[], a: number, b: number): Point[] | null {
  if (a === b) return null;
  const work = [...grid];
  work[a] = null;
  work[b] = null;
  const start: Point = [a % COLS, Math.floor(a / COLS)];
  const end: Point = [b % COLS, Math.floor(b / COLS)];
  const fromStart = straightReach(work, ...start);
  const fromEnd = straightReach(work, ...end);
  let best: Point[] | null = null;
  for (const p of fromStart) {
    for (const q of fromEnd) {
      const joined =
        p[0] === q[0] && p[1] === q[1]
          ? [start, p, end]
          : (p[0] === q[0] || p[1] === q[1]) && clearBetween(work, p, q)
            ? [start, p, q, end]
            : null;
      if (!joined) continue;
      // Keep the path with the fewest corners.
      const path = joined.filter(
        (point, i) =>
          i === 0 ||
          point[0] !== joined[i - 1][0] ||
          point[1] !== joined[i - 1][1],
      );
      if (!best || path.length < best.length) best = path;
    }
  }
  return best;
}

function canMatch(grid: (PlayingCard | null)[], a: number, b: number) {
  const first = grid[a];
  const second = grid[b];
  return (
    !!first && !!second && first.rank === second.rank && !!findPath(grid, a, b)
  );
}

function availableMatches(grid: (PlayingCard | null)[]) {
  const byRank = new Map<CardRank, number[]>();
  grid.forEach((card, cell) => {
    if (card) byRank.set(card.rank, [...(byRank.get(card.rank) ?? []), cell]);
  });
  const matches: [number, number][] = [];
  byRank.forEach((cells) => {
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        if (findPath(grid, cells[i], cells[j])) {
          matches.push([cells[i], cells[j]]);
        }
      }
    }
  });
  return matches;
}

/**
 * Cells grouped into pairs in an order that clears the board: each pair is
 * joined by a path once the pairs before it are gone.
 */
function clearingOrder(random = Math.random): [number, number][] | null {
  const filled: (true | null)[] = Array(CELLS).fill(true);
  const order: [number, number][] = [];
  while (order.length < CELLS / 2) {
    const cells = filled.flatMap((cell, i) => (cell ? [i] : []));
    const options: { pair: [number, number]; weight: number }[] = [];
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i];
        const b = cells[j];
        if (!findPath(filled, a, b)) continue;
        const distance =
          Math.abs((a % COLS) - (b % COLS)) +
          Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS));
        options.push({
          pair: [a, b],
          weight: distance <= 1 ? NEIGHBOUR_WEIGHT : 1,
        });
      }
    }
    if (options.length === 0) return null;
    let roll = random() * options.reduce((sum, o) => sum + o.weight, 0);
    let pick = options[options.length - 1].pair;
    for (const option of options) {
      roll -= option.weight;
      if (roll <= 0) {
        pick = option.pair;
        break;
      }
    }
    filled[pick[0]] = null;
    filled[pick[1]] = null;
    order.push(pick);
  }
  return order;
}

/** A deal that can be cleared: each pair of the clearing order shares a rank. */
function dealGrid(random = Math.random): (PlayingCard | null)[] {
  let order = clearingOrder(random);
  while (!order) order = clearingOrder(random);
  const cards = createDeck({ faceUp: true }).filter((card) =>
    RANKS_USED.includes(card.rank),
  );
  // Each rank's four cards make two pairs of the order.
  const pairs = shuffle(
    RANKS_USED.flatMap((rank) => {
      const ofRank = shuffle(
        cards.filter((card) => card.rank === rank),
        random,
      );
      return [ofRank.slice(0, 2), ofRank.slice(2, 4)];
    }),
    random,
  );
  const grid: (PlayingCard | null)[] = Array(CELLS).fill(null);
  order.forEach(([a, b], i) => {
    grid[a] = pairs[i][0];
    grid[b] = pairs[i][1];
  });
  return grid;
}

function createInitialState(): GameState {
  return { deal: [], grid: dealGrid(), cleared: [] };
}

function gatherState(state: GameState): GameState {
  return {
    deal: shuffle(flipAllToBack(collectCards(state))),
    grid: Array(CELLS).fill(null),
    cleared: [],
  };
}

function isCleared(grid: (PlayingCard | null)[]) {
  return grid.every((card) => !card);
}

export const irisGardenRules = {
  COLS,
  ROWS,
  CELLS,
  findPath,
  canMatch,
  availableMatches,
  clearingOrder,
  dealGrid,
  isCleared,
  createInitialState,
};

const gameStateInitial = createInitialState();

export default function IrisGarden() {
  const { colorPale } = useGameColors();
  const [selected, setSelected] = useState<number | null>(null);
  const [shownPath, setShownPath] = useState<Point[] | null>(null);
  const [busy, setBusy] = useState(false);

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
      setShownPath(null);
      setBusy(false);
    },
    resetAndSetup: async () => {
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) => redealWith(createInitialState(), draft.deal));
    },
  });

  const dealt = game.deal.length === 0;
  const matches = useMemo(
    () => (dealt ? availableMatches(game.grid) : []),
    [dealt, game.grid],
  );
  const won = dealt && !isSettingUp && game.cleared.length === CELLS;
  const lost = dealt && !isSettingUp && !won && matches.length === 0;

  async function onCardPress(cell: number) {
    if (busy || won || lost) return;
    if (selected === null || selected === cell) {
      setSelected(selected === cell ? null : cell);
      return;
    }
    const path = findPath(game.grid, selected, cell);
    const first = game.grid[selected];
    const second = game.grid[cell];
    if (!path || !first || !second || first.rank !== second.rank) {
      setSelected(cell);
      return;
    }
    setBusy(true);
    setShownPath(path);
    await delay(PATH_SHOW_MS);
    const from = selected;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const a = draft.grid[from];
      const b = draft.grid[cell];
      if (!a || !b) return;
      draft.cleared.push(flipToFace(a), flipToFace(b));
      draft.grid[from] = null;
      draft.grid[cell] = null;
    });
    setShownPath(null);
    setSelected(null);
    setBusy(false);
  }

  const zones: MapZone[] = useMemo(() => {
    const cellZones: MapZone[] = game.grid.map((card, cell) => ({
      id: `cell-${cell}`,
      name: "cell",
      pileIndex: cell,
      cards: card ? [card] : [],
      col: cell % COLS,
      row: GRID_ROW + Math.floor(cell / COLS),
      baseZIndex: 10,
      placeholder: { showCount: false, hideBackground: true, hideShadow: true },
    }));
    return [
      { id: "status", col: 0, row: 0, width: COLS - 1.2 },
      {
        id: "cleared",
        name: "cleared",
        cards: game.cleared,
        col: COLS - 1,
        row: 0,
        baseZIndex: 5,
        fan: { maxVisible: 3 },
        placeholder: { showCount: false },
      },
      {
        id: "deal",
        name: "deal",
        cards: game.deal,
        col: (COLS - 1) / 2,
        row: GRID_ROW + (ROWS - 1) / 2,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
      },
      ...cellZones,
    ];
  }, [game]);

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    if (card.zoneName !== "cell" || card.pileIndex === undefined) {
      return { isDisabled: true };
    }
    const cell = card.pileIndex;
    return {
      onPress: () => void onCardPress(cell),
      isDisabled: busy || won || lost,
      isSelected: selected === cell,
      selectColor: "blue",
    };
  };

  const { cardMap, getZoneBasePos, getZoneStylesById, cardWidth, cardHeight } =
    useCardMap({
      game,
      zones,
      cardMapper,
      cardSize: "small",
      fixedCols: COLS,
      fixedRows: GRID_ROW + ROWS,
      gap: 0.06,
    });

  function centreOf([x, y]: Point) {
    const zone = zones.find((z) => z.id === `cell-${y * COLS + x}`);
    if (!zone) return null;
    const base = getZoneBasePos(zone);
    return { x: base.x + cardWidth / 2, y: base.y + cardHeight / 2 };
  }

  const pathPoints = shownPath
    ?.map(centreOf)
    .filter((point): point is { x: number; y: number } => !!point)
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const pairsLeft = (CELLS - game.cleared.length) / 2;

  return (
    <GameWrapper
      outcome={won ? "won" : lost ? "lost" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        won
          ? i18n.t("games:irisGarden.cleared")
          : i18n.t("games:irisGarden.noMatches", { pairs: pairsLeft })
      }
    >
      {cardMap}

      {pathPoints && (
        <Svg
          style={[
            pointerEventsStyles.none,
            { position: "absolute", left: 0, top: 0, zIndex: 2000 },
          ]}
          width="100%"
          height="100%"
        >
          <Polyline
            points={pathPoints}
            fill="none"
            stroke={colorPale}
            strokeWidth={Math.max(3, cardWidth * 0.08)}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.9}
          />
        </Svg>
      )}

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("status"),
          flexStyles.colCentered,
          { alignItems: "flex-start" },
        ]}
      >
        <Text size="md" weight={600} color={colorPale}>
          {i18n.t("games:irisGarden.pairsLeft", { count: pairsLeft })}
        </Text>
        <Text size="sm" weight={500} color={rgba(colorPale, 0.75)}>
          {i18n.t("games:irisGarden.matchesOpen", { count: matches.length })}
        </Text>
      </View>
    </GameWrapper>
  );
}
