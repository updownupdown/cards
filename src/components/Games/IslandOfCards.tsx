import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  flipTopCardToFace,
  RANK_VALUE,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useToast } from "../common/Toast";
import { rgba } from "@/styles/styles";

const SIZE = 7;
const CELLS = SIZE * SIZE;
const baseScore = 49;

type GameState = {
  grid: (PlayingCard | null)[];
  draw: PlayingCard[];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
  usingJokers?: boolean;
};

export type IslandOfCardsGameState = GameState;

const gameStateInitial: GameState = {
  grid: Array.from({ length: CELLS }, () => null),
  draw: [],
  discard: [],
  ended: false,
  won: false,
  usingJokers: false,
};

// ── Geometry helpers ──────────────────────────────────────────────────────────
function orthNeighbours(i: number) {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out: number[] = [];
  const deltas = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of deltas) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) out.push(nr * SIZE + nc);
  }
  return out;
}

function allNeighbours(i: number) {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE)
        out.push(nr * SIZE + nc);
    }
  }
  return out;
}

// ── Card helpers ──────────────────────────────────────────────────────────────
function isWild(card: PlayingCard) {
  return card.rank === "Joker";
}
function cardValue(card: PlayingCard) {
  return RANK_VALUE[card.rank]; // A=1 .. K=13
}
/** King (13) and Ace (1) wrap, so a difference of 1 or 12 counts as adjacent. */
function adjacentByOne(a: number, b: number) {
  const diff = Math.abs(a - b);
  return diff === 1 || diff === 12;
}

function isLegalPlacement(
  grid: (PlayingCard | null)[],
  card: PlayingCard,
  cell: number,
) {
  if (grid[cell] !== null) return false;

  const orthOccupied = orthNeighbours(cell)
    .map((j) => grid[j])
    .filter((c): c is PlayingCard => c !== null);
  if (orthOccupied.length === 0) return false; // must touch the island

  if (isWild(card)) return true; // wildcard: any connected empty cell

  const value = cardValue(card);

  // No equal value adjacent (orthogonally or diagonally); wildcards never block.
  const equalAdjacent = allNeighbours(cell)
    .map((j) => grid[j])
    .some((c) => c !== null && !isWild(c) && cardValue(c) === value);
  if (equalAdjacent) return false;

  // Must sit next to a card one higher/lower orthogonally (wild neighbour ok).
  return orthOccupied.some(
    (c) => isWild(c) || adjacentByOne(cardValue(c), value),
  );
}

function legalCells(grid: (PlayingCard | null)[], card: PlayingCard | null) {
  if (!card) return [];
  const cells: number[] = [];
  for (let i = 0; i < CELLS; i += 1) {
    if (isLegalPlacement(grid, card, i)) cells.push(i);
  }
  return cells;
}

function xCells() {
  const cells: number[] = [];
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (r === c || r + c === SIZE - 1) cells.push(r * SIZE + c);
    }
  }
  return cells; // 13 cells forming the X
}

function afterResolve(draft: GameState) {
  const filled = draft.grid.filter((c) => c !== null).length;
  if (filled === CELLS) {
    draft.ended = true;
    draft.won = true;
    return;
  }
  if (draft.draw.length > 0) {
    draft.draw = flipTopCardToFace(draft.draw);
  } else {
    draft.ended = true;
    draft.won = false;
  }
}

export const islandOfCardsRules = {
  orthNeighbours,
  allNeighbours,
  isWild,
  adjacentByOne,
  isLegalPlacement,
  legalCells,
  xCells,
  afterResolve,
  size: SIZE,
  cells: CELLS,
  baseScore,
};

// ── Component ────────────────────────────────────────────────────────────────
export default function IslandOfCards() {
  const showToast = useToast();
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameZoneBackground();
  const useJokers = useGameSettingValue("islandJokers");
  const jokersRef = useRef(useJokers);
  jokersRef.current = useJokers;

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetAndSetup: async () => {
        // Return all cards to deck
        setGame((draft) => {
          const allCards = [
            ...draft.grid.filter((c): c is PlayingCard => c !== null),
            ...draft.draw,
            ...draft.discard,
          ];
          draft.grid = Array.from({ length: CELLS }, () => null);
          draft.draw = shuffle(allCards.map(flipToBack));
          draft.discard = [];

          // Update deck if jokers setting changed
          if (jokersRef.current !== draft.usingJokers) {
            draft.draw = shuffle(
              createDeck({ includeJokers: jokersRef.current }).map(flipToBack),
            );
          }
          draft.usingJokers = jokersRef.current;
        });

        await delay(600);

        // Lay the opening X
        setGame((draft) => {
          for (const cell of xCells()) {
            const card = draft.draw.pop();
            if (card) draft.grid[cell] = flipToFace(card);
          }

          draft.ended = false;
          draft.won = false;
        });

        await delay(600);

        // Flip top card to face
        setGame((draft) => {
          draft.draw = flipTopCardToFace(draft.draw);
        });
      },
    });

  const legal = useMemo(
    () => (game.ended ? [] : legalCells(game.grid, top(game.draw) ?? null)),
    [game.grid, game.draw, game.ended],
  );
  const legalSet = useMemo(() => new Set(legal), [legal]);

  // Auto-discard a drawn card that cannot be legally placed.
  useEffect(() => {
    if (game.ended || game.draw.length === 0) return;
    if (legal.length > 0) return;
    const timer = setTimeout(() => {
      setGame((draft) => {
        const next = draft.draw.pop();
        if (!next) return;
        draft.discard.push(next);
        afterResolve(draft);
      });
    }, 650);
    return () => clearTimeout(timer);
  }, [game.draw, game.ended, legal.length, setGame]);

  function place(cell: number) {
    const nextCard = top(game.draw);
    if (game.ended || !nextCard) return;
    if (!isLegalPlacement(game.grid, nextCard, cell)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const next = draft.draw.pop();
      if (!next) return;
      draft.grid[cell] = next;
      afterResolve(draft);
    });
  }

  const discardCount = game.discard.filter((c) => !isWild(c)).length;
  const drawRemaining = game.draw.filter((c) => !isWild(c)).length;
  const score = baseScore - discardCount + drawRemaining;
  const filled = useMemo(
    () => game.grid.filter((c) => c !== null).length,
    [game.grid],
  );

  // ── Zones ─────────────────────────────────────────────────────────────────
  const zones: MapZone[] = useMemo(() => {
    const cellZones: MapZone[] = getGridColRows({
      cols: SIZE,
      rows: SIZE,
      rowOffset: 1.4,
    }).map((pos, i) => ({
      id: `cell-${i}`,
      name: "cell",
      pileIndex: i,
      cards: game.grid[i] ? [game.grid[i] as PlayingCard] : [],
      col: pos.c,
      row: pos.r,
      baseZIndex: 1,
      placeholder: { hideShadow: true, backgroundColor: rgba("#2b2015", 0.3) },
    }));

    return [
      {
        id: "deck",
        name: "deck",
        cards: game.draw,
        col: 0,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 40,
        placeholder: { text: "Deck", infoPos: "right", showCount: true },
      },
      { id: "hud", col: 1.75, row: 0, width: 3.5, height: 1, baseZIndex: 1 },
      {
        id: "land",
        col: -0.2,
        row: 1.3,
        width: 7.4,
        height: 7.2,
        baseZIndex: 1,
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 6,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 40,
        placeholder: { text: "Out", infoPos: "left" },
      },
      ...cellZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "cell") {
      return { isDisabled: true };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "cell" && zone.pileIndex !== undefined) {
      const cell = zone.pileIndex;
      const isLegal = legalSet.has(cell);
      return {
        onPress: () => {
          if (!isLegal || game.ended) {
            showToast("Not a legal placement");
          } else {
            place(cell);
          }
        },
      };
    }
    return {};
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    gap: 0.1,
    cardSize: "small",
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      score={score}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.won ? `Island complete!` : `Island unfinished!`}
      canUndo={canUndo}
      undo={undo}
    >
      <View
        style={[
          getZoneStylesById("hud"),
          { alignItems: "center", justifyContent: "center", gap: spacing(12) },
        ]}
      >
        <ProgressBar
          progressValue={filled}
          totalValue={CELLS}
          color={colorPale}
          scaledHeight={cardHeight * 0.2}
        />
      </View>

      <View
        style={[
          getZoneStylesById("land"),
          {
            backgroundColor: rgba("#694927", 1),
            borderRadius: spacing(16),
            boxShadow: `inset 0 0 ${spacing(20)}px ${spacing(10)}px rgb(243, 225, 187), 0 0 ${spacing(10)}px ${spacing(10)}px rgb(243, 225, 187)`,
          },
        ]}
      />

      {cardMap}
    </GameWrapper>
  );
}
