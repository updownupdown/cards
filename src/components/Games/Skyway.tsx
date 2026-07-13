import { Text } from "@/components/common/Text";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isFace,
  rankValue,
  shuffle,
  SUITS,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const svgCellSize = 800;
const svgGridSize = svgCellSize * 3;

// Map grid index to (x, y) center in SVG overlay
function getCellCenter(idx: number) {
  const cx = svgCellSize / 2 + (idx % 3) * svgCellSize;
  const cy = svgCellSize / 2 + Math.floor(idx / 3) * svgCellSize;

  return { cx, cy };
}

// Shared color mapping for suit paths and icons
const SUIT_PATH_COLORS: Record<string, string> = {
  diamonds: Colors.suitsColoredDiamonds,
  hearts: Colors.suitsColoredHearts,
  spades: Colors.suitsColoredSpades,
  clubs: Colors.suitsColoredClubs,
};

type GameState = {
  draw: PlayingCard[];
  discard: PlayingCard[];
  market: PlayingCard[][];
  grid: PlayingCard[][];
  round: 1 | 2 | 3;
  finalTurnAfterPlacement: boolean;
  ended: boolean;
};

type ScoreBySuit = Record<(typeof SUITS)[number], number>;

const ADJACENT: number[][] = [
  [1, 3],
  [0, 2, 4],
  [1, 5],
  [0, 4, 6],
  [1, 3, 5, 7],
  [2, 4, 8],
  [3, 7],
  [4, 6, 8],
  [5, 7],
];

const gameStateInitial: GameState = {
  grid: Array.from({ length: 9 }, () => []),
  draw: shuffle(createDeck().filter((card) => !isFace(card))),
  discard: [],
  market: [[], [], []],
  round: 1,
  finalTurnAfterPlacement: false,
  ended: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.draw,
      ...draft.discard,
      ...draft.market.flat(),
      ...draft.grid.flat(),
    ];

    draft.grid = Array.from({ length: 9 }, () => []);
    draft.draw = shuffle(flipAllToBack(allCards));
    draft.discard = [];
    draft.market = [[], [], []];
    draft.round = 1;
    draft.finalTurnAfterPlacement = false;
    draft.ended = false;
  });

  await delay();

  setGame((draft) => {
    const next = prepareMarket(draft);
    Object.assign(draft, next);
  });
}

function prepareMarket(prev: GameState): GameState {
  if (prev.ended) return prev;

  let draw = [...prev.draw];
  let discard = [...prev.discard];
  let round = prev.round;
  let finalTurnAfterPlacement = prev.finalTurnAfterPlacement;

  const market: PlayingCard[][] = [[], [], []];
  const wanted = [2, 2, 1];

  const drawOne = (): PlayingCard | null => {
    if (draw.length === 0) {
      if (discard.length === 0) return null;

      if (round < 3) {
        round = (round + 1) as 1 | 2 | 3;
        draw = shuffle(discard);
        discard = [];
      } else if (!finalTurnAfterPlacement) {
        draw = shuffle(discard);
        discard = [];
        finalTurnAfterPlacement = true;
      } else {
        return null;
      }
    }

    return draw.shift() ?? null;
  };

  for (let pileIndex = 0; pileIndex < 3; pileIndex += 1) {
    for (let i = 0; i < wanted[pileIndex]; i += 1) {
      const card = drawOne();
      if (!card) {
        return {
          ...prev,
          market,
          draw: draw,
          discard,
          round,
          finalTurnAfterPlacement,
          ended: true,
        };
      }
      market[pileIndex].push(flipToFace(card));
    }
  }

  return {
    ...prev,
    market,
    draw: draw,
    discard,
    round,
    finalTurnAfterPlacement,
  };
}

// Utility to find the actual longest path for a suit
function findLongestSuitPath(
  grid: PlayingCard[][],
  suit: (typeof SUITS)[number],
) {
  const valuesByCell = grid.map((stack) =>
    stack
      .filter((card) => card.suit === suit)
      .map((card) => rankValue(card))
      .sort((a, b) => a - b),
  );

  const memo = new Map<string, { len: number; path: number[] }>();

  function dfs(
    cell: number,
    usedMask: number,
    currentValue: number,
    path: number[],
  ): { len: number; path: number[] } {
    const key = `${cell}|${usedMask}|${currentValue}`;
    if (memo.has(key)) return memo.get(key)!;
    let best = { len: 1, path: [...path, cell] };
    for (const nextCell of ADJACENT[cell]) {
      if ((usedMask & (1 << nextCell)) !== 0) continue;
      for (const nextValue of valuesByCell[nextCell]) {
        if (nextValue <= currentValue) continue;
        const candidate = dfs(nextCell, usedMask | (1 << nextCell), nextValue, [
          ...path,
          cell,
        ]);
        if (candidate.len + 1 > best.len)
          best = { len: candidate.len + 1, path: [...candidate.path] };
      }
    }
    memo.set(key, best);
    return best;
  }

  let globalBest: { len: number; path: number[] } = { len: 0, path: [] };
  valuesByCell.forEach((values, cellIndex) => {
    values.forEach((value) => {
      const res = dfs(cellIndex, 1 << cellIndex, value, []);
      if (res.len > globalBest.len) globalBest = res;
    });
  });
  return globalBest.path;
}

function computeScore(grid: PlayingCard[][]): ScoreBySuit {
  return {
    clubs: findLongestSuitPath(grid, "clubs").length,
    diamonds: findLongestSuitPath(grid, "diamonds").length,
    hearts: findLongestSuitPath(grid, "hearts").length,
    spades: findLongestSuitPath(grid, "spades").length,
  };
}

// ========== Main Component ========== //
export default function Skyway() {
  const { zoneBg } = useGameZoneBackground();
  const { spacing } = useResponsiveMetrics();

  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedMarket(null);
      },
    });

  const score = useMemo(() => computeScore(game.grid), [game.grid]);
  const won = SUITS.every((suit) => score[suit] >= 5);

  function draftToCell(cellIndex: number) {
    if (selectedMarket === null || game.ended) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const drafted = draft.market[selectedMarket];
      if (!drafted || drafted.length === 0) return;

      draft.grid[cellIndex].push(...drafted);
      while (draft.grid[cellIndex].length > 3) {
        const removed = draft.grid[cellIndex].shift();
        if (removed) draft.discard.push(flipToBack(removed));
      }

      draft.market.forEach((pile, i) => {
        if (i !== selectedMarket) {
          draft.discard.push(...pile.map(flipToBack));
        }
      });

      draft.market = [[], [], []];

      const wasFinalTurn = draft.finalTurnAfterPlacement;
      const next = prepareMarket(draft);
      Object.assign(draft, next);

      if (wasFinalTurn) {
        draft.ended = true;
      }
    });

    setSelectedMarket(null);
  }

  // Find the actual cell-to-cell path for each suit
  const suitPaths = useMemo(() => {
    const paths: Record<string, number[]> = {};
    for (const suit of SUITS) {
      paths[suit] = findLongestSuitPath(game.grid, suit);
    }
    return paths;
  }, [game.grid]);

  // ========== Card Mapping ========== //
  const gridScaling = 2.4;
  const lastCol = 3 * gridScaling - 1;
  const infoWidth = 3 * gridScaling - 3;

  const zones: MapZone[] = useMemo(() => {
    const marketZones: MapZone[] = getGridColRows({
      cols: 3,
      rows: 1,
      rowOffset: 1.5,
      scaleX: gridScaling,
      scaleY: gridScaling * 0.54,
    }).map((pos, i) => {
      return {
        id: `market-${i}`,
        name: "market",
        pileIndex: i,
        cards: game.market[i],
        col: pos.c,
        row: pos.r,
        width: pos.width,
        height: pos.height,
        placeholder: {},
        fan: { direction: "right", offset: 0.5 },
        baseZIndex: 100,
        clickThroughCards: true,
      };
    });

    const gridZones: MapZone[] = getGridColRows({
      cols: 3,
      rows: 3,
      rowOffset: 1 + gridScaling * 0.8,
      scaleX: gridScaling,
      scaleY: gridScaling * cardDims.aspectRatio,
    }).map((pos, i) => {
      return {
        id: `grid-${i}`,
        name: "grid",
        pileIndex: i,
        cards: game.grid[i],
        col: pos.c,
        row: pos.r,
        width: pos.width,
        height: pos.height,
        placeholder: {},
        fan: { direction: "right", offset: 0.5 },
        baseZIndex: 50,
        clickThroughCards: true,
      };
    });

    return [
      {
        id: "draw",
        cards: game.draw,
        col: 0,
        row: 0,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: "Draw", infoPos: "right" },
      },
      {
        id: "discard",
        cards: game.discard,
        col: lastCol,
        row: 0,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: "Dscrd", infoPos: "left" },
      },
      {
        id: "paths-info",
        col: 1.5,
        row: 0,
        width: infoWidth,
        height: 1,
        baseZIndex: 1,
      },
      {
        id: "market",
        col: 0,
        row: 1,
        width: "full",
        height: 0.5,
        baseZIndex: 1,
      },
      ...marketZones,
      ...gridZones,
      {
        id: "paths",
        col: 0,
        row: 1 + gridScaling * 0.8,
        width: 3 * gridScaling,
        height: 3 * gridScaling * cardDims.aspectRatio,
        baseZIndex: 15,
      },
    ];
  }, [game]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    const index = zone.pileIndex;
    if (index === undefined) return {};

    if (zone.name === "grid") {
      return {
        zIndexOffset: -49,
        onPress: () => draftToCell(index!),
      };
    } else if (zone.name === "market") {
      return {
        selectColor: selectedMarket === index ? "green" : "blue",
        forceOverlayColor: true,
        forceSelectColor: true,
        onPress: () => {
          setSelectedMarket(selectedMarket === index ? null : index);
        },
      };
    }
  };

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    return {
      clickThroughCards: mappedCard.clickThroughCards,
    };
  };

  const { cardMap, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    gap: 0.14,
    cardSize: "small-colored",
  });

  const paddingHorizontal = cardWidth * 0.28;
  const borderRadius = cardWidth * 0.15;

  return (
    <GameWrapper
      ended={game.ended}
      won={won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        won
          ? "All four suits reached at least a 5-card path."
          : "5 cards for each suit path needed to win."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {/* Paths info */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          flexStyles.spaceBetween,
          getZoneStylesById("paths-info"),
          {
            paddingHorizontal,
            gap: cardWidth / 2,
            borderRadius,
            backgroundColor: zoneBg,
          },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.flex1,
            flexStyles.spaceAround,
          ]}
        >
          {SUITS.map((suit) => (
            <View
              key={suit}
              style={[
                flexStyles.colCentered,
                {
                  gap: spacing(6),
                },
              ]}
            >
              <Icon
                name={suit}
                color={SUIT_PATH_COLORS[suit]}
                size={spacing(18)}
              />
              <Text
                size="sm"
                weight={600}
                color={SUIT_PATH_COLORS[suit]}
                style={{ textAlign: "center" }}
              >
                {score[suit]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Market */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.spaceBetween,
          getZoneStylesById("market"),
          {
            paddingHorizontal,
          },
        ]}
      >
        <Text size="sm" color={Colors.K300} weight={400}>
          Market
        </Text>
        <Text size="sm" color={Colors.K300} weight={400}>
          Round {game.round} of 3
        </Text>
      </View>

      {/* Grid and paths */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          getZoneStylesById("paths"),
          {
            zIndex: 10,
            flexWrap: "wrap",
            aspectRatio: 1,
            padding: spacing(4),
            userSelect: "none",
            pointerEvents: "none",
          },
        ]}
      >
        {/* Paths */}
        <Svg
          style={[
            {
              position: "absolute",
              zIndex: 2,
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            },
          ]}
          width={svgGridSize}
          height={svgGridSize}
          viewBox={`0 0 ${svgGridSize} ${svgGridSize}`}
        >
          {SUITS.map((suit, suitIdx) => {
            const color = SUIT_PATH_COLORS[suit];
            const path = suitPaths[suit];
            // Draw lines between consecutive cells in the path
            return path.length > 1
              ? path.slice(1).map((cell, i) => {
                  const prev = path[i];

                  // Offset lines for multiple suits between same cells
                  const offset = (suitIdx - 1.5) * 30; // space out lines
                  const { cx: x1, cy: y1 } = getCellCenter(prev);
                  const { cx: x2, cy: y2 } = getCellCenter(cell);

                  // Perpendicular offset
                  const dx = y2 - y1;
                  const dy = x1 - x2;
                  const mag = Math.sqrt(dx * dx + dy * dy) || 1;
                  const ox = (dx / mag) * offset;
                  const oy = (dy / mag) * offset;

                  return (
                    <Line
                      key={`${suit}-${prev}-${cell}`}
                      x1={x1 + ox}
                      y1={y1 + oy}
                      x2={x2 + ox}
                      y2={y2 + oy}
                      stroke={color}
                      strokeWidth={20}
                      strokeLinecap="round"
                    />
                  );
                })
              : null;
          })}
        </Svg>
      </View>
    </GameWrapper>
  );
}
