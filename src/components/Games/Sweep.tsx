import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipAllToFace,
  RANK_VALUE,
  shuffle,
  zoneFanOffset,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

import { i18n } from "@/i18n";
import { cardTarget, makeHint } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";

// Sweep: a fishing game, in the family of Scopa and Cassino. Each card you
// play takes cards from the table: one of the same value, or any that add
// up to it. Clearing the table is a sweep. The rival's hand is face up and
// it plays by fixed habits, so the game is in reading the table.

type Seat = "player" | "rival";

/**
 * play: the player plays next. rival: the rival plays next. redeal: both
 * hands are empty and the next three cards each are on their way.
 * dealing: the first deal is on its way. over: the deck is played out.
 */
type Phase = "play" | "rival" | "redeal" | "dealing" | "over";

type GameState = {
  stock: PlayingCard[];
  table: PlayingCard[];
  hand: PlayingCard[];
  rival: PlayingCard[];
  playerTaken: PlayingCard[];
  rivalTaken: PlayingCard[];
  playerSweeps: number;
  rivalSweeps: number;
  /** Who took cards last: the table's leftovers are theirs at the end. */
  lastTaker: Seat | null;
  /** Which deal of three cards each this is, from 0. */
  round: number;
  phase: Phase;
};

export type SweepGameState = GameState;

const HAND_SIZE = 3;
const TABLE_SIZE = 4;
const RIVAL_DELAY = 650;
const REDEAL_DELAY = 500;
const BOARD_WIDTH = 7;

/** The bonus points at the end: most cards, most diamonds, the 7♦. */
const BONUS_SUIT: CardSuit = "diamonds";

// —— Card values ——————————————————————————————————————————————

/** Ace 1, then by rank, J 11, Q 12, K 13. */
function value(card: PlayingCard) {
  return RANK_VALUE[card.rank];
}

const SUIT_ORDER: CardSuit[] = ["clubs", "diamonds", "hearts", "spades"];

function strength(card: PlayingCard) {
  return value(card) * 4 + SUIT_ORDER.indexOf(card.suit);
}

function isBonusCard(card: PlayingCard) {
  return card.rank === "7" && card.suit === BONUS_SUIT;
}

// —— Captures ——————————————————————————————————————————————————

/**
 * The sets of table cards a card may take: a single card of the same value
 * (if there is one, it must be taken alone), else any cards that add up to
 * the value.
 */
function captures(table: PlayingCard[], card: PlayingCard): PlayingCard[][] {
  const target = value(card);
  const singles = table.filter((other) => value(other) === target);
  if (singles.length > 0) return singles.map((single) => [single]);
  const found: PlayingCard[][] = [];
  const search = (from: number, sum: number, chosen: PlayingCard[]) => {
    if (sum === target && chosen.length > 1) {
      found.push([...chosen]);
      return;
    }
    for (let index = from; index < table.length; index += 1) {
      const next = sum + value(table[index]);
      if (next > target) continue;
      chosen.push(table[index]);
      search(index + 1, next, chosen);
      chosen.pop();
    }
  };
  search(0, 0, []);
  return found;
}

function sameCards(a: PlayingCard[], b: PlayingCard[]) {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((card) => card.id));
  return b.every((card) => ids.has(card.id));
}

/** Whether `chosen` is one of the captures `card` may make. */
function isCapture(
  table: PlayingCard[],
  card: PlayingCard,
  chosen: PlayingCard[],
) {
  return captures(table, card).some((option) => sameCards(option, chosen));
}

type Move = { card: PlayingCard; taken: PlayingCard[] };

/** Every move a hand has: each capture, or trailing a card that takes nothing. */
function moves(table: PlayingCard[], hand: PlayingCard[]): Move[] {
  const found: Move[] = [];
  for (const card of hand) {
    const options = captures(table, card);
    if (options.length === 0) found.push({ card, taken: [] });
    for (const taken of options) found.push({ card, taken });
  }
  return found;
}

/** A capture's worth, before the end's bonuses are settled. */
function worth(move: Move, table: PlayingCard[]) {
  if (move.taken.length === 0) return 0;
  const sweep = move.taken.length === table.length ? 4 : 0;
  return (
    sweep +
    move.taken.length +
    move.taken.filter((card) => card.suit === BONUS_SUIT).length +
    (move.taken.some(isBonusCard) ? 3 : 0)
  );
}

// —— The rival's habits ———————————————————————————————————————

/**
 * The rival takes the most cards it can (a sweep first). Between equal
 * takes, it prefers the 7♦, then the most diamonds, then its lowest card.
 * With nothing to take, it trails its lowest card.
 */
function rivalMove(table: PlayingCard[], hand: PlayingCard[]): Move | null {
  if (hand.length === 0) return null;
  const rank = (move: Move) => [
    move.taken.length > 0 && move.taken.length === table.length ? 1 : 0,
    move.taken.length,
    move.taken.some(isBonusCard) ? 1 : 0,
    move.taken.filter((card) => card.suit === BONUS_SUIT).length,
    -strength(move.card),
  ];
  return moves(table, hand).reduce((best, move) => {
    const a = rank(move);
    const b = rank(best);
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index]) return a[index] > b[index] ? move : best;
    }
    return best;
  });
}

// —— Scoring ———————————————————————————————————————————————————

type Points = { player: number; rival: number };

/** Points as they stand: sweeps, then a point each for cards, diamonds and the 7♦. */
function points(state: GameState): Points {
  const result = { player: state.playerSweeps, rival: state.rivalSweeps };
  const mine = state.playerTaken;
  const theirs = state.rivalTaken;
  const bonus = (test: (card: PlayingCard) => boolean) => {
    const a = mine.filter(test).length;
    const b = theirs.filter(test).length;
    if (a > b) result.player += 1;
    else if (b > a) result.rival += 1;
  };
  bonus(() => true);
  bonus((card) => card.suit === BONUS_SUIT);
  bonus(isBonusCard);
  return result;
}

// —— Moves ————————————————————————————————————————————————————

function allCards(state: GameState) {
  return [
    ...state.stock,
    ...state.table,
    ...state.hand,
    ...state.rival,
    ...state.playerTaken,
    ...state.rivalTaken,
  ];
}

function gather(draft: GameState) {
  draft.stock = flipAllToBack(shuffle(allCards(draft)));
  draft.table = [];
  draft.hand = [];
  draft.rival = [];
  draft.playerTaken = [];
  draft.rivalTaken = [];
  draft.playerSweeps = 0;
  draft.rivalSweeps = 0;
  draft.lastTaker = null;
  draft.round = 0;
  draft.phase = "dealing";
}

function sortHand(cards: PlayingCard[]) {
  return [...cards].sort((a, b) => strength(a) - strength(b));
}

/** Deals three cards each, and four to the table at the start. */
function deal(draft: GameState) {
  if (draft.round === 0) {
    draft.table = flipAllToFace(draft.stock.splice(0, TABLE_SIZE));
  }
  draft.hand = sortHand(flipAllToFace(draft.stock.splice(0, HAND_SIZE)));
  draft.rival = sortHand(flipAllToFace(draft.stock.splice(0, HAND_SIZE)));
  // Deals alternate who plays first.
  draft.phase = draft.round % 2 === 0 ? "play" : "rival";
}

/** The deck is played out: whoever took cards last takes the table. */
function finish(draft: GameState) {
  if (draft.table.length > 0 && draft.lastTaker) {
    const pile =
      draft.lastTaker === "player" ? draft.playerTaken : draft.rivalTaken;
    pile.push(...flipAllToBack(draft.table));
    draft.table = [];
  }
  draft.phase = "over";
}

function afterMove(draft: GameState, seat: Seat) {
  if (draft.hand.length === 0 && draft.rival.length === 0) {
    if (draft.stock.length === 0) finish(draft);
    else draft.phase = "redeal";
    return;
  }
  const next: Seat = seat === "player" ? "rival" : "player";
  const nextHand = next === "player" ? draft.hand : draft.rival;
  // A hand that's already empty sits out the rest of the deal.
  if (nextHand.length === 0) {
    draft.phase = seat === "player" ? "play" : "rival";
  } else {
    draft.phase = next === "player" ? "play" : "rival";
  }
}

function play(
  draft: GameState,
  seat: Seat,
  cardId: string,
  takenIds: string[],
) {
  const hand = seat === "player" ? draft.hand : draft.rival;
  const card = hand.find((other) => other.id === cardId);
  if (!card) return;
  const taken = draft.table.filter((other) => takenIds.includes(other.id));
  if (taken.length > 0) {
    if (!isCapture(draft.table, card, taken)) return;
  } else if (captures(draft.table, card).length > 0) {
    // A card that can take something must.
    return;
  }

  const rest = hand.filter((other) => other.id !== card.id);
  if (seat === "player") draft.hand = rest;
  else draft.rival = rest;

  if (taken.length === 0) {
    draft.table.push(card);
  } else {
    const sweep = taken.length === draft.table.length;
    draft.table = draft.table.filter((other) => !takenIds.includes(other.id));
    const pile = seat === "player" ? draft.playerTaken : draft.rivalTaken;
    pile.push(...flipAllToBack([...taken, card]));
    draft.lastTaker = seat;
    if (sweep) {
      if (seat === "player") draft.playerSweeps += 1;
      else draft.rivalSweeps += 1;
    }
  }
  afterMove(draft, seat);
}

function playerPlays(draft: GameState, cardId: string, takenIds: string[]) {
  if (draft.phase !== "play") return;
  play(draft, "player", cardId, takenIds);
}

function rivalPlays(draft: GameState) {
  if (draft.phase !== "rival") return;
  const move = rivalMove(draft.table, draft.rival);
  if (!move) return;
  play(
    draft,
    "rival",
    move.card.id,
    move.taken.map((card) => card.id),
  );
}

function isWon(state: GameState) {
  const score = points(state);
  return state.phase === "over" && score.player > score.rival;
}

// —— Hints ————————————————————————————————————————————————————

/** The move worth most, less the best the rival can then take. */
function bestMove(state: GameState): Move | null {
  if (state.phase !== "play") return null;
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const move of moves(state.table, state.hand)) {
    const tableAfter =
      move.taken.length > 0
        ? state.table.filter((card) => !move.taken.includes(card))
        : [...state.table, move.card];
    const reply = rivalMove(tableAfter, state.rival);
    const score =
      worth(move, state.table) -
      (reply ? worth(reply, tableAfter) : 0) -
      // Trailing a card the rival can then take is worst of all.
      (move.taken.length === 0 && reply?.taken.includes(move.card) ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

function findSweepHint(state: GameState, selectedCard: string | null) {
  const move = bestMove(state);
  if (!move) return null;
  if (selectedCard !== move.card.id)
    return makeHint("tapCard", cardTarget(move.card));
  const next = move.taken[0];
  return next ? makeHint("tapCard", cardTarget(next)) : null;
}

export const sweepRules = {
  HAND_SIZE,
  TABLE_SIZE,
  value,
  captures,
  isCapture,
  moves,
  rivalMove,
  points,
  gather,
  deal,
  playerPlays,
  rivalPlays,
  finish,
  isWon,
  bestMove,
  findHint: findSweepHint,
};

// —— Component ————————————————————————————————————————————————

const gameStateInitial: GameState = {
  stock: createDeck(),
  table: [],
  hand: [],
  rival: [],
  playerTaken: [],
  rivalTaken: [],
  playerSweeps: 0,
  rivalSweeps: 0,
  lastTaker: null,
  round: 0,
  phase: "dealing",
};

export default function Sweep() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();
  /** The hand card chosen to play, and the table cards chosen for it. */
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string[]>([]);

  const {
    isSettingUp,
    isLoaded,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetNonGameStates: () => {
      setSelectedCard(null);
      setSelectedTable([]);
    },
    resetAndSetup: async () => {
      setGame(gather);
      await delay();
      setGame(deal);
    },
  });

  const ended = game.phase === "over";

  useHint(() => findSweepHint(game, selectedCard), {
    game,
    enabled: !isSettingUp && game.phase === "play",
  });

  // The rival plays, and deals follow, on their own.
  useEffect(() => {
    if (isSettingUp) return;
    if (game.phase === "rival") {
      const timer = setTimeout(() => setGame(rivalPlays), RIVAL_DELAY);
      return () => clearTimeout(timer);
    }
    if (game.phase === "redeal") {
      const timer = setTimeout(
        () =>
          setGame((draft) => {
            draft.round += 1;
            deal(draft);
          }),
        REDEAL_DELAY,
      );
      return () => clearTimeout(timer);
    }
  }, [game, isSettingUp, setGame]);

  const chosen = useMemo(
    () => game.hand.find((card) => card.id === selectedCard) ?? null,
    [game, selectedCard],
  );

  /** The table cards that take part in some capture by the chosen card. */
  const usable = useMemo(() => {
    const ids = new Set<string>();
    if (chosen) {
      for (const option of captures(game.table, chosen)) {
        for (const card of option) ids.add(card.id);
      }
    }
    return ids;
  }, [game, chosen]);

  const selectedCards = useMemo(
    () => game.table.filter((card) => selectedTable.includes(card.id)),
    [game, selectedTable],
  );
  const selectionSum = selectedCards.reduce(
    (sum, card) => sum + value(card),
    0,
  );
  const selectionOver = chosen !== null && selectionSum > value(chosen);

  function clearSelection() {
    setSelectedCard(null);
    setSelectedTable([]);
  }

  function makeMove(cardId: string, takenIds: string[]) {
    saveUndoState(structuredClone(game));
    setGame((draft) => playerPlays(draft, cardId, takenIds));
    clearSelection();
  }

  function onHandPress(cardId: string) {
    if (game.phase !== "play") return;
    if (selectedCard === cardId) {
      clearSelection();
      return;
    }
    const card = game.hand.find((other) => other.id === cardId);
    if (!card) return;
    const options = captures(game.table, card);
    if (options.length === 0) {
      makeMove(cardId, []);
    } else if (options.length === 1) {
      makeMove(
        cardId,
        options[0].map((taken) => taken.id),
      );
    } else {
      setSelectedCard(cardId);
      setSelectedTable([]);
    }
  }

  function onTablePress(cardId: string) {
    if (game.phase !== "play" || !chosen || !usable.has(cardId)) return;
    const next = selectedTable.includes(cardId)
      ? selectedTable.filter((other) => other !== cardId)
      : [...selectedTable, cardId];
    const cards = game.table.filter((card) => next.includes(card.id));
    if (isCapture(game.table, chosen, cards)) {
      makeMove(chosen.id, next);
    } else {
      setSelectedTable(next);
    }
  }

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "rivalTaken",
        name: "rivalTaken",
        cards: game.rivalTaken,
        col: 0,
        row: 0,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:sweep.rival"),
          showCount: false,
          infoPos: "right",
        },
      },
      {
        id: "rival",
        name: "rival",
        cards: game.rival,
        col: 1.5,
        row: 0,
        width: 4,
        baseZIndex: 10,
        fan: { direction: "right", offset: 1.1, center: true },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 6,
        row: 0,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "left" },
      },
      {
        id: "table",
        name: "table",
        cards: game.table,
        col: 0,
        row: 1.3,
        width: BOARD_WIDTH,
        baseZIndex: 20,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.table.length, BOARD_WIDTH, 0.3, 1.1),
          center: true,
        },
      },
      {
        id: "playerTaken",
        name: "playerTaken",
        cards: game.playerTaken,
        col: 0,
        row: 2.6,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:sweep.you"),
          showCount: false,
          infoPos: "right",
        },
      },
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 1.5,
        row: 2.6,
        width: 4,
        baseZIndex: 10,
        fan: { direction: "right", offset: 1.1, center: true },
      },
      {
        id: "hud",
        col: 0,
        row: 3.75,
        width: BOARD_WIDTH,
        height: 0.9,
      },
    ],
    [game],
  );

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const id = mappedCard.card.id;
    if (mappedCard.zoneName === "hand") {
      return {
        onPress: () => onHandPress(id),
        isDisabled: game.phase !== "play",
        isSelected: selectedCard === id,
        selectColor: "blue",
      };
    }
    if (mappedCard.zoneName === "table") {
      const isSelected = selectedTable.includes(id);
      const canUse = chosen !== null && usable.has(id);
      return {
        onPress: () => onTablePress(id),
        isDisabled: !canUse,
        isSelected,
        selectColor: isSelected ? (selectionOver ? "red" : "green") : "none",
        // With a card chosen, the table cards it can't take are greyed out.
        ...(chosen && !canUse
          ? { selectColor: "grey", forceOverlayColor: true }
          : {}),
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    gap: 0.05,
  });

  const score = points(game);
  const won = ended && isWon(game);

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      score={won ? score.player : 0}
      winLoseMessage={
        ended
          ? i18n.t(won ? "games:sweep.won" : "games:sweep.lost", {
              you: score.player,
              rival: score.rival,
            })
          : undefined
      }
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={() => {
        clearSelection();
        undo();
      }}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          flexStyles.rowCentered,
          { gap: spacing(16), justifyContent: "space-between" },
        ]}
      >
        <SideTally
          label={i18n.t("games:sweep.you")}
          score={score.player}
          cards={game.playerTaken.length}
          sweeps={game.playerSweeps}
          color={colorPale}
        />
        <Text size="xs" weight={300} color={rgba(colorPale, 0.7)}>
          {chosen
            ? i18n.t("games:sweep.pickCards", { value: value(chosen) })
            : i18n.t("games:sweep.dealOf", {
                deal: game.round + 1,
                total: (52 - TABLE_SIZE) / (HAND_SIZE * 2),
              })}
        </Text>
        <SideTally
          label={i18n.t("games:sweep.rival")}
          score={score.rival}
          cards={game.rivalTaken.length}
          sweeps={game.rivalSweeps}
          color={colorPale}
          alignRight
        />
      </View>
    </GameWrapper>
  );
}

function SideTally({
  label,
  score,
  cards,
  sweeps,
  color,
  alignRight = false,
}: {
  label: string;
  score: number;
  cards: number;
  sweeps: number;
  color: string;
  alignRight?: boolean;
}) {
  return (
    <View style={{ alignItems: alignRight ? "flex-end" : "flex-start" }}>
      <Text size="md" weight={500} color={color}>
        {i18n.t("games:sweep.points", { label, count: score })}
      </Text>
      <Text size="xs" weight={300} color={rgba(color, 0.7)}>
        {i18n.t("games:sweep.taken", { cards, sweeps })}
      </Text>
    </View>
  );
}
