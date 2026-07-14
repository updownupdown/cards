import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Text } from "../common/Text";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  RANK_VALUE,
  shuffle,
  type PlayingCard,
  type StandardRank,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const gridCols = 5;
const gridRows = 5;
const gridSize = gridCols * gridRows;
const previewCount = 2;

/** Par to beat. Careless play lands well below this; planning clears it. */
const par = 60;

type GameState = {
  grid: (PlayingCard | null)[];
  current: PlayingCard | null;
  stock: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  grid: Array.from({ length: gridSize }, () => null),
  current: null,
  stock: shuffle(createDeck()),
  ended: false,
  won: false,
};

// ========== Poker scoring ========== //
function rankHigh(card: PlayingCard) {
  return card.rank === "A" ? 14 : RANK_VALUE[card.rank as StandardRank];
}

/** Score a completed line of 5 cards as a poker hand (American Poker Squares). */
function lineScore(line: (PlayingCard | null)[]): number {
  if (line.length !== gridCols || line.some((c) => c === null)) return 0;
  const cards = line as PlayingCard[];

  const isFlush = cards.every((c) => c.suit === cards[0].suit);

  const values = cards.map(rankHigh);
  const counts: Record<number, number> = {};
  for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
  const groupSizes = Object.values(counts).sort((a, b) => b - a);

  const distinct = Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b);

  let isStraight = false;
  let isRoyal = false;
  if (distinct.length === 5) {
    if (distinct[4] - distinct[0] === 4) isStraight = true;
    // Wheel: A-2-3-4-5 reads as {2,3,4,5,14}.
    const isWheel =
      distinct[0] === 2 &&
      distinct[1] === 3 &&
      distinct[2] === 4 &&
      distinct[3] === 5 &&
      distinct[4] === 14;
    if (isWheel) isStraight = true;
    if (isStraight && distinct[0] === 10 && distinct[4] === 14) isRoyal = true;
  }

  if (isStraight && isFlush && isRoyal) return 100;
  if (isStraight && isFlush) return 75;
  if (groupSizes[0] === 4) return 50;
  if (groupSizes[0] === 3 && groupSizes[1] === 2) return 25;
  if (isFlush) return 20;
  if (isStraight) return 15;
  if (groupSizes[0] === 3) return 10;
  if (groupSizes[0] === 2 && groupSizes[1] === 2) return 5;
  if (groupSizes[0] === 2) return 2;
  return 0;
}

function getLine(grid: (PlayingCard | null)[], cells: number[]) {
  return cells.map((i) => grid[i]);
}

function allLines(): number[][] {
  const lines: number[][] = [];
  for (let r = 0; r < gridRows; r += 1) {
    lines.push(Array.from({ length: gridCols }, (_, c) => r * gridCols + c));
  }
  for (let c = 0; c < gridCols; c += 1) {
    lines.push(Array.from({ length: gridRows }, (_, r) => r * gridCols + c));
  }
  return lines;
}

const LINES = allLines();

function boardScore(grid: (PlayingCard | null)[]) {
  return LINES.reduce((sum, cells) => sum + lineScore(getLine(grid, cells)), 0);
}

// ========== Setup ========== //
async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.grid.filter((c): c is PlayingCard => c !== null),
      ...(draft.current ? [draft.current] : []),
      ...draft.stock,
    ];

    draft.stock = shuffle(allCards).map(flipToBack);
    draft.grid = Array.from({ length: gridSize }, () => null);
    draft.current = null;
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const next = draft.stock.pop();
    draft.current = next ? flipToFace(next) : null;
  });
}

// ========== Main Component ========== //
export default function Riverboat() {
  const { cardText } = useGameZoneBackground();

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
    });

  const score = useMemo(() => boardScore(game.grid), [game.grid]);
  const placed = useMemo(
    () => game.grid.filter((c) => c !== null).length,
    [game.grid],
  );

  useEffect(() => {
    const full = game.grid.every((c) => c !== null);
    if (full && !game.ended) {
      setGame((draft) => {
        draft.ended = true;
        draft.won = boardScore(draft.grid) >= par;
      });
    }
  }, [game.grid, game.ended]);

  function placeAt(cellIndex: number) {
    if (game.ended || !game.current || game.grid[cellIndex] !== null) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      if (!draft.current || draft.grid[cellIndex] !== null) return;
      draft.grid[cellIndex] = flipToFace(draft.current);
      const next = draft.stock.pop();
      draft.current = next ? flipToFace(next) : null;
    });
  }

  // Upcoming cards, shown face up so the player can plan ahead.
  const previewCards = useMemo(
    () =>
      game.stock
        .slice(-previewCount)
        .reverse()
        .map((card) => flipToFace(card)),
    [game.stock],
  );

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const cellZones: MapZone[] = getGridColRows({
      cols: gridCols,
      rows: gridRows,
      rowOffset: 2,
    }).map((pos, i) => ({
      id: `cell-${i}`,
      name: "cell",
      pileIndex: i,
      cards: game.grid[i] ? [game.grid[i] as PlayingCard] : [],
      col: pos.c,
      row: pos.r,
      baseZIndex: 1,
      placeholder: {},
    }));

    return [
      { id: "hud", col: 0, row: 0, width: "full", height: 0.55 },
      {
        id: "current",
        name: "current",
        cards: game.current ? [game.current] : [],
        col: 1.2,
        row: 0.7,
        baseZIndex: 30,
        placeholder: { text: "Deal", infoPos: "left" },
      },
      {
        id: "preview",
        name: "preview",
        cards: previewCards,
        col: 2.8,
        row: 0.7,
        fan: { direction: "right", offset: 0.22, maxVisible: previewCount },
        baseZIndex: 20,
        placeholder: { text: "Next", infoPos: "right" },
      },
      ...cellZones,
    ];
  }, [game.grid, game.current, previewCards]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "cell" || zone.pileIndex === undefined) return {};
    const cellIndex = zone.pileIndex;
    const isEmpty = game.grid[cellIndex] === null;
    return {
      onPress: () => placeAt(cellIndex),
      isDisabled: game.ended || !game.current || !isEmpty,
      selectColor: isEmpty && game.current ? "green" : "none",
    };
  };

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    // Placed cards and preview/current cards are not directly interactive.
    if (mappedCard.zoneName === "cell") {
      return { isDisabled: true };
    }
    return {};
  };

  const { getZoneStylesById, cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    gap: 0.12,
    cardSize: "small",
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      score={score}
      winLoseMessage={
        game.won
          ? `You cleared par with ${score}!`
          : `Scored ${score} — par is ${par}.`
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
          Pot {score}
        </Text>
        <Text size="sm" weight={600} color={cardText}>
          Par {par}
        </Text>
        <Text size="sm" weight={600} color={cardText}>
          Dealt {placed}/{gridSize}
        </Text>
      </View>
    </GameWrapper>
  );
}
