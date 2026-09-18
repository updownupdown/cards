import { useStateManager } from "@/hooks/useStateManager";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Button } from "../Button/Button";
import {
  createDeck,
  flipAllToBack,
  flipToFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { View } from "react-native";
import { useGameColors } from "@/hooks/useGameColors";

import { i18n } from "@/i18n";
const ROWS = 4;
const COLS = 13;

type GapsDifficulty = "easy" | "hard";

export type GapsGameState = {
  setupPile: PlayingCard[];
  grid: (PlayingCard | null)[];
  maxRedeals: number;
  redealsUsed: number;
  ended: boolean;
  won: boolean;
};

function createInitialState(difficulty: GapsDifficulty): GapsGameState {
  return {
    setupPile: shuffle(createDeck({ faceUp: false })),
    grid: Array(ROWS * COLS).fill(null),
    maxRedeals: difficulty === "easy" ? 3 : 2,
    redealsUsed: 0,
    ended: false,
    won: false,
  };
}

async function resetAndSetup(
  difficulty: GapsDifficulty,
  setGame: (updater: (draft: GapsGameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [...(draft.setupPile ?? []), ...draft.grid].filter(
      (card): card is PlayingCard => card !== null,
    );
    draft.setupPile = shuffle(flipAllToBack(allCards));
    draft.grid = Array(ROWS * COLS).fill(null);
    draft.maxRedeals = difficulty === "easy" ? 3 : 2;
    draft.redealsUsed = 0;
    draft.ended = false;
    draft.won = false;
  });

  await delay(100);

  setGame((draft) => {
    const aceSuits = new Set(
      draft.setupPile
        .filter((card) => card.rank === "A")
        .map((card) => card.suit),
    );
    const missingAces = createDeck({ faceUp: false }).filter(
      (card) => card.rank === "A" && !aceSuits.has(card.suit),
    );
    draft.setupPile.push(...missingAces);
  });

  await delay(1000);

  setGame((draft) => {
    draft.grid = shuffle(draft.setupPile).map(flipToFace);
    draft.setupPile = [];
  });

  await delay(1000);

  setGame((draft) => {
    draft.grid = draft.grid.map((card) => (card?.rank === "A" ? null : card));
  });
}

function canMove(grid: (PlayingCard | null)[], source: number, gap: number) {
  const card = grid[source];
  if (!card || grid[gap] !== null || source === gap) return false;
  const column = gap % COLS;
  if (column === 0) return card.rank === "2";
  const left = grid[gap - 1];
  return (
    !!left && left.suit === card.suit && rankValue(card) === rankValue(left) + 1
  );
}

function isWon(grid: (PlayingCard | null)[]) {
  for (let row = 0; row < ROWS; row += 1) {
    const start = row * COLS;
    const first = grid[start];
    if (!first || first.rank !== "2" || grid[start + COLS - 1] !== null)
      return false;
    for (let column = 1; column < COLS - 1; column += 1) {
      const prior = grid[start + column - 1];
      const card = grid[start + column];
      if (
        !prior ||
        !card ||
        card.suit !== first.suit ||
        rankValue(card) !== rankValue(prior) + 1
      ) {
        return false;
      }
    }
  }
  return true;
}

function hasMove(grid: (PlayingCard | null)[]) {
  const gaps = grid.flatMap((card, index) => (card ? [] : [index]));
  return grid.some(
    (card, source) => !!card && gaps.some((gap) => canMove(grid, source, gap)),
  );
}

function getLockedIndices(grid: (PlayingCard | null)[]) {
  const locked = new Set<number>();
  for (let row = 0; row < ROWS; row += 1) {
    const start = row * COLS;
    const first = grid[start];
    if (!first || first.rank !== "2") continue;
    locked.add(start);
    for (let column = 1; column < COLS - 1; column += 1) {
      const prior = grid[start + column - 1];
      const card = grid[start + column];
      if (
        !prior ||
        !card ||
        card.suit !== first.suit ||
        rankValue(card) !== rankValue(prior) + 1
      ) {
        break;
      }
      locked.add(start + column);
    }
  }
  return locked;
}

function findMoveSource(grid: (PlayingCard | null)[], gap: number) {
  const locked = getLockedIndices(grid);
  return grid.findIndex(
    (card, source) =>
      !!card && !locked.has(source) && canMove(grid, source, gap),
  );
}

function redealGrid(grid: (PlayingCard | null)[]) {
  const locked = getLockedIndices(grid);
  const cards = shuffle(
    grid.filter(
      (card, index): card is PlayingCard => !!card && !locked.has(index),
    ),
  );
  const result = grid.map((card, index) => (locked.has(index) ? card : null));
  const gaps = Array.from({ length: ROWS }, (_, row) => {
    const start = row * COLS;
    for (let column = 0; column < COLS; column += 1) {
      if (!locked.has(start + column)) return start + column;
    }
    return start + COLS - 1;
  });
  let cardIndex = 0;
  result.forEach((_, index) => {
    if (!locked.has(index) && !gaps.includes(index)) {
      result[index] = cards[cardIndex++] ?? null;
    }
  });
  return result;
}

export const gapsRules = {
  canMove,
  createInitialState,
  findMoveSource,
  getLockedIndices,
  hasMove,
  isWon,
  redealGrid,
};

export default function Gaps() {
  const { colorDark } = useGameColors();
  const difficulty = useGameSettingValue("gapsDifficulty");
  const [selected, setSelected] = useState<number | null>(null);
  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GapsGameState>({
    gameStateInitial: createInitialState(difficulty),
    resetNonGameStates: () => setSelected(null),
    resetAndSetup: async () => {
      await resetAndSetup(difficulty, setGame);
    },
  });
  const maxRedeals = game.maxRedeals ?? 2;

  useEffect(() => {
    const won = isWon(game.grid);
    const ended =
      won || (!hasMove(game.grid) && game.redealsUsed >= maxRedeals);
    if (won !== game.won || ended !== game.ended) {
      setGame((draft) => {
        draft.won = won;
        draft.ended = ended;
      });
    }
  }, [game, maxRedeals, setGame]);

  function onCardPress(index: number) {
    if (!game.ended && !isSettingUp)
      setSelected(selected === index ? null : index);
  }

  function onGapPress(index: number) {
    if (game.ended || isSettingUp || game.grid[index] !== null) return;
    const locked = getLockedIndices(game.grid);
    const source = selected ?? findMoveSource(game.grid, index);
    if (source < 0 || locked.has(source) || !canMove(game.grid, source, index))
      return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.grid[index] = draft.grid[source];
      draft.grid[source] = null;
    });
    setSelected(null);
  }

  function redeal() {
    if (game.ended || game.redealsUsed >= maxRedeals) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.grid = redealGrid(draft.grid);
      draft.redealsUsed += 1;
    });
    setSelected(null);
  }

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "setup",
        name: "setup",
        cards: game.setupPile ?? [],
        col: 0,
        row: 0.6,
        baseZIndex: 60,
        fan: { maxVisible: 3 },
      },
      ...game.grid.map(
        (card, index) =>
          ({
            id: `cell-${index}`,
            name: "cell",
            pileIndex: index,
            cards: card ? [card] : [],
            col: index % COLS,
            row: Math.floor(index / COLS) + 0.6,
            placeholder: {},
          }) as MapZone,
      ),
      {
        id: "reveal",
        name: "reveal",
        pileIndex: undefined,
        cards: [],
        col: COLS - 4,
        row: 0,
        width: 4,
        height: 0.5,
      },
    ],
    [game.grid, game.setupPile],
  );

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    if (card.zoneName !== "cell" || card.pileIndex === undefined) return {};
    return {
      isDisabled: game.ended || isSettingUp,
      isSelected: selected === card.pileIndex,
      selectColor: "blue",
      onPress: () => onCardPress(card.pileIndex!),
    };
  };
  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "cell" && zone.pileIndex !== undefined)
      return {
        onPress: () => onGapPress(zone.pileIndex!),
        isDisabled:
          isSettingUp || game.ended || game.grid[zone.pileIndex] !== null,
      };
    return {};
  };
  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedCols: COLS,
    fixedRows: 5.4,
    gap: 0.08,
    paddingTop: 0,
    paddingBottom: 0.1,
    paddingLeft: 0.1,
    paddingRight: 0.1,
  });
  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        game.won
          ? i18n.t("games:gaps.everyRowIsInOrder")
          : i18n.t("cards:noMovesRemain")
      }
      showDeviceRotateHint="landscape"
    >
      {cardMap}

      <View style={[getZoneStylesById("reveal")]}>
        <Button
          text={i18n.t("cards:redeal", {
            value: maxRedeals - game.redealsUsed,
          })}
          size="xs"
          onPress={redeal}
          disabled={isSettingUp || game.ended || game.redealsUsed >= maxRedeals}
          style={{ flex: 1 }}
          theme={colorDark}
        />
      </View>
    </GameWrapper>
  );
}
