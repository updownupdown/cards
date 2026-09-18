import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  SUITS,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
export type RowsVariant = "labyrinth" | "parallels";

type Config = {
  decks: 1 | 2;
  columns: number;
  /** Adds a King foundation per suit, built down, beside the Ace ones. */
  kingFoundations: boolean;
  /** Gaps in the first row refill from the stock straight away. */
  refillFirstRow: boolean;
  /** While there are at most this many rows, every card is available. */
  openRows: number;
  /** Rows of height the tableau may grow into before rows overlap. */
  tableauRows: number;
  landscape: boolean;
  winMessage: () => string;
  loseMessage: () => string;
};

const CONFIGS: Record<RowsVariant, Config> = {
  labyrinth: {
    decks: 1,
    columns: 8,
    kingFoundations: false,
    refillFirstRow: true,
    openRows: 0,
    tableauRows: 6.3,
    landscape: false,
    winMessage: () => i18n.t("games:labyrinth.youFoundTheWayOut"),
    loseMessage: () => i18n.t("games:labyrinth.lostInTheLabyrinth"),
  },
  parallels: {
    decks: 2,
    columns: 10,
    kingFoundations: true,
    refillFirstRow: false,
    openRows: 2,
    tableauRows: 7.5,
    landscape: true,
    winMessage: () => i18n.t("games:parallels.everyRowLinesUp"),
    loseMessage: () => i18n.t("cards:noMovesRemain"),
  },
};

export type RowsState = {
  stock: PlayingCard[];
  rows: (PlayingCard | null)[][];
  /** 0-3 build up from the Aces by suit; 4-7 down from the Kings. */
  foundations: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

function emptyPiles(count: number) {
  return Array.from({ length: count }, () => [] as PlayingCard[]);
}

function canBuildFoundation(
  card: PlayingCard,
  pile: PlayingCard[],
  index: number,
) {
  const pileTop = top(pile);
  if (!pileTop || pileTop.suit !== card.suit) return false;
  return rankValue(card) === rankValue(pileTop) + (index < 4 ? 1 : -1);
}

function foundationFor(state: RowsState, card: PlayingCard) {
  return state.foundations.findIndex((pile, index) =>
    canBuildFoundation(card, pile, index),
  );
}

/** A card is free when the space directly above or below it is open. */
function isAvailable(
  state: RowsState,
  config: Config,
  row: number,
  col: number,
) {
  if (!state.rows[row]?.[col]) return false;
  if (state.rows.length <= config.openRows) return true;
  const above = row > 0 ? state.rows[row - 1][col] : null;
  const below = row < state.rows.length - 1 ? state.rows[row + 1][col] : null;
  return !above || !below;
}

function trimRows(rows: (PlayingCard | null)[][]) {
  while (rows.length > 1 && rows[rows.length - 1].every((card) => !card)) {
    rows.pop();
  }
}

function createInitialState(config: Config): RowsState {
  return {
    stock: shuffle(createDeck({ deckCount: config.decks })).map(flipToBack),
    rows: [],
    foundations: emptyPiles(config.kingFoundations ? 8 : 4),
    ended: false,
    won: false,
  };
}

function dealFromStock(stock: PlayingCard[], config: Config) {
  const deck = [...stock];
  const foundations = emptyPiles(config.kingFoundations ? 8 : 4);
  const take = (rank: "A" | "K", suit: PlayingCard["suit"]) =>
    flipToFace(
      deck.splice(
        deck.findIndex((card) => card.rank === rank && card.suit === suit),
        1,
      )[0],
    );
  SUITS.forEach((suit, index) => {
    foundations[index].push(take("A", suit));
    if (config.kingFoundations) foundations[4 + index].push(take("K", suit));
  });
  const firstRow = Array.from({ length: config.columns }, () => {
    const card = deck.pop();
    return card ? flipToFace(card) : null;
  });
  return { stock: deck, rows: [firstRow], foundations };
}

function evaluateEnd(state: RowsState, config: Config, isSettingUp = false) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;

  const placed = state.foundations.reduce((sum, pile) => sum + pile.length, 0);
  if (placed === config.decks * 52) return { ended: true, won: true };
  if (state.stock.length > 0) return playing;

  const hasMove = state.rows.some((row, r) =>
    row.some(
      (card, c) =>
        !!card &&
        isAvailable(state, config, r, c) &&
        foundationFor(state, card) >= 0,
    ),
  );
  return hasMove ? playing : { ended: true, won: false };
}

export const rowsRules = {
  configs: CONFIGS,
  canBuildFoundation,
  isAvailable,
  evaluateEnd,
};

export function RowsSolitaire({ variant }: { variant: RowsVariant }) {
  const config = CONFIGS[variant];
  const initial = useMemo(() => createInitialState(config), [config]);
  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
  } = useStateManager<RowsState>({
    gameStateInitial: initial,
    resetAndSetup: async () => {
      setGame((draft) => {
        const cards = [
          ...draft.stock,
          ...draft.rows.flat().filter((card): card is PlayingCard => !!card),
          ...draft.foundations.flat(),
        ];
        draft.stock = shuffle(cards).map(flipToBack);
        draft.rows = [];
        draft.foundations = emptyPiles(config.kingFoundations ? 8 : 4);
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const next = dealFromStock(draft.stock, config);
        draft.stock = next.stock;
        draft.rows = next.rows;
        draft.foundations = next.foundations;
      });
    },
  });

  useEffect(() => {
    const { ended, won } = evaluateEnd(game, config, isSettingUp);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [config, game, isSettingUp, setGame]);

  function playCard(row: number, col: number) {
    const card = game.rows[row]?.[col];
    if (game.ended || !card || !isAvailable(game, config, row, col)) return;
    const target = foundationFor(game, card);
    if (target < 0) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.rows[row][col];
      draft.rows[row][col] = null;
      if (moved) draft.foundations[target].push(moved);
      if (row === 0 && config.refillFirstRow) {
        const next = draft.stock.pop();
        if (next) draft.rows[0][col] = flipToFace(next);
      }
      trimRows(draft.rows);
    });
  }

  function dealStock() {
    if (game.ended || game.stock.length === 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const hasGaps = draft.rows.some((row) => row.some((card) => !card));
      if (!config.refillFirstRow && hasGaps) {
        // Fill every space first; a new row comes only once there are none.
        draft.rows.forEach((row) =>
          row.forEach((card, col) => {
            if (card) return;
            const next = draft.stock.pop();
            if (next) row[col] = flipToFace(next);
          }),
        );
      } else {
        draft.rows.push(
          Array.from({ length: config.columns }, () => {
            const next = draft.stock.pop();
            return next ? flipToFace(next) : null;
          }),
        );
      }
      trimRows(draft.rows);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const rowCount = game.rows.length;
    const rowStep =
      rowCount > 1
        ? Math.min(1.05, (config.tableauRows - 1) / (rowCount - 1))
        : 1.05;
    const tableauCol = config.kingFoundations ? 1.2 : 0;
    const tableauRow = config.kingFoundations ? 0 : 1.2;
    const rightCol = tableauCol + config.columns + 0.2;

    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: config.kingFoundations
        ? i < 4
          ? 0
          : rightCol
        : (config.columns - 4) / 2 + i,
      row: config.kingFoundations ? (i % 4) * 1.1 : 0,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));

    const cellZones: MapZone[] = game.rows.flatMap((row, r) =>
      row.map((card, c) => ({
        id: `cell-${r}-${c}`,
        name: "cell",
        pileIndex: r * config.columns + c,
        cards: card ? [card] : [],
        col: tableauCol + c,
        row: tableauRow + r * rowStep,
        baseZIndex: 10 + r,
      })),
    );

    return [
      ...foundationZones,
      ...cellZones,
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: config.kingFoundations ? rightCol : config.columns - 1,
        row: tableauRow + config.tableauRows + 0.35,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "above",
          showCount: true,
        },
      },
    ];
  }, [config, game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "cell" && mappedCard.pileIndex !== undefined) {
      const row = Math.floor(mappedCard.pileIndex / config.columns);
      const col = mappedCard.pileIndex % config.columns;
      return {
        isDisabled: game.ended || !isAvailable(game, config, row, col),
        onPress: () => playCard(row, col),
      };
    }
    if (mappedCard.zoneName === "stock" && mappedCard.topOfZone) {
      return { isDisabled: game.ended, onPress: dealStock };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: dealStock,
        isDisabled: game.ended || game.stock.length === 0,
      };
    }
    return {};
  };

  const stockZoneRow =
    (config.kingFoundations ? 0 : 1.2) + config.tableauRows + 0.35;
  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedRows: stockZoneRow + 1,
    gap: 0.12,
  });

  const placed = game.foundations.reduce((sum, pile) => sum + pile.length, 0);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={placed}
      winLoseMessage={game.won ? config.winMessage() : config.loseMessage()}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
