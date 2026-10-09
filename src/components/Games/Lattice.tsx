import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { i18n } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isFace,
  rankValue,
  redealWith,
  shuffle,
  SUITS,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

// A window of 4 by 5 panes, glazed with the Ace to 10 of each suit. Two cards
// are offered a turn; one is set in the window and the other discarded. The
// window scores for columns of four suits, rows of five ranks, corner
// neighbours of a suit and the favour suit's ranks; passes leave empty panes.
const ROWS = 4;
const COLS = 5;
const CELLS = ROWS * COLS;
const OFFER_SIZE = 2;
const COLUMN_POINTS = 4;
const ROW_POINTS = 5;
const DIAGONAL_POINTS = 1;
const EMPTY_PENALTY = 1;
const WIN_SCORE = 30;
const TIERS = [
  { min: 50, key: "games:lattice.tierCathedral" },
  { min: 40, key: "games:lattice.tierRose" },
  { min: WIN_SCORE, key: "games:lattice.tierFine" },
] as const;
const WINDOW_ROW = 2;
const STATUS_ROW = 1.3;

const SUIT_KEYS = {
  hearts: "games:lattice.suitHearts",
  diamonds: "games:lattice.suitDiamonds",
  clubs: "games:lattice.suitClubs",
  spades: "games:lattice.suitSpades",
} as const;

export type LatticeGameState = {
  /** Face down; the last card is the top. */
  stock: PlayingCard[];
  /** The two cards on offer, face up; null once taken. */
  offer: (PlayingCard | null)[];
  /** The window's panes, row by row. */
  window: (PlayingCard | null)[];
  /** Face down, counted in the status line. */
  discard: PlayingCard[];
  /** The court cards, out of play but kept so the gather and redeal match. */
  unused: PlayingCard[];
  favourSuit: CardSuit;
};

// ========== Rules ========== //
function cellIndex(row: number, col: number) {
  return row * COLS + col;
}

function isEdge(index: number) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  return row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1;
}

/** The placed cards next to a pane: along its sides, or at its corners. */
function neighbours(
  window: (PlayingCard | null)[],
  index: number,
  kind: "orthogonal" | "diagonal",
) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const steps =
    kind === "orthogonal"
      ? [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]
      : [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ];
  const cards: PlayingCard[] = [];
  for (const [dr, dc] of steps) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    const card = window[cellIndex(r, c)];
    if (card) cards.push(card);
  }
  return cards;
}

/** Where a card may go: the edge first, then touching a card, never directly beside its suit or rank. */
function canPlace(
  window: (PlayingCard | null)[],
  card: PlayingCard,
  index: number,
) {
  if (window[index]) return false;
  const orthogonal = neighbours(window, index, "orthogonal");
  if (
    orthogonal.some(
      (other) => other.suit === card.suit || other.rank === card.rank,
    )
  ) {
    return false;
  }
  const isEmptyWindow = window.every((cell) => cell === null);
  if (isEmptyWindow) return isEdge(index);
  return orthogonal.length + neighbours(window, index, "diagonal").length > 0;
}

function legalCells(window: (PlayingCard | null)[], card: PlayingCard) {
  return window.flatMap((_, index) =>
    canPlace(window, card, index) ? [index] : [],
  );
}

function isEnded(state: LatticeGameState) {
  return (
    state.window.every((cell) => cell !== null) ||
    state.offer.every((card) => card === null)
  );
}

/** Turns the next two cards from the stock into the offer. */
function turnOffer(state: LatticeGameState) {
  state.offer = Array.from({ length: OFFER_SIZE }, () => {
    const card = state.stock.pop();
    return card ? flipToFace(card) : null;
  });
}

/** Discards whatever is still on offer, then turns the next two. */
function clearOffer(state: LatticeGameState) {
  for (const card of state.offer) {
    if (card) state.discard.push(flipToBack(card));
  }
  turnOffer(state);
}

function place(state: LatticeGameState, offerIndex: number, cell: number) {
  const card = state.offer[offerIndex];
  if (!card || !canPlace(state.window, card, cell)) return false;
  state.window[cell] = card;
  state.offer[offerIndex] = null;
  clearOffer(state);
  return true;
}

function pass(state: LatticeGameState) {
  if (isEnded(state)) return false;
  clearOffer(state);
  return true;
}

function score(state: LatticeGameState) {
  const { window } = state;
  let columns = 0;
  for (let col = 0; col < COLS; col++) {
    const cards = Array.from(
      { length: ROWS },
      (_, row) => window[cellIndex(row, col)],
    );
    const suits = new Set(cards.map((card) => card?.suit));
    if (cards.every(Boolean) && suits.size === ROWS) columns += COLUMN_POINTS;
  }
  let rows = 0;
  for (let row = 0; row < ROWS; row++) {
    const cards = window.slice(row * COLS, (row + 1) * COLS);
    const ranks = new Set(cards.map((card) => card?.rank));
    if (cards.every(Boolean) && ranks.size === COLS) rows += ROW_POINTS;
  }
  let diagonals = 0;
  let favour = 0;
  window.forEach((card, index) => {
    if (!card) return;
    if (
      neighbours(window, index, "diagonal").some(
        (other) => other.suit === card.suit,
      )
    ) {
      diagonals += DIAGONAL_POINTS;
    }
    if (card.suit === state.favourSuit) favour += rankValue(card);
  });
  const empties = isEnded(state)
    ? window.filter((cell) => cell === null).length * EMPTY_PENALTY
    : 0;
  return {
    total: columns + rows + diagonals + favour - empties,
    columns,
    rows,
    diagonals,
    favour,
    empties,
  };
}

function getTier(total: number) {
  return TIERS.find((tier) => total >= tier.min) ?? null;
}

// ========== Deal ========== //
function createInitialState(): LatticeGameState {
  const deck = createDeck({ faceUp: false });
  const state: LatticeGameState = {
    stock: shuffle(deck.filter((card) => !isFace(card))),
    offer: [],
    window: Array.from({ length: CELLS }, () => null),
    discard: [],
    unused: deck.filter(isFace),
    favourSuit: shuffle(SUITS)[0],
  };
  turnOffer(state);
  return state;
}

/** Every card back in the stock, face down, ready to be dealt out again. */
function gatherState(state: LatticeGameState): LatticeGameState {
  return {
    stock: shuffle(flipAllToBack(collectCards(state))),
    offer: [],
    window: Array.from({ length: CELLS }, () => null),
    discard: [],
    unused: [],
    favourSuit: state.favourSuit,
  };
}

export const latticeRules = {
  canPlace,
  legalCells,
  isEdge,
  isEnded,
  place,
  pass,
  score,
  getTier,
  createInitialState,
  WIN_SCORE,
};

// ========== Component ========== //
export default function Lattice() {
  const { colorDark, colorPale } = useGameColors();
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
  } = useStateManager<LatticeGameState>({
    gameStateInitial: createInitialState(),
    resetAndSetup: async () => {
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) => redealWith(createInitialState(), draft.stock));
    },
    resetNonGameStates: () => setSelected(null),
  });

  const ended = isEnded(game);
  const busy = ended || isSettingUp;
  const tally = useMemo(() => score(game), [game]);
  const won = ended && tally.total >= WIN_SCORE;
  const tier = getTier(tally.total);

  const selectedCard = selected === null ? null : game.offer[selected];
  const targets = useMemo(
    () => (selectedCard ? legalCells(game.window, selectedCard) : []),
    [game.window, selectedCard],
  );

  function onOfferPress(index: number) {
    if (busy || !game.offer[index]) return;
    setSelected(selected === index ? null : index);
  }

  function onCellPress(cell: number) {
    if (busy || selected === null || !targets.includes(cell)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      place(draft, selected, cell);
    });
    setSelected(null);
  }

  function onPass() {
    if (busy) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      pass(draft);
    });
    setSelected(null);
  }

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: 0,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), showCount: true },
      },
      ...game.offer.map(
        (card, index): MapZone => ({
          id: `offer-${index}`,
          name: "offer",
          pileIndex: index,
          cards: card ? [card] : [],
          col: 1.5 + index,
          row: 0,
          baseZIndex: 20,
          placeholder: {},
        }),
      ),
      { id: "pass", col: 3.6, row: 0, width: 1.4, height: 1 },
      { id: "status", col: 0, row: STATUS_ROW, width: COLS, height: 0.5 },
      ...game.window.map(
        (card, index): MapZone => ({
          id: `cell-${index}`,
          name: "cell",
          pileIndex: index,
          cards: card ? [card] : [],
          col: index % COLS,
          row: WINDOW_ROW + Math.floor(index / COLS),
          baseZIndex: 10,
          placeholder: {},
        }),
      ),
    ],
    [game.offer, game.stock, game.window],
  );

  const cardMapper = (mapped: MappedCard): AnimatedCardMapping | undefined => {
    if (mapped.zoneName !== "offer" || mapped.pileIndex === undefined) {
      return { isDisabled: true };
    }
    return {
      onPress: () => onOfferPress(mapped.pileIndex!),
      isDisabled: busy,
      isSelected: selected === mapped.pileIndex,
      selectColor: "blue",
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "cell" || zone.pileIndex === undefined) return;
    const isTarget = targets.includes(zone.pileIndex);
    return {
      onPress: () => onCellPress(zone.pileIndex!),
      isDisabled: busy || !isTarget,
      selectColor: isTarget ? "green" : "none",
    };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    gap: 0.12,
    fixedCols: COLS,
    fixedRows: WINDOW_ROW + ROWS,
  });

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={tally.total}
      hideScore
      canUndo={canUndo}
      undo={() => {
        setSelected(null);
        undo();
      }}
      winLoseMessage={
        won && tier
          ? i18n.t("games:lattice.wonWithTier", {
              score: tally.total,
              tier: i18n.t(tier.key),
            })
          : i18n.t("games:lattice.lostShortOfTarget", {
              score: tally.total,
              target: WIN_SCORE,
            })
      }
    >
      {cardMap}

      <View style={[getZoneStylesById("pass"), flexStyles.rowCentered]}>
        <Button
          text={i18n.t("games:lattice.pass")}
          size="xs"
          onPress={onPass}
          disabled={busy}
          theme={colorDark}
          style={{ flex: 1 }}
        />
      </View>

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("status"),
          flexStyles.rowCentered,
        ]}
      >
        <Text
          size="xs"
          weight={500}
          color={colorPale}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={{ flex: 1, textAlign: "center" }}
        >
          {i18n.t("games:lattice.favour", {
            suit: i18n.t(SUIT_KEYS[game.favourSuit]),
          })}
        </Text>
        <Text
          size="xs"
          weight={500}
          color={colorPale}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={{ flex: 1, textAlign: "center" }}
        >
          {i18n.t("games:lattice.discardCount", {
            value: game.discard.length,
          })}
        </Text>
      </View>
    </GameWrapper>
  );
}
